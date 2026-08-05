# TRCKNG SSTM Development Plan

## Current Baseline

Branch: `codex/v125-stabilization`

The project is now a static split app:

- `index.html`
- `style.css`
- `app.js`
- `manifest.json`
- `service-worker.js`

Current working app target: `v1.31.4`.

## Phase 1.5: Navigation + History Architecture

Status: complete as a bridge, paused for architecture-first work

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

## Architecture Re-Anchor

Decision: stop adding isolated button-level UX until the v2 architecture is shaped.

The next work should follow the original roadmap: TRCKNG SSTM becomes a modular tracking field, not just a fixed 3x3 habit grid with extra settings. Phase 1.5 remains useful because it introduced top-level views and per-cell flags, but it must not turn into a parallel mini-roadmap.

Core model:

- `cells`: stable entities with id, type, label, color, description, behavior settings, and flags.
- `cellLayout`: per-PIN placement with row, col, rowSpan, colSpan, order, and visibility.
- `pins`: pages/workspaces that own cells and layouts; support 3-6 now, expandable later.
- `views`: `TRACK`, `HISTORY`, and later `LAYOUT`; views render the same data through different surfaces.
- `history`: weekly archives and summaries derived from stored tracking data, not from the button DOM.

Interaction rules:

- Short tap remains the primary tracking action.
- Long-press is reserved for explicit global gestures first: secret signup on header/logo in Phase 4.
- Cell long-press, flip cards, badges, and detailed stat overlays are deferred until `cells` and `cellLayout` exist.
- Timer/Duration/Goal Time cells should move toward explicit in-cell controls instead of overloaded tap/hold behavior.

## Phase 2: Modular Grid Architecture

Status: resuming after account/sync baseline

Goal: replace the fixed `HABITS = cell01..cell09` mental model with a layout-driven cell system while keeping the current app usable after every step.

Implementation order:

1. Done: add schema adapters that keep existing localStorage keys working while exposing `cells`, `cellLayout`, and `pins`.
2. In progress: move storage helpers behind a small data access layer so renderers stop reading raw localStorage-shaped objects directly.
3. Done: make `renderHabits()` render from ordered cell definitions and `cellLayout`, with the current 3x3 grid as the default layout.
4. Done: add CSS Grid positioning with saved row/col/span defaults.
5. Done: add static size presets for 1x1, 2x1, 1x2, and 2x2 cells with ordered reflow.
6. Done: add `LAYOUT` view with UP/DOWN reorder controls and PACK reflow.
7. In progress: move the old `EDIT` entry points into `LAYOUT`.
8. Next: improve responsive field behavior before full drag/resize.
9. Add drag/resize controls after the manual layout mode exists.
10. Add explicit in-cell controls for time-based cells.
11. Revisit history/card/flag UI after the modular grid is stable.

## Phase 4A: Supabase Account MVP

Status: started

Decision: pull account/sync forward before more layout experiments so the app can be used again across computer and phone.

Scope:

- Keep local-first mode as the default fallback.
- Add optional Supabase config through `app-config.js` or the in-app `ACCOUNT` panel.
- Use Supabase Auth email/password for one personal account.
- Hide public sign-up behind a 3-second hold gesture on the Account email label.
- Store one full-app JSON snapshot per user in `public.trckng_snapshots`.
- Protect snapshots with RLS policies keyed by `auth.uid() = user_id`.
- Start with manual `UPLOAD THIS DEVICE` and `LOAD CLOUD` before autosync.
- Document the SQL setup and first sync flow.

Deferred:

- Autosync debounce and conflict resolution.
- Per-cell relational tables.
- Collaboration or sharing.
- Account profile settings beyond sign in / sign out.

## Next Phases

1. Done: Phase 4A Supabase manual account/snapshot flow.
2. Done: Phase 4B account hardening with hidden config and secret sign-up gesture.
3. Done: Phase 5A safe autosync with dirty-state debounce and cloud update checks.
4. Done: Phase 5B sync recovery for fresh-device cloud bootstrap, wake checks, main-screen sync button, and conflict pause.
5. Deferred: Phase 5C conflict review UI with choose / merge / preserve-both flows.
6. Next: Phase 2C layout editor UX and modular field architecture.
7. Phase 2D responsive field behavior for desktop/mobile.
8. Phase 2E explicit time-cell controls inside larger cells.
9. Phase 5D mobile install/update polish for phone use.
10. Phase 3: weekly cycle review and Goal Time.

## Phase 2C: Layout Editor UX

Goal: make `LAYOUT` the only place for editing the modular field, not a duplicate of the old `EDIT` menu.

Scope:

- Keep the current 3-column CSS Grid and saved `cellLayout` model.
- Move PIN rename, PIN fill color, Theme, Notify, and Info into `LAYOUT`.
- Let empty-name cells disappear from `TRACK` but stay recoverable from the layout editor.
- Make the editor communicate cell type, size, active state, and sync-safe saved state.
- Keep every change local-first and covered by export/import/Supabase snapshot sync.

Design direction:

- `TRACK` is for use.
- `LAYOUT` is for structure.
- `HISTORY` is for review.
- Cell long-press, flip cards, and badges stay deferred until the editor model is stronger.

## Phase 5C: Conflict Review UI

Goal: when cloud and local data differ, make the choice visible and reversible instead of asking the user to guess which button is safe.

Planned flow:

- Detect local-only, cloud-only, and changed-on-both sections by PIN, week, and cell id.
- Offer `LOAD CLOUD`, `KEEP THIS DEVICE`, `MERGE SAFE DIFFERENCES`, and `EXPORT BOTH` actions.
- Merge only non-overlapping changes automatically, such as different weeks or different cells.
- Preserve both versions when the same cell/week differs, then let the user choose later.
- Keep a JSON export fallback before destructive conflict resolution.
