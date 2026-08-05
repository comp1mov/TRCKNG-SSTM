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
