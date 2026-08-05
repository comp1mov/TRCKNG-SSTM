# TRCKNG SSTM Project Log

## 2026-08-05

### Baseline Stabilization

- Connected work to `origin` at `https://github.com/comp1mov/TRCKNG-SSTM`.
- Created branch `codex/v125-stabilization`.
- Split the v1.25 app into `index.html`, `style.css`, and `app.js`.
- Added `dev-server.mjs` for local preview at `/TRCKNG-SSTM/`.
- Updated README to reflect the actual v1.25 app.
- Fixed v1.25 export/import/reset coverage for newer settings.
- Pushed branch `codex/v125-stabilization`.

### Phase 1.5 Started

- Decision: start fresh without importing old local data.
- Direction: move history out of the main tracking screen into a dedicated `HISTORY` view.
- Direction: add a `cellFlags` data layer so buttons can later control history/detail/stat behavior individually.

### Phase 1.5 Implementation

- Added `TRACK` and `HISTORY` view modes.
- Moved the weekly stats table into the `HISTORY` view.
- Expanded history rendering from the last 3 weeks to all retained local weeks.
- Added per-cell flags for `History` and `Last update`.
- Bumped app/export/cache version to `v1.26`.

### Architecture Re-Anchor

- Decision: stop spending the next cycle on isolated micro-interactions like flip cards, long-press cell stats, or extra badges.
- Decision: follow the original v2 roadmap and move next into the modular grid architecture.
- Phase 1.5 is treated as a bridge: `TRACK/HISTORY` views and `cellFlags` stay, but deeper cell behavior waits for the `cells` + `cellLayout` model.
- Next target: introduce an internal schema adapter so the app can keep current localStorage data while rendering from layout-driven cells.

### Phase 2 Foundation Started

- Added `CELL_LAYOUT` storage with per-PIN row, col, rowSpan, colSpan, order, and visibility.
- Added internal `cells` snapshots derived from the existing localStorage-backed settings.
- Added internal `pins` model for future expansion beyond the current three visible PINs.
- Updated `renderHabits()` and the edit list to use layout-driven cells instead of directly iterating `HABITS`.
- Export/import/reset now include v2 schema data while preserving legacy fields for compatibility.
- Bumped app/export/cache version to `v1.27`.

### Phase 2a Size Presets

- Added layout size presets in the cell editor: 1x1, 2x1, 1x2, and 2x2.
- Added ordered layout packing so larger cells reflow the rest of the grid without overlap.
- Saved preset changes to `cellLayout` and kept export/import/reset coverage.
- Bumped app/export/cache version to `v1.28`.

### Phase 2b Layout View

- Added a dedicated `LAYOUT` view alongside `TRACK` and `HISTORY`.
- Added layout tiles with cell metadata, size, type, and actions.
- Added per-cell `UP` / `DOWN` controls that update `cellLayout.order` and repack the grid.
- Added `PACK` toolbar command for compact reflow.
- Bumped app/export/cache version to `v1.29`.

### Phase 4A Supabase Account MVP

- Decision: pause further layout micro-work and pull account/sync forward so the app can be used across computer and phone.
- Added optional `app-config.js` for Supabase project configuration.
- Added `ACCOUNT` panel with Supabase URL/key config, email/password sign up, sign in, sign out, and sync status.
- Added manual cloud snapshot actions: `UPLOAD THIS DEVICE` and `LOAD CLOUD`.
- Added full-app sync snapshots across all 3 PINs instead of syncing only the active PIN.
- Kept local-first mode intact when Supabase is not configured or the SDK is offline.
- Added `SUPABASE_SETUP.md` with table SQL, RLS policies, and first-sync checklist.
- Added LAN preview support to `dev-server.mjs` for phone testing on the same Wi-Fi network.
- Bumped app/export/cache version to `v1.30`.

### Supabase Project Connected

- Added project URL `https://vsabgctziegbtbpqyurb.supabase.co` and publishable key to `app-config.js`.
- Kept the app static/CDN-based instead of adding Next.js-only `@supabase/ssr` dependencies.
- Updated snapshot RLS setup to use `(select auth.uid()) = user_id` policies.
- Bumped app/export/cache version to `v1.30.1`.

### Public App Deployment

- Confirmed GitHub Pages is already serving `https://comp1mov.github.io/TRCKNG-SSTM/`.
- Decision: publish the current static v1.30.1 app by fast-forwarding `main` to the stabilized branch.
- Added the public app URL to `README.md`.

### Phase 5A Safe Autosync

- Added dirty-state tracking for local data changes across counters, cell settings, layout, themes, PIN names, import, and reset.
- Added debounced automatic cloud upload after local changes instead of syncing on every click.
- Added cloud update checks on sign-in, browser focus, visibility return, and network recovery.
- Kept manual `UPLOAD THIS DEVICE` and `LOAD CLOUD` controls as recovery actions.
- Added Account UI sync state (`OFF`, `SIGN IN`, `QUEUED`, `UNSAVED`, `SYNCING`, `SYNCED`).
- Bumped app/export/cache version to `v1.31`.

### Phase 5B Sync Recovery

- Fixed first-use behavior on another computer: fresh local devices now auto-load the existing cloud snapshot after sign-in.
- Added conflict pause so automatic upload does not overwrite cloud when local unsaved data and cloud data both exist.
- Added `CONFLICT` / `LOAD OR UPLOAD` account states while keeping manual recovery buttons available.
- Documented the next conflict-review phase: choose, merge safe differences, or preserve both versions.
- Bumped app/export/cache version to `v1.31.1`.

### Phase 5B.1 Sync Wake + Manual Button

- Added a compact `SYNC` button to the PIN bar for manual pull-first sync without opening `ACCOUNT`.
- Routed startup, auth restore, page show, focus, visibility return, and network recovery through one `triggerCloudSync()` path.
- Added automatic upload preflight: cloud is checked again before writing a debounced local snapshot.
- Fixed sign-in/sign-up dirty-state scheduling after `cloudBusy` clears.
- Bumped app/export/cache version to `v1.31.2`.

### Phase 4B Account Hardening

- Moved Supabase project URL/key fields behind a collapsed `CONFIG SAVED` advanced block.
- Hid `SIGN UP` by default in the Account panel.
- Added a 3-second hold gesture on the Account `Email` label to reveal `SIGN UP` for the current browser session.
- Kept `SIGN IN`, sync status, and manual sync actions visible as the normal account flow.
- Bumped app/export/cache version to `v1.31.3`.

### Roadmap Re-Anchor After Sync

- Decision: the current sync baseline is good enough for real personal use and should not block the UI architecture work.
- Deferred Phase 5C conflict review UI until real multi-device conflicts appear or the product needs a richer recovery screen.
- Resumed Phase 2C as the next active architecture track: turn `LAYOUT` into the modular field editing surface.
- Next focus: consolidate editing into `LAYOUT`, keep empty cells recoverable, and improve the desktop/mobile field behavior carefully.

### Phase 2C Edit Consolidation

- Removed the visible `EDIT` control from the daily header.
- Moved PIN rename, PIN fill color, Theme, Notify, Info, PACK, and per-cell edit access into `LAYOUT`.
- Added persistent per-PIN button fill colors with export/import and Supabase snapshot coverage.
- Changed empty-name cells to hide from `TRACK` while remaining editable in `LAYOUT` without wiping stored values.
- Bumped app/export/cache version to `v1.31.4`.
