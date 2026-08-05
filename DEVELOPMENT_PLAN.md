# TRCKNG SSTM Development Plan

## Current Baseline

Branch: `codex/v125-stabilization`

The project is now a static split app:

- `index.html`
- `style.css`
- `app.js`
- `manifest.json`
- `service-worker.js`

Current working app target: `v1.26`.

## Phase 1.5: Navigation + History Architecture

Status: in progress

Goal: keep the main screen focused on active tracking and move weekly history into its own app mode.

Scope:

- Add `TRACK` and `HISTORY` top-level view modes.
- Hide weekly stats from the main tracking screen.
- Keep existing weekly table rendering as the first `HISTORY` view.
- Add a `cellFlags` storage layer for future per-cell history/detail behavior.
- Include `cellFlags` in export/import/reset.
- Update docs and project log as changes land.

Design notes:

- Short tap remains the primary cell action.
- Long-press details should be added later only after resolving conflicts with Unit/Money press-and-hold increments.
- Future flags can drive whether a cell appears in history, shows totals, opens details, or behaves as a pinned/archived metric.

## Next Phases

1. Phase 1: iOS/mobile polish and punk-pixel effects.
2. Phase 2a-c: variable-size CSS Grid layout editor.
3. Phase 3: weekly cycle review and Goal Time.
4. Phase 4: Supabase accounts.
5. Phase 5: offline-first sync.
