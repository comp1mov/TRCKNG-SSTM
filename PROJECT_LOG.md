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
