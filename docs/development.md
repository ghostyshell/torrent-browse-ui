# Development

Setup, local development, building, testing, and Docker instructions.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 18+ (20 recommended) | Use `node --version` to check |
| npm | 8+ | Bundled with Node |
| Docker | Any modern version | Optional, for container builds |
| Playwright browsers | Installed via npm script | Required for e2e tests |

---

## Initial Setup

```bash
# Clone the repository
git clone <repo-url>
cd torrent-browse-ui

# Install dependencies
npm ci

# Set up local environment
cp .env.example .env.local
# Edit .env.local to point at your backend:
# REACT_APP_API_URL=http://localhost:3001
# REACT_APP_BACKEND_URL=http://localhost:3001
```

---

## Running the Development Server

```bash
npm start
```

This runs `craco start`, which wraps `react-scripts start` (webpack dev server). The app opens at `http://localhost:3000`.

The dev server:
- Proxies API requests if you configure a `proxy` in `package.json` (not set by default — the backend URL must be reachable directly from the browser).
- Hot-reloads on file changes.
- Exposes `window.torrentApi` and `window.storageConfig` debug helpers in the browser console.

You must have the backend running separately and accessible at the URL configured in `.env.local`.

---

## Building for Production

```bash
npm run build
```

Output goes to `build/`. The `build/` directory is not tracked in git (it is in `.dockerignore`).

### Android / Mobile Web build

```bash
npm run build:android
```

Activates mobile-specific env vars (`REACT_APP_PLATFORM=android`, `REACT_APP_IS_MOBILE_APP=true`, `REACT_APP_ENABLE_TOUCH_OPTIMIZATIONS=true`). Suitable for loading in an Android WebView.

```bash
npm run build:android:dev
```

Same as above but adds `REACT_APP_DEBUG_MODE=true` for verbose on-device logging.

---

## craco Configuration

`craco.config.js` customises the webpack configuration produced by `react-scripts`:

| Customisation | Reason |
|---|---|
| Removes `ForkTsCheckerWebpackPlugin` | TypeScript type checking is disabled to reduce memory usage and build time. Run `tsc --noEmit` manually for type checks. |
| Removes `ESLintWebpackPlugin` | ESLint is disabled during builds. Run `npx eslint src/` manually. |
| Removes `ModuleScopePlugin` | Allows imports from outside `src/` if needed. |
| Chunk splitting (max 244 KB per chunk) | Reduces individual chunk size for faster first load on slow connections. |
| `typescript.enableTypeChecking: false` | Craco-level flag that prevents craco from re-adding type checking. |

---

## Running Unit Tests

```bash
npm test
```

Runs `craco test`, which uses Jest with `@testing-library/react`. The only test currently committed is `src/App.test.tsx`.

---

## End-to-End Tests (Playwright)

Tests live in `tests/e2e/`. They require a running frontend and a reachable backend.

### Install browsers once

```bash
npm run playwright:install
```

### Run the full e2e suite

```bash
npm run test:e2e
```

This builds the app first (`npm run build`), then runs all Playwright tests.

### Run without rebuilding (backend already running)

```bash
npm run test:e2e:dev
```

### Other test commands

```bash
npm run test:e2e:headed     # Show browser window during tests
npm run test:e2e:ui         # Playwright interactive UI mode
npm run test:e2e:debug      # Debug mode (pauses on each step)
npm run test:e2e:report     # Open last test report in browser
```

### Test files

| File | Coverage |
|---|---|
| `tests/e2e/frontend-core.spec.js` | App load, navigation, basic rendering |
| `tests/e2e/search-functionality.spec.js` | Search input, filters, results, pagination |
| `tests/e2e/favorites.spec.js` | Add, remove, persist favourites |
| `tests/e2e/cached-links.spec.js` | Add, remove, refresh cached links |
| `tests/e2e/backend-integration.spec.js` | API connectivity, CORS, error handling |
| `tests/e2e/cover-images.spec.js` | Cover image store/retrieve, URL-only responses |
| `tests/e2e/visual-regression.spec.js` | Screenshot comparison tests |
| `tests/e2e/performance.spec.js` | Bundle size, load time, memory usage |

### Configuration

`playwright.config.js` controls:
- Target browsers: Chrome, Firefox, Mobile Chrome.
- Base URL: `http://localhost:3000` (frontend).
- Backend URL: read from `REACT_APP_API_URL` env var (defaults to `https://your-api-host.example.com` — override for real integration tests).

### Backend integration tests

`tests/e2e/backend-integration.spec.js` and `tests/e2e/cover-images.spec.js` target a real backend. Set `REACT_APP_API_URL` to your backend URL before running:

```bash
REACT_APP_API_URL=https://your-backend.example.com npm run test:e2e:dev
```

---

## Docker Build and Run

### Build the image

```bash
docker build \
  --build-arg REACT_APP_API_URL=https://your-backend.example.com \
  --build-arg REACT_APP_BACKEND_URL=https://your-backend.example.com \
  -t torrent-browse-ui .
```

The Dockerfile uses a **multi-stage build**:
1. **Builder stage** (`node:20-alpine`): installs dependencies and runs `npm run build`.
2. **Runtime stage** (`nginx:alpine`): copies `build/` output and serves it with nginx on port 80.

### Run the container

```bash
docker run -p 3000:80 torrent-browse-ui
```

The app is then accessible at `http://localhost:3000`.

### nginx behaviour

The bundled nginx config:
- SPA fallback: all routes → `index.html` (React Router works correctly after a hard refresh).
- Static assets (`/static/**`): 1-year `Cache-Control: public, immutable`.
- All routes: `Cache-Control: no-cache, no-store, must-revalidate` (prevents stale HTML on deploy).
- Security headers: `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, `X-Content-Type-Options: nosniff`.

### Health check

The Dockerfile defines a health check:

```
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3
  CMD wget --no-verbose --tries=1 -O- http://localhost/ | grep -q 'id="root"'
```

Containers are healthy once the nginx root returns a page containing `id="root"`.

---

## Environment Variable Reference

See [configuration.md](configuration.md) for a complete table of all `REACT_APP_*` variables, their defaults, and their effects.
