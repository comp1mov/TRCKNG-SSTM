# TRCKNG SSTM v1.30

Local-first modular tracking dashboard for weekly habits, timers, money, formulas, and small personal metrics.

The app is intentionally simple to deploy: static HTML/CSS/JS, data stored in `localStorage`, optional Supabase account sync, with PWA/offline support through `service-worker.js`.

## Current Structure

- `index.html` - app markup and modals
- `app-config.js` - optional Supabase project config
- `style.css` - visual system, responsive layout, mobile fixes
- `app.js` - state, storage, rendering, timers, import/export
- `manifest.json` - PWA metadata
- `service-worker.js` - offline cache
- `SUPABASE_SETUP.md` - SQL and first-sync checklist

## Features

- 3 independent PIN pages
- 9 configurable cells per PIN
- Cell types: Unit, Value, Math, MM:SS, Min, Sec, Timer, Countdown, Income, Budget, LED Pulse, FX Rate
- Weekly history with 52-week retention
- Per-PIN labels, descriptions, colors, themes, timer settings, money settings, math settings, LED settings, and currency settings
- TRACK/HISTORY views
- Internal v2 `cells` + `cellLayout` adapter for the upcoming modular grid editor
- Cell size presets: 1x1, 2x1, 1x2, and 2x2
- Dedicated LAYOUT view with UP/DOWN reorder controls and PACK reflow
- Optional Supabase account panel
- Manual cloud snapshot upload / load across all PINs
- JSON export/import for backups
- PWA install support
- Mobile fixes for iOS safe areas, double-tap zoom, and Safari active states

## Data

All user data is stored locally in browser `localStorage`. Per-PIN keys use suffixes like `_pin0`, `_pin1`, and `_pin2`. Supabase sync stores a full app snapshot in `public.trckng_snapshots.app_state` when enabled.

Main stored groups:

- weekly values: `trckng_sstm_data_pinX`
- cell labels/types/colors/descriptions
- duration/timer runtime and settings
- unit/value/math/money/LED/currency settings
- v2 cell schema snapshots and layout positions
- per-PIN theme and custom PIN names

## Backup

Use `EXPORT` before major changes or before clearing browser data. Import restores the current PIN state and supported v1.30 settings. Supabase `UPLOAD THIS DEVICE` / `LOAD CLOUD` handles full-app snapshots.

## Supabase

See `SUPABASE_SETUP.md`. The required public values can be pasted in the app under `ACCOUNT`; the password is never stored by this app.

## Development Roadmap

See `C:\Users\gregt\Desktop\strategic_roadmap.md`.

Recommended next phase:

1. Finish Supabase account MVP validation.
2. Add safe autosync and cloud conflict handling.
3. Add mobile install/update polish.
4. Return to drag/resize and section label/text cells after sync is stable.

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

For phone testing on the same Wi-Fi:

```powershell
node dev-server.mjs 5173 --lan
```
