# aden-website

Portfolio website for AdenMGB built with Vue 3, Vite, and Tailwind CSS.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
pnpm install
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Type-Check, Compile and Minify for Production

```sh
pnpm build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
pnpm test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
pnpm lint
```

## Docker

### JWT_SECRET (Production)

For production deployments, set `JWT_SECRET` to a secure random string so sessions persist across server restarts and remain valid. Without it, users will be logged out on every restart.

Generate a secret:

```sh
openssl rand -base64 32
```

**Docker Compose**: Copy `.env.example` to `.env` and set `JWT_SECRET=your-secure-secret`, or pass `-e JWT_SECRET=...` when running.

**Manual run**: `JWT_SECRET=<secret> node server/index.js` or add to your systemd/PM2 service environment.

### Using Docker Compose

The easiest way to run the application with Docker:

```sh
# Set your GitHub repository (optional, defaults to adenmgb/aden-website)
export GITHUB_REPOSITORY=your-username/aden-website

# Optional: Set JWT_SECRET for production (recommended)
export JWT_SECRET=your-secure-secret-from-openssl-rand-base64-32

# Start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The application will be available at `http://localhost:8080`.

### Manual Docker Run

```sh
# Pull the image
docker pull ghcr.io/your-username/aden-website:latest

# Run the container with data directory mounted (includes games and database)
docker run -d \
  --name aden-website \
  -p 8080:80 \
  -v $(pwd)/data:/data \
  --restart unless-stopped \
  ghcr.io/your-username/aden-website:latest
```

### Building Locally

```sh
# Build the Docker image
docker build -t aden-website:latest .

# Run the container with data directory mounted (includes games and database)
docker run -d \
  --name aden-website \
  -p 8080:80 \
  -v $(pwd)/data:/data \
  aden-website:latest
```

## Docker Compose

The `docker-compose.yml` file mounts the entire `data` directory so games and database can persist without rebuilding the container:

```yaml
version: '3.8'

services:
  web:
    image: ghcr.io/${GITHUB_REPOSITORY:-adenmgb/aden-website}:latest
    container_name: aden-website
    ports:
      - "8080:80"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    volumes:
      - ./data:/data
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
```

**Note:** The `data` directory contains both games (`data/games`) and the database. This directory is mounted so games can be added and database persists without rebuilding the container.
