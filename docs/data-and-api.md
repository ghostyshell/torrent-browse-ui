# Data and API

This document describes how the frontend communicates with its backend API — request shapes, response shapes, authentication, caching, and sync behaviour.

---

## Base URL

All API requests go to the URL set in `REACT_APP_API_URL` (and `REACT_APP_BACKEND_URL` for services using `fetch` directly). There is no separate CDN or third-party service contacted by the frontend except:

- **Google Fonts** (preconnect only — no data sent).
- **Cast SDK** CDN (loaded if Chromecast support is available in the browser).

The backend is responsible for all outbound network activity (torrent indexers, Real-Debrid API, image proxies, database).

---

## HTTP Client

**Axios instance** (`src/services/apiClient.ts`):

```
axios.create({
  baseURL: REACT_APP_API_URL,
  withCredentials: true,           // sends session cookie on every request
})
```

Request interceptor automatically adds:

```
Authorization: Bearer <sessionToken>   // read from sessionStorage
```

**Native fetch** is used in `storedLinksService`, `favoritesService`, and `enhancedCoverImageService`. All fetch calls pass `credentials: 'include'` and the same `Authorization` header via `getAuthHeaders()`.

---

## Authentication Endpoints

| Method | Path | Request | Response |
|---|---|---|---|
| `GET` | `/api/auth/google?state=<url>` | — | Redirect to Google OAuth |
| `POST` | `/api/auth/exchange` | `{ code: string }` | `{ success, token, user }` |
| `POST` | `/api/auth/validate` | — | `{ success, user }` or `401` |
| `POST` | `/api/auth/logout` | — | `{ success }` |
| `POST` | `/api/auth/realdebrid/api-key` | `{ apiKey: string }` | `{ success }` |
| `DELETE` | `/api/auth/realdebrid/api-key` | — | `{ success }` |

`user` object shape:

```ts
{
  id: string;
  email: string;
  name: string;
  picture?: string;
  hasRealDebridKey: boolean;
  isEmailAllowed: boolean;
}
```

Only users whose email is on the backend's allow-list can log in (`isEmailAllowed: true`).

---

## Torrent Search Endpoints

### List available indexers

```
GET /torrents
Response: string[]   // e.g. ["piratebay", "yts", "1337x", "nyaasi", "limetorrent"]
```

### Search

```
GET /{website}/{query}/{page}?[minSeeders=N]&[includeCoverImages=true]&[sort=S]&[category=C]
```

| Param | Type | Description |
|---|---|---|
| `website` | string | Indexer name or `all` |
| `query` | string | URL-encoded search query |
| `page` | number | 1-based page number |
| `minSeeders` | number? | Minimum seeder count filter |
| `includeCoverImages` | bool? | Request cover image URLs inline |
| `sort` | string? | Indexer-specific sort key (e.g., PirateBay sort codes) |
| `category` | string? | Indexer-specific category code |

Response formats (backend may return any of these):

```ts
// Array (most indexers)
Torrent[]

// Object with .data array
{ data: Torrent[] }

// Map of source → Torrent[] (when website = "all")
{ [source: string]: Torrent[] }
```

The frontend normalises all three to `Torrent[]`.

### Browse (no query — latest uploads)

```
GET /torrents/browse/{category}/{page}?[sort=S]
Response: Torrent[]
```

Used for the home screen "Latest Uploads" view.

### Torrent Details

```
GET /torrent-details/{website}/{encodedTorrentUrl}
```

Response:

```ts
{
  description: string;         // HTML or plain text
  files: { name: string; size: string }[];
  comments: { author: string; comment: string; date: string }[];
  images: { originalUrl: string; directUrl: string }[];
  magnet?: string;
  hash?: string;
  error?: string;
}
```

The `1337x` indexer uses FlareSolverr for Cloudflare bypass; expect up to 65 seconds for this endpoint.

---

## Favourites Endpoints

```
GET    /api/favorites?page=N&limit=N
POST   /api/favorites      body: { torrent: Torrent, magnetLink?: string }
DELETE /api/favorites/:id
PUT    /api/favorites/:id  body: Partial<FavoriteEntry>
```

Favourites `GET` response:

```ts
{
  success: boolean;
  favorites: FavoriteTorrent[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }
}
```

---

## Stored Links (Cached Stream Links) Endpoints

```
GET    /api/storage/stored-links?page=N&limit=N
POST   /api/storage/stored-links   body: { url, title?, streamUrl?, ... }
PUT    /api/storage/stored-links/:id  body: Partial<StoredLink>
DELETE /api/storage/stored-links/:id
```

`StoredLink` shape:

```ts
{
  id: string;
  url: string;                    // magnet link or direct HTTP URL
  title?: string;
  dateAdded: string;              // ISO 8601
  streamUrl?: string;             // resolved Real-Debrid direct URL
  streamUrlCachedAt?: string;     // ISO 8601 — when stream URL was cached
  isStreaming?: boolean;
  error?: string;
  supportsRangeRequests?: boolean;
  filename?: string;
}
```

Stream URLs (Real-Debrid) expire after approximately 4–6 hours. The frontend checks `streamUrlCachedAt` and marks expired links with a warning badge.

---

## Real-Debrid Proxy Endpoints

The frontend never calls the Real-Debrid API directly. All calls go through the backend proxy at `/api/proxy/real-debrid/*`, which attaches the user's stored API key server-side.

Key flow (`realDebridService.getStreamableVideoUrl(magnetUrl)`):

```
1. POST /api/proxy/real-debrid/torrents/addMagnet  → { id, uri }
2. GET  /api/proxy/real-debrid/torrents/info/:id   → { status, files, links }
   (polls until status = "downloaded")
3. GET  /api/proxy/real-debrid/torrents/selectFiles/:id  → selects largest video file
4. POST /api/proxy/real-debrid/unrestrict/link     → { download, filename, mimeType, ... }
5. Returns: { streamUrl: download, filename, supportsRangeRequests, ... }
```

---

## Cover Image Endpoints

```
POST /api/cache/cover-image         body: { torrent, imageUrl }
GET  /api/cache/cover-image/:key
POST /api/cache/cover-image/torrent body: Torrent
PUT  /api/cache/cover-image/favorite/:id           body: { coverImageUrl }
PUT  /api/cache/cover-image/cached-link/:id        body: { coverImageUrl }
PUT  /api/cache/cover-image/torrent-details/:id/:source body: { coverImageUrl }
GET  /api/cache/stats
```

All cover image GET responses return JSON (never binary):

```ts
{ success: boolean; type: "url"; imageUrl: string }
```

The backend re-hosts images through a proxy (Pixhost) and returns the stable proxy URL.

---

## Cache and Sync Behaviour

### In-memory caches (runtime only)

| Cache | Location | TTL | Purpose |
|---|---|---|---|
| Torrent details | `utils/torrentDetailsCache.ts` | Session | Avoid re-fetching details for the same torrent |
| Stream URLs | `utils/streamUrlCache.ts` | 6 hours | Avoid redundant Real-Debrid API calls |
| Magnet links | `utils/magnetCache.ts` | Session | Cache magnets extracted from detail pages |

### localStorage caches (persist across sessions)

| Key | Content | TTL |
|---|---|---|
| `stored_links` | `StoredLink[]` snapshot | Sync'd from backend on load |
| `torrent_storage_config` | `StorageConfig` object | Permanent |
| `cover-migration-dismissed` | `"true"` | Permanent |
| `cover-image:*` | Cover image URLs (legacy) | 30 days |

### Backend storage (authoritative)

The backend persists favourites, stored links, and cover image URLs. localStorage acts only as a local cache/snapshot.

### Conflict resolution

Write order: backend first. On success, the localStorage snapshot is updated to match. On failure, localStorage is updated optimistically and a background retry is attempted. There is no sophisticated conflict resolution — the last successful write wins.

---

## Error Handling

- HTTP 401 responses clear the session token and redirect to `/login`.
- 4xx / 5xx responses from the torrent search endpoints surface as an `error` prop passed to `ErrorAlert`.
- Real-Debrid errors (e.g., "No files", "Invalid magnet") are surfaced as `error` fields on `StoredLink` records.
- Network failures fall back to localStorage where possible; if no fallback exists, an empty array is returned and the error is logged to the console.
