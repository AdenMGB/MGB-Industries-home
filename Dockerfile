# Multi-stage build for Aden Website

# Stage 1: Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
# --no-frozen-lockfile allows pnpm to update the lockfile if it's out of sync
RUN pnpm install --no-frozen-lockfile

# Copy source files and configs
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js postcss.config.js ./
COPY index.html ./
COPY env.d.ts ./
COPY src ./src
COPY public ./public

# Build the application (skip type-check for faster builds)
RUN pnpm run build-only

# Stage 2: Production stage
FROM node:22-alpine AS production

# Install nginx and su-exec (for running commands as different user)
RUN apk add --no-cache nginx su-exec

# Create non-root user
RUN addgroup -g 1001 -S app-user && \
    adduser -S app-user -u 1001 -G app-user

# Install pnpm for running the server
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files for server dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production dependencies
RUN pnpm install --prod --no-frozen-lockfile

# Install tsx globally using npm (comes with node) to run TypeScript server code
RUN npm install -g tsx

# Copy built frontend files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy server code
COPY server ./server
COPY tsconfig*.json ./

# Create data directory mount point with proper permissions
RUN mkdir -p /data/games /data/database && \
    chmod 755 /data

# Create nginx configuration with API proxy
RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    \n\
    # Proxy API requests to Node.js server\n\
    location /api {\n\
        proxy_pass http://localhost:3001;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "upgrade";\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
    }\n\
    \n\
    # Serve games from mounted volume\n\
    location /data/games {\n\
        alias /data/games;\n\
        try_files $uri $uri/ =404;\n\
    }\n\
    \n\
    # SPA routing\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    \n\
    # Security headers\n\
    add_header X-Frame-Options "SAMEORIGIN" always;\n\
    add_header X-Content-Type-Options "nosniff" always;\n\
    add_header X-XSS-Protection "1; mode=block" always;\n\
    \n\
    # Cache static assets\n\
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
}\n' > /etc/nginx/http.d/default.conf && \
    # Update nginx.conf to use /tmp for pid file and ensure /run exists\n\
    sed -i 's|pid /var/run/nginx.pid;|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf 2>/dev/null || true

# Create startup script to run both nginx and Node.js server
RUN printf '#!/bin/sh\n\
set -e\n\
\n\
# Function to handle shutdown\n\
cleanup() {\n\
    echo "Shutting down..."\n\
    kill -TERM "$nginx_pid" 2>/dev/null || true\n\
    kill -TERM "$nodejs_pid" 2>/dev/null || true\n\
    wait\n\
    exit 0\n\
}\n\
\n\
trap cleanup TERM INT\n\
\n\
# Start nginx (runs in background by default)\n\
nginx &\n\
nginx_pid=$!\n\
\n\
# Start Node.js server in background (as app-user)\n\
su-exec app-user sh -c "cd /app && TMPDIR=/app/tmp tsx server/index.ts" &\n\
nodejs_pid=$!\n\
\n\
# Wait for all background processes\n\
wait\n' > /start.sh && chmod +x /start.sh

# Create necessary directories and fix permissions
RUN mkdir -p /var/run /run /tmp /var/cache/nginx /var/log/nginx /app/tmp && \
    chown -R app-user:app-user /usr/share/nginx/html && \
    chown -R app-user:app-user /app && \
    chown -R app-user:app-user /data && \
    chmod 1777 /tmp && \
    chmod 755 /var/run /run /app/tmp

# Note: nginx runs as root to bind to port 80, Node.js server runs as app-user

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start both services using the startup script
CMD ["/start.sh"]
