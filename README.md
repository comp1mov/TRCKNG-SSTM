# TRCKNG SSTM v1.31.4

Local-first modular tracking field for weekly habits, timers, money, formulas, and small personal metrics.

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
- Optional Supabase account panel with project config prefilled
- Manual cloud snapshot upload / load across all PINs
- Safe autosync with dirty-state debounce
- Cloud update checks on sign-in, focus, and online recovery
- Fresh-device cloud bootstrap after sign-in
- Conflict pause when local unsaved data and cloud data differ
- Main-screen SYNC button with pull-first cloud check
- Automatic upload preflight before writing to cloud
- Supabase project config hidden behind account advanced config
- Sign-up hidden behind a 3-second hold on the Account email label
- LAYOUT now owns cell editing, PIN rename, PIN fill color, Theme, Notify, and Info
- Empty-name cells hide from TRACK but remain recoverable in LAYOUT
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

Use `EXPORT` before major changes or before clearing browser data. Import restores the current PIN state and supported v1.31.4 settings. Supabase `UPLOAD THIS DEVICE` / `LOAD CLOUD` handles full-app snapshots, signed-in local changes are queued for debounced autosync, and the main-screen `SYNC` button checks cloud before uploading pending changes.

## Supabase

See `SUPABASE_SETUP.md`. The current Supabase project URL and publishable key are already in `app-config.js`; the password is never stored by this app. Autosync writes one full-app snapshot row per user, debounced after local changes, and pauses when a conflict needs manual choice.

## Public App

Current GitHub Pages URL:

```text
https://comp1mov.github.io/TRCKNG-SSTM/
```

The public build uses the `/TRCKNG-SSTM/` base path already configured in `manifest.json` and `service-worker.js`.

## Development Roadmap

See `C:\Users\gregt\Desktop\strategic_roadmap.md`.

Recommended next phase:

1. Continue Phase 2C layout editor UX.
2. Keep all editing entry points in LAYOUT instead of a separate EDIT menu.
3. Improve responsive field behavior carefully before full drag/resize.
4. Add explicit time-cell controls only after the field model is stable.
5. Return to conflict review UI only when real multi-device conflicts need a richer screen.

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
