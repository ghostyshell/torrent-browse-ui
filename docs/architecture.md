# Architecture

This document describes the overall structure and runtime behaviour of the torrent-browse-ui frontend.

---

## Overview

`torrent-browse-ui` is a single-page application (SPA) built with **React 19**, **TypeScript**, and **Material UI (MUI v7)**. It provides a browser-based interface for searching torrents across multiple indexers, managing favourites, caching debrid-resolved stream links, and optionally streaming video directly in the browser.

The frontend delegates every backend operation to **a compatible torrent-search / streaming backend API** (configured via `REACT_APP_API_URL`). The frontend never talks directly to any torrent site; all scraping, magnet resolution, Real-Debrid proxy, cover-image storage, and user-data persistence happen on the backend.

---

## Rendering and Routing Model

```
index.html (public/)
  └── src/index.tsx          React 19 root
        └── App.tsx
              ├── ThemeProvider  (MUI darkTheme)
              ├── CssBaseline
              └── BrowserRouter
                    └── AuthProvider  (Google OAuth session)
                          └── AppContent
                                ├── Header         (nav + view switcher)
                                ├── IncognitoModeNotification
                                ├── CoverImageMigrationDialog
                                └── <Routes>
                                      ├── /login          → LoginPage
                                      ├── /               → AuthRequired → SearchPage
                                      ├── /account        → AuthRequired → AccountPage
                                      ├── /favorites      → AuthRequired → FavoritesPage
                                      ├── /stored-links   → AuthRequired → StoredLinksPage
                                      └── /cached-links   → (legacy alias → StoredLinksPage)
```

- **Client-side routing** via `react-router-dom` v7. All routes render within a single HTML shell; the nginx config (in the Dockerfile) rewrites every URL to `index.html` so deep links work after a hard refresh.
- Every protected route is wrapped in `<AuthRequired>`, which redirects unauthenticated users to `/login`.
- `SearchPage` is the default view (`/`). It reads search parameters directly from the URL query string (`?q=`, `?preset=`, `?website=`, `?quality=`, `?filter=`, `?minSeeders=`, `?page=`) and drives all API calls reactively from URL state — so URLs are fully shareable and the browser back/forward buttons work correctly.

---

## State Management

There is **no global state library** (no Redux, no Zustand). State is managed at three levels:

| Level | Mechanism | Used for |
|---|---|---|
| URL query params | `useSearchParams` | Active search query, filters, current page |
| React component state | `useState` / `useRef` | Torrent results, loading, error |
| React Context | `AuthContext` | Authenticated user, session token, RD key status |

`AuthContext` (`src/contexts/AuthContext.tsx`) is the only cross-cutting context. It holds:
- The logged-in `User` object (id, email, name, picture, `hasRealDebridKey`, `isEmailAllowed`).
- Session token stored in `sessionStorage` via `src/services/authSession.ts`.
- Methods: `login()`, `logout()`, `saveRealDebridKey()`, `removeRealDebridKey()`.

---

## Backend-First Storage + localStorage Fallback

Several data types (favourites, stored/cached links, cover images) are persisted across sessions. The persistence strategy is controlled by `storageConfig` (`src/utils/storageConfig.ts`):

```
┌──────────────────────────────────────────────────────────┐
│                     App calls service                    │
└────────────────────────┬─────────────────────────────────┘
                         │
            storageConfig.shouldUseBackendFirst()?
                   ┌─────┴──────┐
                  YES            NO
                   │             │
           ┌───────▼───────┐    ┌▼──────────────────────┐
           │ POST/GET/PUT   │    │ localStorage read/write│
           │ /api/storage/* │    │ (sync, immediate)      │
           └───────┬───────┘    └───────────────────────┘
                   │
              response.ok?
             ┌────┴────┐
            YES        NO
             │          │
        return data   HAS_LOCALSTORAGE_FALLBACK?
                      ┌────┴────┐
                     YES        NO
                      │          │
               localStorage    return []
               (read cached
                snapshot)
```

Three modes are selectable at runtime:

| Mode | `useBackendFirst` | `backendOnly` | `enableLocalStorageFallback` |
|---|---|---|---|
| Backend + localStorage (default) | true | false | true |
| Backend-only | true | true | false |
| localStorage-only (offline) | false | false | true |

The mode switches automatically when:
- **Incognito mode is detected** → forced to backend-only (localStorage is unavailable or severely quota-limited).
- **Backend health check fails on startup** → falls back to localStorage-only.

All write operations follow the same pattern: try backend first, on failure silently fall back to localStorage. The async `Sync` methods perform the backend write in the background (fire-and-forget) while the synchronous `Sync`-suffixed method immediately updates localStorage for instant UI feedback.

---

## Data Flow: UI to API

```
User types search query
        │
   SearchForm.tsx
        │  calls torrentApi.searchTorrents()
        │
   src/services/torrentApi.ts
        │  uses androidApiConfig.makeRequest()
        │
   src/services/androidApiConfig.ts
        │  axios GET to $REACT_APP_API_URL/{website}/{query}/{page}?...
        │
   Backend API
        │
   returns Torrent[]
        │
   TorrentResults.tsx renders cards
        │
   User clicks torrent → TorrentDetailsModal
        │  calls torrentApi.getTorrentDetails()
        │  displays description, files, images, magnet, hash
        │
   User clicks "Stream" (with Real-Debrid key configured)
        │  calls realDebridService.getStreamableVideoUrl()
        │  backend proxies to Real-Debrid API → returns direct MP4 URL
        │
   VideoPlayerModalVideoJS renders HTML5 player / Video.js
```

All HTTP requests from the frontend carry:
- `credentials: 'include'` — sends the session cookie.
- `Authorization: Bearer <token>` header — from `sessionStorage` token set after OAuth exchange.

---

## Authentication Flow

```
1. User visits / → AuthRequired → no session → redirect /login
2. LoginPage → user clicks "Sign in with Google"
3. Frontend navigates to  GET /api/auth/google?state=<return-url>
4. Backend completes OAuth with Google, issues a short-lived exchange code,
   redirects back to frontend with ?auth_exchange=<code>
5. AuthContext reads the code from the URL, calls POST /api/auth/exchange
6. Backend validates the code, returns { success, token, user }
7. Token is stored in sessionStorage; user object stored in React state
8. All subsequent API calls include Authorization: Bearer <token>
```

The Real-Debrid API key is **never stored in the browser**. It is saved server-side via `POST /api/auth/realdebrid/api-key` and the backend proxies all Real-Debrid calls on behalf of the authenticated user.

---

## Cover Image Pipeline

Cover images for torrents are fetched and cached in two stages:

1. **Search results** — the backend may return `coverImage` URLs inline with each torrent record when the `includeCoverImages=true` query parameter is passed.
2. **On-demand fetch** — `enhancedCoverImageService` (`src/services/enhancedCoverImageService.ts`) fetches a cover on first view and stores the resulting URL in the backend via `POST /api/cache/cover-image`. The backend re-hosts images through a third-party image proxy (Pixhost) and returns the stable proxy URL; subsequent fetches return the cached URL from `GET /api/cache/cover-image/:key`. All cover image data exchanged between frontend and backend is **URL-only** (no binary blobs are sent or stored in localStorage).

---

## Mobile / Android Build

A special build target (`npm run build:android`) sets environment variables `REACT_APP_PLATFORM=android`, `REACT_APP_IS_MOBILE_APP=true`, and `REACT_APP_ENABLE_TOUCH_OPTIMIZATIONS=true`. This activates:
- `src/styles/android.css` — touch-friendly tap targets, no hover states.
- `androidApiConfig.ts` / `androidNetworkHandler.ts` — retry logic and timeout adjustments tuned for mobile network conditions.
- Mobile-specific components: `MobileSearchForm`, `MobileTorrentResults`.

The Android build still produces a standard web bundle that can be served by nginx or loaded in a WebView.

---

## Build Pipeline

```
src/ (TypeScript + React)
   └── craco build (wraps react-scripts / webpack 5)
         │  craco.config.js removes:
         │    - ForkTsCheckerWebpackPlugin (type-checking disabled for speed)
         │    - ESLintWebpackPlugin (linting disabled)
         │    - ModuleScopePlugin
         │  Enables chunk splitting (max 244 KB per chunk)
         │
         └── build/  (static files)
               └── served by nginx (see Dockerfile)
```

The nginx server in the Docker image handles:
- SPA fallback: all routes → `index.html`.
- Static asset caching: `/static/**` → 1-year immutable cache.
- Security headers: `X-Frame-Options`, `X-XSS-Protection`, `X-Content-Type-Options`.
