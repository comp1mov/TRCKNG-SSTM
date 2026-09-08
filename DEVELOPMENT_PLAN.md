# TRCKNG SSTM Development Plan

## Current Baseline

Branch: `codex/v125-stabilization`

The project is now a static split app:

- `index.html`
- `style.css`
- `app.js`
- `manifest.json`
- `service-worker.js`

Current working app target: `v1.33.0`.

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
7. Done: move the old `EDIT` entry points into `LAYOUT`.
8. Done: keep empty cells visible as quiet field slots, with creation handled from `LAYOUT`.
9. In progress: Responsive Field Shell for phone, laptop, and desktop widths.
10. Next: LAYOUT cleanup, including hidden/empty cells, visibility controls, and no duplicated EDIT surface.
11. Add Cell Cycle Architecture: daily, weekly, monthly, and never-reset behavior.
12. Polish Header / Week / PIN visuals after the field shell is stable.
13. Add drag reorder and resize handles.
14. Add Goal Time and richer time-based cells after the base field model is stable.

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

Strategy update, 2026-08-09:

The current root app should remain stable for daily use, but the future interface should not be forced through the existing 3x3 surface. The next major implementation track is a parallel `/v2/` interface where PIN Fields + Grid + Views are the starting model.

1. Done: Phase 4A Supabase manual account/snapshot flow.
2. Done: Phase 4B account hardening with hidden config and secret sign-up gesture.
3. Done: Phase 5A safe autosync with dirty-state debounce and cloud update checks.
4. Done: Phase 5B sync recovery for fresh-device cloud bootstrap, wake checks, main-screen sync button, and conflict pause.
5. Deferred: Phase 5C conflict review UI with choose / merge / preserve-both flows.
6. Stable-track: keep v1 root usable, with only safe fixes and small UI corrections.
7. Next major track: create `/v2/` static interface with its own PIN Fields + Grid + Views data model.
8. Add v2 world store: pins, modules, views, links, presets, settings.
9. Add v2 10x10 grid renderer per PIN and view switcher inside the active PIN.
10. Add v1 one-way import into v2 after the v2 model can be inspected safely.
11. Import old 3x3 cells into the larger field while preserving legacy refs and current module behavior.
12. Add v2 Event Layer and Timeline once module ids exist.
13. Add presets, direct manipulation, cycles, Goal Time, and sync after the v2 surface is usable.

## Phase 2C: Layout Editor UX

Goal: make `LAYOUT` the only place for editing the modular field, not a duplicate of the old `EDIT` menu.

Scope:

- Keep the current 3-column CSS Grid and saved `cellLayout` model.
- Move PIN rename, PIN fill color, Theme, Notify, and Info into `LAYOUT`.
- Treat each field cell as a place where a module can exist.
- Keep empty cells visible in `TRACK` without distracting create labels.
- Create or edit empty cells from `LAYOUT`.
- Make the editor communicate cell type, size, active state, and sync-safe saved state.
- Keep every change local-first and covered by export/import/Supabase snapshot sync.

Design direction:

- `TRACK` is for use.
- `LAYOUT` should turn the same field/buttons into editable modules with an overlay, not render an unrelated editor surface.
- `HISTORY` is for review.
- Empty cells are not deleted modules; they are unused field cells.
- Responsive desktop/mobile layout must be designed on top of field cells, not by blindly stretching button animations.
- Cell long-press, flip cards, and badges stay deferred until the editor model is stronger.

## Phase 2D: Responsive Field Shell

Goal: make the tracking field feel intentional on phone, laptop, and desktop before adding drag/resize.

Scope:

- Keep one shared `cellLayout` model for now.
- Use responsive shell limits for field width instead of treating the whole app as a stretched mobile column.
- Use stable row heights for cells so animations and large modules have predictable space.
- Keep PINs and utility controls visually secondary to the field on desktop.
- Do not add desktop/mobile-specific saved layouts until the single field model feels solid.

Previous locked order:

1. LAYOUT cleanup: hidden/empty cells, visibility controls, and no duplicated EDIT surface.
2. Cell Cycle Architecture: daily, weekly, monthly, and never-reset behavior.
3. Header / Week / PIN visual polish only after layout behavior is stable.
4. Drag reorder and resize handles.
5. Goal Time and richer time-based cells.

This order is now superseded for major work by the parallel `/v2/` Grid + Views interface plan. Keep this section as v1 context, not as the main future interface plan.

## Phase 5C: Conflict Review UI

Goal: when cloud and local data differ, make the choice visible and reversible instead of asking the user to guess which button is safe.

Planned flow:

- Detect local-only, cloud-only, and changed-on-both sections by PIN, week, and cell id.
- Offer `LOAD CLOUD`, `KEEP THIS DEVICE`, `MERGE SAFE DIFFERENCES`, and `EXPORT BOTH` actions.
- Merge only non-overlapping changes automatically, such as different weeks or different cells.
- Preserve both versions when the same cell/week differs, then let the user choose later.
- Keep a JSON export fallback before destructive conflict resolution.

## v1.34: History Matrix

Status: next focused v1 History track.

Goal: make `HISTORY` explain tracked data across time, not only list weekly totals.

Why:

- The user needs to understand what happened by day, week, and later month.
- The current weekly table is too dense once counters, duration sessions, corrections, renamed cells, and timeline events all exist.
- The landscape phone timeline already gives a strong time-first view; the matrix should become the structured companion to that timeline.

Core idea:

- Horizontal axis is time.
- Vertical axis is tracked cells/modules.
- The selected history range controls both the timeline strip and the matrix.
- The matrix is a projection of existing data, not a new storage system.

MVP order:

1. Add a `HISTORY` display switch for `TABLE` / `MATRIX`, or introduce Matrix as the default expanded table mode if the UI stays simpler.
2. Build the week matrix first: columns `MON` through `SUN` plus `TOTAL`; rows are History-visible cells from the selected PIN/week.
3. Use `historyTimelineWeekKey` as the selected week source so `PREV` / `NEXT`, weekly rows, landscape timeline, and matrix stay synchronized.
4. Duration-like cells (`MM:SS`, `MIN`, `SEC`, `SLEEP`) show per-day duration from `durationSessions`, with corrected sessions reflected automatically.
5. Counter/value/money-style cells show per-day event buckets from `counterChangeLog` where available.
6. Old weekly-only data must not be faked into daily values. Show it as a weekly fallback/total when day-level event data does not exist.
7. Tapping a matrix cell filters or focuses the timeline inspector for that cell/day.
8. Tapping a duration matrix cell should open the same correction path used by `CORRECT TIME`, scoped to that cell/day when possible.
9. Add basic filters: `ALL`, `TIME`, `COUNTS`, and `ACTIVE`.
10. Keep the original table reachable until Matrix proves it covers the important review cases.

Later:

- Add month mode where columns become weeks or days, depending on zoom.
- Add day mode where columns become hours or time blocks.
- Add row grouping by PIN, type, or active/archived state.
- Add richer totals: selected day, selected week, selected month, and visible-filter total.
- Add expandable cell details for event lists, corrections, and label-change context.
- Move to a generic Event Layer only after these projections prove what queries the UI really needs.

Design constraints:

- Do not create separate Matrix storage.
- Preserve v1 slot identity: `cell01` ... `cell09` remain the durable ids.
- Preserve historical labels from stored event/session snapshots when available.
- Keep phone portrait usable with horizontal matrix scroll.
- In phone landscape, prioritize the large timeline first and make the matrix compact below or beside it.
- Avoid making the matrix feel like a spreadsheet editor; it is a review/control surface for time.
