---
name: torrent-ui-context
description: Frontend context for torrent-browse-ui. Use when working on React UI, video streaming, Google Cast, Real-Debrid, favorites, caching, or Playwright e2e tests.
---

You are working in **torrent-browse-ui** — a React frontend for torrent browsing and streaming.

## Stack

- React 19 + TypeScript 4.9, MUI v7, CRA with Craco
- React Router v7, Axios for API calls
- Real-Debrid for unrestricted stream URLs
- Google Cast (Chromecast) for casting streams
- VideoJS / HTML5 player components
- Turso client via `sql.js` for local/offline storage
- Playwright for e2e tests

## Key paths

| Area | Path |
|------|------|
| App entry | `src/App.tsx`, `src/index.tsx` |
| API client | `src/services/torrentApi.ts` |
| Real-Debrid | `src/services/realDebridService.ts`, `src/hooks/useRealDebridService.ts` |
| Google Cast | `src/services/googleCastService.ts`, `src/hooks/useGoogleCast.ts`, `src/components/CastButton.tsx` |
| Video player | `src/components/VideoPlayerModalVideoJS.tsx`, `src/components/HTML5Player.tsx` |
| Streaming hooks | `src/hooks/useVideoStreaming.ts`, `src/hooks/useDirectStreaming.ts`, `src/hooks/useStreamWithCache.ts` |
| Stream/cache utils | `src/utils/streamUrlCache.ts`, `src/utils/videoStreamUtils.ts`, `src/utils/magnetCache.ts` |
| Favorites | `src/services/favoritesService.ts`, `src/components/FavoritesPage.tsx` |
| Cover images | `src/services/coverImageService.ts`, `src/services/enhancedCoverImageService.ts` |
| Auth | `src/contexts/AuthContext.tsx`, `src/components/auth/` |
| Android build | `src/services/androidApiConfig.ts`, `src/styles/android.css` |
| E2E tests | `tests/e2e/*.spec.js`, `playwright.config.js` |

## Environment

- `REACT_APP_API_URL` — backend API (default `http://localhost:3001`)
- `REACT_APP_REAL_DEBRID_API_KEY` — required for streaming
- `REACT_APP_CAST_RECEIVER_APP_ID` — optional, defaults to Google Default Media Receiver
- Android builds use `REACT_APP_PLATFORM=android` flags (see `npm run build:android`)

## Commands

```bash
npm start              # dev server on :3000
npm run build          # production build
npm run build:android  # Android-optimized build
npm test               # Jest unit tests
npm run test:e2e       # Playwright (builds first)
npm run test:e2e:dev   # Playwright without rebuild
```

## Conventions

- Prefer existing hooks/services over duplicating API or cache logic
- Stream URL caching is layered (`streamUrlCache`, `useStreamWithCache`) — preserve cache invalidation behavior
- Cast integration requires the Cast SDK; check `available` / `hasDevices` before showing Cast UI
- Backend must be running on 3001 for integration tests and live API calls

## Frontend / UI/UX skills

User-facing React + MUI. Skills at `~/.claude/skills/` — see `.cursor/rules/ai-guidelines.md` for the full task→skill tables.

**Defaults for this repo:** ui-ux-pro-max + bencium-controlled-ux-designer for new UI; motion-dev-animations or motion-ref-skill for player/modal motion; composition-patterns + react-best-practices for refactors; web-design-guidelines + accesslint-* before shipping.

Refresh: `sh ~/Code/scripts/install-frontend-skills.sh`

When invoked, scope changes to `torrent-browse-ui/`.
