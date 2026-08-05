# TRCKNG SSTM v1.26

Local-first modular tracking dashboard for weekly habits, timers, money, formulas, and small personal metrics.

The app is intentionally simple to deploy: static HTML/CSS/JS, no backend, data stored in `localStorage`, with PWA/offline support through `service-worker.js`.

## Current Structure

- `index.html` - app markup and modals
- `style.css` - visual system, responsive layout, mobile fixes
- `app.js` - state, storage, rendering, timers, import/export
- `manifest.json` - PWA metadata
- `service-worker.js` - offline cache

## Features

- 3 independent PIN pages
- 9 configurable cells per PIN
- Cell types: Unit, Value, Math, MM:SS, Min, Sec, Timer, Countdown, Income, Budget, LED Pulse, FX Rate
- Weekly history with 52-week retention
- Per-PIN labels, descriptions, colors, themes, timer settings, money settings, math settings, LED settings, and currency settings
- TRACK/HISTORY views
- JSON export/import for backups
- PWA install support
- Mobile fixes for iOS safe areas, double-tap zoom, and Safari active states

## Data

All user data is stored locally in browser `localStorage`. Per-PIN keys use suffixes like `_pin0`, `_pin1`, and `_pin2`.

Main stored groups:

- weekly values: `trckng_sstm_data_pinX`
- cell labels/types/colors/descriptions
- duration/timer runtime and settings
- unit/value/math/money/LED/currency settings
- per-PIN theme and custom PIN names

## Backup

Use `EXPORT` before major changes or before clearing browser data. Import restores the current PIN state and supported v1.26 settings.

## Development Roadmap

See `C:\Users\gregt\Desktop\strategic_roadmap.md`.

Recommended next phase:

1. Finish Phase 1.5 history/details architecture.
2. Polish mobile/PWA behavior.
3. Add modular layout editor for variable-size cells.
4. Add Goal Time.
5. Add Supabase accounts and sync.

## Deploy

The current manifest assumes GitHub Pages path `/TRCKNG-SSTM/`:

```text
https://username.github.io/TRCKNG-SSTM/
```

If deploying to another path, update `manifest.json`, icon paths, and `service-worker.js` cache URLs.

## Local Preview

```powershell
node dev-server.mjs 5173
```

Open:

```text
http://127.0.0.1:5173/TRCKNG-SSTM/
```
