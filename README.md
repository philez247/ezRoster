# EZ Roster

A roster system for managing a database of Traders. Built for phone and desktop, with future AWS deployment in mind.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The app works on your machine and on your phone on the same network (use your computer’s IP and port 5173).

## Scripts

- **`npm run dev`** – Start dev server (local + LAN)
- **`npm run server`** – Start ESPN proxy server (port 3001) – required for NBA scraper
- **`npm run dev:all`** – Run proxy + dev server together
- **`npm run build`** – Production build
- **`npm run preview`** – Preview production build locally

### ESPN Scrapers (NBA, NFL, NHL, WNBA, MLB, CBB/NCAAM)

ESPN scrapers fetch schedule data via a local proxy (avoids CORS). **You must run both** the proxy and dev server:

```bash
npm run server    # Terminal 1 – proxy on :3001
npm run dev       # Terminal 2 – Vite on :5173
```

Or use `npm run dev:all` to run both.

## Project structure

- `src/pages/Home.jsx` – Home page with Trader Database and Configuration cards
- `src/pages/Traders.jsx` – Trader Database (placeholder)
- `src/pages/Configuration.jsx` – Configuration (placeholder)
- Responsive layout: mobile-first, safe areas and touch-friendly targets

## Tech stack

- React 18 + Vite 5
- React Router 6
- CSS Modules, no UI framework (easy to customize and deploy)
