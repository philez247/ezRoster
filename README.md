# EZ Roster Prototype

EZ Roster Prototype is a single-repo web app for roster planning and sports-schedule ingestion.

## Stack

- Frontend: React 19 + Vite + React Router + CSS Modules
- API Proxy: Node.js + Express (`server/index.js`)
- Persistence (current phase): browser `localStorage`

## Repository Layout

- `src/components` Shared layout and UI shell
- `src/pages` Route-level screens (home, owners, management, roster, scraper)
- `src/data` Domain data modules and localStorage adapters
- `src/services` ESPN fetch/normalize/sync services
- `src/scrapers` Sport-specific scraper page implementations
- `src/config` Config store (sports, offices, roles)
- `server` ESPN proxy server for CORS-safe fetches
- `public` Static assets

## Runtime Model

- The React app runs on Vite (`:5173`)
- The proxy server runs on Express (`:3001`)
- Frontend scraper/services call `/api/...` routes exposed by the proxy
- Master schedule data is merged into the master store in `src/data/birScheduleMaster.js`

## Development

### Prerequisites

- Node 20+ (recommended)

### Install

```bash
npm install
```

### Run frontend + proxy together

```bash
npm run dev:all
```

### Run separately

```bash
npm run server   # Proxy on :3001
npm run dev      # Frontend on :5173
```

## Fixture Seeding (Dev Only)

Development seed data is executed by `src/bootstrap/devSeed.js` and only in Vite dev mode.

- Default: enabled in dev
- Disable with environment variable:

```bash
VITE_ENABLE_FIXTURE_SEED=false
```

## Build and Preview

```bash
npm run build
npm run preview
```

## Notes for Engineers

- The app currently uses localStorage-backed data modules by design for rapid iteration.
- Naming with `BIR` refers to the schedule/master subsystem and is still in active use.
- If scraper routes return 404 after adding endpoints, restart `npm run server`.
