# Configuration

All runtime configuration is injected at **build time** through `REACT_APP_*` environment variables. Create React App (via craco) embeds these into the JS bundle during `npm run build`; they cannot be changed after the build completes without a rebuild.

---

## Environment Files

| File | When loaded | Purpose |
|---|---|---|
| `.env` | All environments | Shared base values |
| `.env.development` | `npm start` | Local dev overrides |
| `.env.production` | `npm run build` | Production defaults (committed; **must not contain secrets**) |
| `.env.example` | Never loaded | Reference template — copy to `.env.local` to get started |
| `.env.local` | All environments (gitignored) | Personal overrides — never committed |

Files are merged in this priority order (highest wins): `.env.local` > `.env.development.local` / `.env.production.local` > `.env.development` / `.env.production` > `.env`.

---

## All `REACT_APP_*` Variables

### Backend connectivity

| Variable | Default (dev) | Default (prod) | Description |
|---|---|---|---|
| `REACT_APP_API_URL` | `http://localhost:3001` | *(set by host/CI at build time)* | Base URL for all API requests (torrent search, auth, storage). Used by `apiClient.ts` and `torrentApi.ts`. |
| `REACT_APP_BACKEND_URL` | `http://localhost:3001` | *(set by host/CI at build time)* | Base URL for backend calls in services that use the native `fetch` API directly (e.g., `storedLinksService`, `favoritesService`). In most deployments this is the same value as `REACT_APP_API_URL`. |

Both variables must point to a compatible torrent-search / streaming backend API.

### Storage strategy

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_USE_BACKEND_FIRST` | `true` | When `true`, all read/write operations try the backend before falling back to localStorage. Set to `false` to force localStorage-only mode (no backend dependency). |
| `REACT_APP_ENABLE_LOCALSTORAGE_FALLBACK` | `true` | When `true`, failed backend calls fall through to localStorage. Set to `false` alongside `REACT_APP_BACKEND_ONLY=true` for strict backend-only mode. |
| `REACT_APP_BACKEND_ONLY` | `false` | When `true`, localStorage is never read or written. Useful in environments where localStorage is unreliable (e.g., shared kiosk). |

### Logging

| Variable | Default | Effect |
|---|---|---|
| `REACT_APP_SHOW_CONSOLE_LOGS` | `ON` | `ON` suppresses `console.*` output (counterintuitive naming). Set to `OFF` to show logs in the browser console. During local development, `.env.development` sets this to `OFF` so logs are visible. |

### Feature flags

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_ENABLE_GOOGLE_IMAGES` | `false` | Set to `true` to enable the Google Images search panel in the cover-image picker. Requires the backend to expose a Google Images proxy endpoint. |
| `REACT_APP_DISABLE_MANUAL_IMAGES` | `false` | Set to `true` to hide the manual image URL input. |

### Platform / mobile

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_PLATFORM` | *(unset)* | Set to `android` by `npm run build:android` to activate mobile-specific code paths. |
| `REACT_APP_IS_MOBILE_APP` | *(unset)* | Set to `true` by the Android build script. Activates `styles/android.css` and mobile layout components. |
| `REACT_APP_ENABLE_TOUCH_OPTIMIZATIONS` | *(unset)* | Set to `true` to enable touch-specific event handling and larger tap targets. |
| `REACT_APP_DEBUG_MODE` | *(unset)* | Set to `true` in `build:android:dev` for verbose debug output on device. |

### Chromecast

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_CAST_RECEIVER_APP_ID` | `CC1AD845` (Google Default Media Receiver) | Cast receiver application ID. Override with your own receiver app ID if you have deployed a custom Chromecast receiver. The default ID supports standard HTTP(S) MP4 and HLS streams without a custom receiver. |

---

## Build-Time Injection

### Local development

Copy `.env.example` to `.env.local` and set your local backend URL:

```bash
cp .env.example .env.local
# edit .env.local:
# REACT_APP_API_URL=http://localhost:3001
# REACT_APP_BACKEND_URL=http://localhost:3001
```

### Docker

The `Dockerfile` accepts build arguments:

```bash
docker build \
  --build-arg REACT_APP_API_URL=https://your-backend.example.com \
  --build-arg REACT_APP_BACKEND_URL=https://your-backend.example.com \
  -t torrent-browse-ui .
```

The default `ARG` values in the Dockerfile are neutral placeholders. Always override them with your actual backend host in CI/CD or via your container host's build-argument injection.

### CI/CD

Set `REACT_APP_API_URL` and `REACT_APP_BACKEND_URL` as CI secret environment variables and pass them to `npm run build`:

```bash
REACT_APP_API_URL=$MY_BACKEND_URL \
REACT_APP_BACKEND_URL=$MY_BACKEND_URL \
npm run build
```

---

## Dev vs Production Behaviour

| Aspect | Development (`npm start`) | Production (`npm run build`) |
|---|---|---|
| Source maps | Enabled (`GENERATE_SOURCEMAP=true`) | Disabled (`GENERATE_SOURCEMAP=false`) |
| Console logs | Shown (`REACT_APP_SHOW_CONSOLE_LOGS=OFF`) | Suppressed (`REACT_APP_SHOW_CONSOLE_LOGS=ON`) |
| API URL | `http://localhost:3001` | Injected by host/CI |
| TypeScript checking | Disabled via craco | Disabled via craco |
| Chunk size | Webpack dev server | Optimised split chunks (max 244 KB) |
| Debug globals | `window.torrentApi`, `window.storageConfig` exposed | Not exposed |
