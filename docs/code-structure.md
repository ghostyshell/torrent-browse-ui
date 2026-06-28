# Code Structure

A module-by-module tour of `src/`. Every file path is relative to `src/`.

---

## Entry Points

| File | Role |
|---|---|
| `index.tsx` | React 19 root. Renders `<App />` into `#root`. Calls `reportWebVitals`. |
| `App.tsx` | Top-level component. Composes `ThemeProvider`, `BrowserRouter`, `AuthProvider`, `AppContent`, and `<Routes>`. Contains `SearchPage` (the default `/` view) as a local component. |
| `App.css` | Global CSS reset and base styles layered on top of MUI. |
| `index.css` | Font-face declarations and body defaults. |
| `react-app-env.d.ts` | CRA type shim — re-exports `react-scripts` types. |
| `setupTests.ts` | Jest/Testing Library bootstrap (`@testing-library/jest-dom` matchers). |
| `reportWebVitals.ts` | Web Vitals measurement helper (CRA default). |

---

## `theme/`

| File | Role |
|---|---|
| `theme/theme.ts` | Defines `darkTheme` — a MUI `createTheme` call with a dark palette, custom typography, and component overrides. Imported once in `App.tsx` and applied globally via `ThemeProvider`. |

---

## `contexts/`

| File | Role |
|---|---|
| `contexts/AuthContext.tsx` | The only React context in the app. Manages authentication state (logged-in user, session token), Google OAuth flow, Real-Debrid key lifecycle. Exports `AuthProvider` and `useAuth` hook. See [architecture.md](architecture.md) for the full auth flow. |

---

## `components/`

### Auth

| File | Role |
|---|---|
| `components/auth/LoginPage.tsx` | Full-page login screen. Calls `useAuth().login()` which redirects to the backend's Google OAuth endpoint. |
| `components/auth/AuthRequired.tsx` | Route guard. Renders children if authenticated; otherwise redirects to `/login`. Passes the current URL as the `state` parameter so the user is returned after login. |

### Account

| File | Role |
|---|---|
| `components/account/AccountPage.tsx` | Logged-in user profile page. Shows avatar, email, account details, and a form to add/remove the Real-Debrid API key (which is stored server-side). |

### Search

| File | Role |
|---|---|
| `components/SearchForm.tsx` | Primary search form. Accepts `ref` (forwarded as `SearchFormRef`) so `SearchPage` can imperatively trigger a search with the current parameters when pagination changes. Orchestrates the search sub-components below and calls `torrentApi.searchTorrents()`. |
| `components/search/SearchInput.tsx` | Controlled text input for the search query. |
| `components/search/SearchButton.tsx` | Submit button. Communicates loading state. |
| `components/search/WebsiteSelector.tsx` | Dropdown to pick the torrent indexer (`piratebay`, `yts`, `1337x`, `nyaasi`, etc.). Fetches available options from `torrentApi.getAvailableWebsites()` on mount. |
| `components/search/VideoQualitySelector.tsx` | Quality filter chip group (4K, 1080p, 720p, …). Appends the selected quality token to the search query. |
| `components/search/CustomFilterSelector.tsx` | Free-text append filter injected into the combined query. |
| `components/search/MinimumSeedersSelector.tsx` | Numeric slider to filter results below a seeder threshold. |
| `components/search/CommonSearchPresetSelector.tsx` | Preset selector UI. Renders the presets defined in `data/commonSearchPresets.ts`. |
| `components/search/PiratebayOptionsSelector.tsx` | PirateBay-specific sort and category selectors. Only shown when the active website is `piratebay`. |
| `components/search/X1337xOptionsSelector.tsx` | 1337x-specific sort and category selectors. |
| `components/search/StudioCategorySelector.tsx` | Studio / producer category selector backed by `data/studioCategories.ts`. |
| `components/MobileSearchForm.tsx` | Condensed search form layout for narrow viewports. Mirrors `SearchForm` but with a touch-friendly design. |

### Results

| File | Role |
|---|---|
| `components/TorrentResults.tsx` | Renders the grid of `TorrentCard`s. Handles loading skeleton, empty state, and pagination via `Pagination`. |
| `components/torrent/TorrentCard.tsx` | Individual result card. Shows title, size, seeders/leechers, source badge, cover image (lazy-loaded), and a favourites toggle. |
| `components/torrent/TorrentHealth.tsx` | Colour-coded seeder/leecher health indicator (green/yellow/red). |
| `components/MobileTorrentResults.tsx` | Alternative results layout for mobile — list view instead of grid. |
| `components/NoResults.tsx` | Empty-state illustration rendered when a search returns zero torrents. |
| `components/Pagination.tsx` | Page control buttons. Calls `onPageChange` prop. |
| `components/PageLimitSelector.tsx` | Optional results-per-page selector. |

### Torrent Details Modal

| File | Role |
|---|---|
| `components/TorrentDetailsModal.tsx` | Wrapper modal that lazily fetches full torrent details from the backend and renders `TorrentDetailsContent`. |
| `components/torrent-details/TorrentDetailsContent.tsx` | Main content layout inside the modal: poster, basic info, health, actions, description, file list, images. |
| `components/torrent-details/TorrentBasicInfo.tsx` | Title, category, size, seeders/leechers, upload date. |
| `components/torrent-details/TorrentHealthStatus.tsx` | Extended health badge with ratio calculation. |
| `components/torrent-details/TorrentActions.tsx` | Action buttons: copy magnet, add to favourites, add to stored links, resolve stream URL. |
| `components/torrent-details/TorrentModalHeader.tsx` | Dialog title bar with close button. |
| `components/torrent-details/TorrentPosterImage.tsx` | Cover image display with fallback placeholder. |
| `components/torrent-details/ImageViewerModal.tsx` | Full-screen image viewer for torrent description images. |
| `components/torrent-details/index.ts` | Re-exports all sub-components from the `torrent-details/` folder. |

### Favourites

| File | Role |
|---|---|
| `components/FavoritesPage.tsx` | Full-page list of saved favourite torrents. Fetches from `favoritesService`. Supports remove and "open details" actions. |

### Stored (Cached) Links

| File | Role |
|---|---|
| `components/StoredLinksPage.tsx` | Full-page list of cached stream links (magnet + resolved URLs). Supports refresh, delete, and inline streaming. |
| `components/storedLinks/StoredLinkCard.tsx` | Individual card for a stored link. Shows URL, streaming status, expiry badge, and action buttons. |
| `components/LinkCachingComponent.tsx` | Invisible component rendered on every search page that intercepts clipboard events and auto-caches magnet links. |

### Video Streaming

| File | Role |
|---|---|
| `components/VideoPlayerModalVideoJS.tsx` | Primary video player modal. Uses `video.js` for HLS/MP4 playback. Handles fullscreen, captions, and range-request detection. |
| `components/HTML5Player.tsx` | Lightweight HTML5 `<video>` fallback player. |
| `components/HTML5Player.css` | Styles for the HTML5 player control bar. |
| `components/VideoStreamingErrorBoundary.tsx` | React error boundary wrapping the video player; catches codec/DRM errors and shows a friendly message. |
| `components/CastButton.tsx` | Google Cast (Chromecast) trigger button. Hidden if Cast API is not available. |

### Cover Image Management

| File | Role |
|---|---|
| `components/CoverImageMigrationDialog.tsx` | One-time dialog prompting the user to migrate cover images from localStorage to the backend store. Shown on first load if local covers are detected. |
| `components/CoverImageSyncDialog.tsx` | Manual trigger dialog for syncing cover images to the backend. |
| `components/GoogleImagesGallery.tsx` | Grid of images returned by the Google Images proxy; used for selecting a cover image manually. |
| `components/GoogleImagesSearch.tsx` | Orchestrates Google Images query and renders `GoogleImagesGallery`. |
| `components/GoogleImagesSearchFixed.tsx` | Fixed-position variant of `GoogleImagesSearch` for the details modal sidebar. |
| `components/GoogleImagesSearchInput.tsx` | Controlled input for the Google Images search term. |
| `components/ManualImageInput.tsx` | Direct URL input for manually setting a cover image (paste any image URL). |

### Utility Components

| File | Role |
|---|---|
| `components/Header.tsx` | Top navigation bar. Renders the app logo, view switcher tabs (Home / Favourites / Stored Links), user avatar, and logout. |
| `components/ErrorAlert.tsx` | Dismissible MUI `Alert` for API or runtime errors. |
| `components/LoadingSpinner.tsx` | Centred circular progress indicator. |
| `components/ProgressBar.tsx` | Linear progress bar for operations with known progress (e.g., batch cache refresh). |
| `components/IncognitoModeNotification.tsx` | Banner shown when incognito mode is detected, informing the user that data is stored on the backend. |
| `components/DebugInfo.tsx` | Development-only panel (rendered when `NODE_ENV=development`) showing storage config summary, backend connectivity, and session info. |
| `components/BatchCacheProcessor.tsx` | Background processor that batch-resolves stream URLs for all magnet links in stored-links. |
| `components/UniversalSyncButton.tsx` | Toolbar button that triggers a full backend sync of localStorage data. |
| `components/UniversalSyncNotification.tsx` | Toast notification shown on completion of a universal sync. |

---

## `services/`

| File | Role |
|---|---|
| `services/apiClient.ts` | Axios instance pre-configured with `baseURL = REACT_APP_API_URL` and a request interceptor that attaches the Bearer token. Also exports auth-exchange helpers (`stashAuthExchangeCode`, `takePendingAuthExchangeCode`, `exchangeAuthCode`). |
| `services/authSession.ts` | Thin wrapper around `sessionStorage` for the JWT bearer token. Exports `getSessionToken`, `setSessionToken`, `clearSessionToken`, `getAuthHeaders`. |
| `services/torrentApi.ts` | High-level torrent API client. Methods: `getAvailableWebsites()`, `searchTorrents()`, `browseTorrents()`, `getTorrentDetails()`. Uses `androidApiConfig.makeRequest()` internally for retry/timeout logic. |
| `services/androidApiConfig.ts` | Unified HTTP request factory that reads `REACT_APP_API_URL` and `REACT_APP_BACKEND_URL`, applies per-source timeout overrides (1337x = 65 s due to FlareSolverr), and handles retry logic. Adapts Android WebView and desktop browser environments. |
| `services/androidNetworkHandler.ts` | Mobile-specific network error classification and retry decision logic. |
| `services/favoritesService.ts` | CRUD for favourited torrents. Writes to `POST /api/favorites`, reads from `GET /api/favorites`, removes via `DELETE /api/favorites/:id`. Includes pagination support. |
| `services/storedLinksService.ts` | CRUD for cached links (magnet + stream URL pairs). Backend-first with localStorage fallback. Full write lifecycle: add, update, remove, refresh expired stream URLs, health analysis. |
| `services/storedLinksApi.ts` | Lower-level fetch wrappers for the `/api/storage/stored-links` endpoints used by `storedLinksService`. |
| `services/realDebridService.ts` | Proxies Real-Debrid API calls through the backend (`/api/proxy/real-debrid/*`). Key method: `getStreamableVideoUrl(magnetUrl, forceRefresh?)` which adds a magnet, waits for torrent readiness, selects the largest video file, unrestricts the link, and returns a direct stream URL. |
| `services/realDebridKeyManager.ts` | Singleton that tracks whether the current user has a Real-Debrid key configured (server-side). Calls `realDebridService.setConfigured()` on state changes. |
| `services/realDebridTorrentInfoService.ts` | Supplementary service for fetching detailed torrent info from Real-Debrid (file list, hash, status). |
| `services/cacheManager.ts` | Generic in-memory + localStorage cache with TTL. Used by `streamUrlCache` and `torrentDetailsCache`. |
| `services/coverImageService.ts` | Legacy cover image service (localStorage-only). Present for migration path. |
| `services/enhancedCoverImageService.ts` | Current cover image service. Backend-first: uploads image URL to `/api/cache/cover-image`, retrieves stable proxy URL, falls back to localStorage for offline operation. Exposes `hasLocalStorageCoversToMigrate()` for the migration dialog. |
| `services/descriptionImageService.ts` | Fetches and proxies images found in torrent description HTML (used in the details modal image gallery). |
| `services/googleImagesService.ts` | Calls the backend's Google Images proxy endpoint to search for cover images by title. |
| `services/googleCastService.ts` | Initialises the Cast SDK, manages Cast sessions, and sends media load requests to Chromecast receivers. |
| `services/tursoStorageAPI.ts` | (Legacy / internal) Direct Turso database client — present but replaced by the backend REST API layer in normal operation. |

---

## `hooks/`

| File | Role |
|---|---|
| `hooks/useTorrentDetails.ts` | Fetches and caches full torrent details for a given URL. Manages loading/error state. Used by `TorrentDetailsModal`. |
| `hooks/useVideoStreaming.ts` | Orchestrates the full "get a stream URL" flow: checks cache → calls `realDebridService` → updates stored link. |
| `hooks/useDirectStreaming.ts` | Variant of `useVideoStreaming` for non-magnet direct URLs (HTTP video links). |
| `hooks/useStreamWithCache.ts` | Combines `useVideoStreaming` with the `streamUrlCache` utility to avoid redundant Real-Debrid API calls. |
| `hooks/useRealDebridService.ts` | React hook wrapper around `realDebridService` that reads `isAuthenticated` and `hasRealDebridKey` from `AuthContext`. |
| `hooks/useMagnetPrefetcher.ts` | On search results load, silently prefetches magnet links for the first N results so they are ready when the user opens details. |
| `hooks/useCacheStatus.ts` | Polls the backend `GET /api/cache/stats` endpoint and returns current cache hit/miss statistics. |
| `hooks/useGoogleCast.ts` | Manages Cast SDK availability, session state, and media casting. |
| `hooks/useMobileOptimizations.ts` | Detects touch device, viewport size, and orientation to activate mobile-specific UI behaviours. |

---

## `utils/`

| File | Role |
|---|---|
| `utils/storageConfig.ts` | Singleton `StorageConfigService`. Reads env vars to determine storage strategy, detects incognito mode, pings backend health, and exposes `shouldUseBackendFirst()`, `isBackendOnly()`, `hasLocalStorageFallback()`. |
| `utils/featureFlags.ts` | Simple env-var-based feature flag helpers: `isGoogleImagesEnabled()`, `isManualImageInputEnabled()`, `isFeatureEnabled(envVar, default)`. |
| `utils/searchQuery.ts` | `buildCombinedSearchQuery(preset, quality, customFilter)` — merges search tokens into a single query string. |
| `utils/categoryUtils.tsx` | Utility functions and lookup tables for converting PirateBay / 1337x category codes to human-readable labels. |
| `utils/torrentUtils.ts` | Formatting helpers: `formatSize()`, `formatDate()`, `formatSeeders()`, source label mapping. |
| `utils/torrentDetailsCache.ts` | In-memory LRU cache (backed by `cacheManager`) for full torrent details objects to avoid redundant API calls when reopening the same modal. |
| `utils/torrentDetailsUtils.ts` | Helper functions for extracting magnet links and hash values from torrent detail objects. |
| `utils/torrentDetailsUtils.tsx` | TSX variant with JSX-based rendering helpers for description HTML. |
| `utils/magnetCache.ts` | localStorage-backed cache for magnet links keyed by torrent URL. Avoids redundant detail fetches just to obtain a magnet. |
| `utils/streamUrlCache.ts` | localStorage-backed cache for resolved Real-Debrid stream URLs (6-hour TTL). |
| `utils/videoStreamUtils.ts` | Utilities for probing whether a URL supports HTTP range requests and determining MIME type. |
| `utils/videoStreamUtils_clean.ts` | Refactored variant of `videoStreamUtils.ts` — use this in new code. |
| `utils/videoUtils.ts` | Codec detection helpers, file-extension-to-MIME mapping, and video-quality label extraction from filename. |
| `utils/universalSyncUtility.ts` | Orchestrates a full sync of all localStorage data (favourites, stored links, cover images) to the backend in a single pass. |
| `utils/consoleLogger.ts` | Respects `REACT_APP_SHOW_CONSOLE_LOGS` — suppresses `console.*` calls in production when the env var is `ON`. |

---

## `data/`

| File | Role |
|---|---|
| `data/commonSearchPresets.ts` | Defines preset search tokens (e.g., "xxx", "trans") and the `isSearchPresetToken()` guard function. Presets trigger keyword-based search instead of browse mode on the home screen. |
| `data/studioCategories.ts` | Array of studio/producer category objects `{ label, value }` used in `StudioCategorySelector`. |
| `data/studioSearchTerms.json` | JSON mapping of studio names to search terms used to augment search queries. |

---

## `types/`

| File | Role |
|---|---|
| `types/Torrent.ts` | Core `Torrent` TypeScript interface: `Name`, `Source`, `Size`, `Seeders`, `Leechers`, `Url`, `Magnet`, `Hash`, `Description`, `Files`, `coverImage`, and optional metadata fields. |
| `types/googleCast.d.ts` | Ambient type declarations for the Google Cast SDK (`chrome.cast.*`, `cast.framework.*`) which is loaded from a CDN at runtime. |

---

## `styles/`

| File | Role |
|---|---|
| `styles/android.css` | Mobile-specific CSS overrides activated when `REACT_APP_IS_MOBILE_APP=true` is set. Removes hover states, increases tap target sizes, adjusts scrolling behaviour. |
