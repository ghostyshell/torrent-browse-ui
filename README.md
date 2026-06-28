# stream-frontend

[![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/EbHcTNAqca)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/ghosty99)

A React 19 web UI for searching torrents across multiple indexers and streaming them via Real-Debrid. Self-hostable with Docker.

> **License:** GPL-3.0-or-later — see [`LICENSE`](LICENSE).

---

## Features

- Multi-indexer torrent search: PirateBay, YTS, 1337x, Nyaasi, LimeTorrent, and more
- Real-Debrid integration for direct stream URL resolution (optional)
- Favourites and cached/stored links with backend-first storage + localStorage fallback
- Cover image management (backend-hosted, URL-only storage)
- Google Cast (Chromecast) support
- Mobile-optimised build target
- Docker-ready with nginx

---

## Quick Start

### Docker (recommended)

```bash
docker build \
  --build-arg REACT_APP_API_URL=https://your-backend.example.com \
  --build-arg REACT_APP_BACKEND_URL=https://your-backend.example.com \
  -t stream-frontend .

docker run -p 3000:80 stream-frontend
```

Open [http://localhost:3000](http://localhost:3000).

### Local development

```bash
cp .env.example .env.local
# Edit .env.local: set REACT_APP_API_URL and REACT_APP_BACKEND_URL

npm ci
npm start       # Dev server at http://localhost:3000
```

---

## Backend

This frontend requires a compatible torrent-search / streaming backend API, configured via `REACT_APP_API_URL`. The backend handles torrent indexer scraping, Real-Debrid proxying, user authentication (Google OAuth), and persistent storage. The frontend project does not include or ship a backend.

---

## Documentation

Full documentation for contributors and self-hosters lives in [`docs/`](docs/):

| Document | Contents |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | App overview, rendering model, routing, state management, backend-first storage strategy, data flow |
| [`docs/code-structure.md`](docs/code-structure.md) | Module-by-module tour of `src/` — components, services, hooks, utilities |
| [`docs/configuration.md`](docs/configuration.md) | All `REACT_APP_*` environment variables, build-time injection, dev vs production |
| [`docs/data-and-api.md`](docs/data-and-api.md) | API request/response shapes, authentication flow, caching, sync behaviour |
| [`docs/development.md`](docs/development.md) | Install, run, build, craco config, Playwright e2e tests, Docker |

The landing page at [`docs/index.html`](docs/index.html) is published on GitHub Pages at
[akshatsinghkaushik.github.io/stream-frontend](https://akshatsinghkaushik.github.io/stream-frontend/).

---

## Environment Variables

| Variable | Description |
|---|---|
| `REACT_APP_API_URL` | Backend API base URL (required) |
| `REACT_APP_BACKEND_URL` | Backend URL for direct fetch calls (usually same as above) |
| `REACT_APP_USE_BACKEND_FIRST` | `true` (default) — read/write backend before localStorage |
| `REACT_APP_ENABLE_LOCALSTORAGE_FALLBACK` | `true` (default) — fall back to localStorage on backend failure |
| `REACT_APP_SHOW_CONSOLE_LOGS` | `ON` suppresses logs; `OFF` shows them |
| `REACT_APP_CAST_RECEIVER_APP_ID` | Chromecast receiver app ID (defaults to Google's Default Media Receiver) |

See [`docs/configuration.md`](docs/configuration.md) for the full reference.

---

## Tests

```bash
# Install Playwright browsers (once)
npm run playwright:install

# Run e2e suite (builds first)
npm run test:e2e

# Run without rebuilding
npm run test:e2e:dev
```

See [`tests/README.md`](tests/README.md) and [`docs/development.md`](docs/development.md) for more options.

---

## License

This project is free software, released under the [GNU General Public License v3.0 or later](LICENSE).
You are free to use, modify, and distribute it under the same terms.
