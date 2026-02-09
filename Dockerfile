# Multi-stage build for Aden Website

# Stage 1: Build stage
FROM node:20-alpine AS builder

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
FROM node:20-alpine AS production

# Install nginx and supervisor
RUN apk add --no-cache nginx supervisor

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
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Proxy API requests to Node.js server \
    location /api { \
        proxy_pass http://localhost:3001; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    \
    # Serve games from mounted volume \
    location /data/games { \
        alias /data/games; \
        try_files $uri $uri/ =404; \
    } \
    \
    # SPA routing \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Security headers \
    add_header X-Frame-Options "SAMEORIGIN" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header X-XSS-Protection "1; mode=block" always; \
    \
    # Cache static assets \
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/http.d/default.conf

# Create supervisor configuration to run both nginx and Node.js server
RUN mkdir -p /etc/supervisor.d && \
    echo '[supervisord] \
nodaemon=true \
logfile=/var/log/supervisor/supervisord.log \
pidfile=/var/run/supervisord.pid \
\
[program:nginx] \
command=nginx -g "daemon off;" \
stdout_logfile=/dev/stdout \
stdout_logfile_maxbytes=0 \
stderr_logfile=/dev/stderr \
stderr_logfile_maxbytes=0 \
autorestart=true \
\
[program:nodejs] \
command=tsx server/index.ts \
directory=/app \
user=app-user \
stdout_logfile=/dev/stdout \
stdout_logfile_maxbytes=0 \
stderr_logfile=/dev/stderr \
stderr_logfile_maxbytes=0 \
autorestart=true \
environment=NODE_ENV="production",PORT="3001",DATABASE_PATH="/data/database/database.db",PATH="/usr/local/bin:/usr/bin:/bin" \
' > /etc/supervisor.d/supervisord.conf

# Create necessary directories and fix permissions
RUN mkdir -p /var/log/supervisor /var/run /var/cache/nginx /var/log/nginx && \
    chown -R app-user:app-user /usr/share/nginx/html && \
    chown -R app-user:app-user /app && \
    chown -R app-user:app-user /data && \
    chmod 755 /var/log/supervisor /var/run

# Note: nginx needs to run as root to bind to port 80, but supervisor will handle this
# The app code runs as app-user where possible

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start supervisor which will manage both nginx and Node.js
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor.d/supervisord.conf"]
