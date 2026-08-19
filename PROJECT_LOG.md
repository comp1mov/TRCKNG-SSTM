# TRCKNG SSTM Project Log

## 2026-08-17

### Scenarios And Terminology Note

- Added `V2_SCENARIOS_TERMINOLOGY_NOTES.md` as a collaborative working note for future user scenarios, old notes, terminology, and concept sorting.
- Kept the note privacy-first: real private labels, doses, places, exact dates, personal totals, screenshots, and media should be abstracted before entering repo documentation.

### v2 Orientation Strips Planning

- Decision: treat the current top day/week progress strips as future `Orientation Strips`, not just header decoration.
- Product framing: full timeline remains the detailed history/review surface; top strips become compressed live day/week projections for orientation during tracking.
- Data direction: strips should read derived timeline/event projections rather than store a separate history.
- Decision: first useful implementation should focus on the week strip, with module-level opt-in such as `showInOrientationStrips`.
- UX direction: collapsed strips stay compact; later they can expand into a mini-dashboard with day/week bands, active timers, Event Stopwatch ticks, deadline markers, and activity density.
- Display direction: modules use their own color in the strip by default; span-like modules render as blocks/runs, point-like modules render as ticks/dots, and later settings can override contrast/priority.
- Dashboard direction: expanded orientation dashboard can have its own settings and should show the active date/range and data source/filter.
- Visual direction: the strip should feel like an electronic instrument display or artistic mini dashboard, not generic analytics UI.

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

### Phase 2C Module Field Slots

- Restored empty field cells in `TRACK` as visible `CREATE` slots instead of removing them from the grid.
- Empty cells now open the cell editor directly, turning the unused field cell into a configured module/button.
- `LAYOUT` empty cells are marked as `CREATE`, and clicking the tile body opens the editor.
- Restored active PIN glow on top of custom PIN fill colors.
- Decision: responsive desktop/mobile work should build on this field-cell model instead of stretching buttons arbitrarily.
- Bumped app/export/cache version to `v1.31.5`.

### Phase 2C Quiet Track Slots

- Removed visible `CREATE` text and direct create clicks from empty cells in `TRACK` to keep the daily use screen calm.
- Kept empty-cell creation in `LAYOUT`, where clicking an empty tile or its `CREATE` action opens the cell editor.
- Confirmed PIN fill colors are included in local storage, export/import, and Supabase full-app snapshots.
- Bumped app/export/cache version to `v1.31.6`.

### Phase 2D Responsive Field Shell

- Re-anchored the roadmap order: Responsive Field Shell, LAYOUT cleanup, Cell Cycle Architecture, Header / Week / PIN polish, then drag reorder and resize handles.
- Added responsive field shell variables for field width and cell row height across phone, laptop, desktop, and short desktop screens.
- Removed the default button aspect-ratio dependency so field cells keep a stable row rhythm instead of ballooning on wide screens.
- Fixed PIN fill styling, then corrected it to use brighter color fills instead of separate glow/shadow effects.
- Doubled PIN button height for clearer touch targets and stronger workspace presence.
- Made the desktop utility row quieter and narrower so COPY / COPY PREV / EXPORT / IMPORT / RESET do not compete with the field.
- Bumped app/export/cache version to `v1.32.0`.

### Phase 2D PIN Fill Correction

- Removed separate `box-shadow` and `text-shadow` glow effects from PIN buttons.
- Returned PIN states to a simpler fill-color principle: inactive PINs are darker color fills, active PIN is a brighter version of the selected fill.
- Corrected desktop field row heights so responsive cells do not become wide, flattened rectangles.
- Bumped app/export/cache version to `v1.32.1`.

### Phase 2D PIN Header Hierarchy

- Increased PIN label size so workspace names are easier to read.
- Removed the SYNC/OK button from the PIN row and moved it beside ACCOUNT in the secondary control row.
- Locked the next roadmap order in `DEVELOPMENT_PLAN.md`: LAYOUT cleanup, Cell Cycle Architecture, Header / Week / PIN polish, drag/resize, then Goal Time.
- Bumped app/export/cache version to `v1.32.2`.

### Phase 2D Bottom PIN Switcher

- Reduced PIN label size from `16px` to `11px` after testing showed the previous labels felt too large.
- Moved the PIN switcher below the active work surface so PIN navigation becomes the bottom control layer.
- Started `UI_CHANGE_NOTES.md` as a separate running list for incoming small UI corrections.
- Bumped app/export/cache version to `v1.32.3`.

### Phase 2D PIN Placement Correction

- Corrected the PIN switcher position to sit between `TRACK / LAYOUT / HISTORY` and the active work surface, not at the page bottom.
- Returned PIN label text to the normal compact `8px` size.
- Bumped app/export/cache version to `v1.32.4`.

### Numeric Change History + Undo

- Added per-PIN numeric change logs for Unit/Counter, Money, and Value changes.
- Added `UNDO` beside `DECREASE` to restore the previous value for the latest current-week change.
- Restored counter last-update timestamps when undoing Unit/Counter changes.
- Included change logs in export/import, reset coverage, and Supabase full-app snapshots.
- Increased desktop `TRACK / LAYOUT / HISTORY` tab height while keeping TRACK field cells at their normal responsive sizes.
- Aligned PIN and view bars to the active field width.
- Bumped app/export/cache version to `v1.33.0`.

### v1.33 Dashboard Timeline + Sleep Tracker Iteration

- Reordered top controls into the agreed rows: utility actions under the week area, view tabs, secondary actions, then PIN switches.
- Split date/time/week text out of the progress bars into separate meta rows so day/week strips can stay visually clean.
- Added compact day and week timeline overlays with duration segments, counter/unit event marks, sun markers, day/week dividers, and a clearer animated current-time marker.
- Added `DASH` settings inside `LAYOUT` for timeline visibility, all-PIN overlays, day block count, day/week fill colors, and now-marker color.
- Added duplicate compact day/week timeline strips to the `HISTORY` view so history has the same orientation language as the main dashboard.
- Changed timeline event colors to prefer the source cell color and added safer fallback colors for Sleep and duration modules.
- Added `Sleep` as a duration-style cell type with `mm:ss` display, sleep-sourced interval history, timeline rendering, and editable display modes.
- Added Sleep display modes: `Last session`, `Average / day`, `Total week`, and `Recent 3`.
- Fixed Sleep rollover at week change: completed state starts clean for the new week while interval history remains available for timeline and recent/average displays.
- Updated `Average / day` for Sleep to use a rolling last-7-calendar-days window; if there is less history, it divides by the number of available days from the first sleep day in the window through today.
- Fixed color resolution after cloud/import snapshots by treating `habitColors` as the primary color source and preventing stale white `cells.color` values from overriding real cell colors.
- Unified button, layout tile, new duration session, and timeline segment color resolution so Sleep and other duration-like modules render consistently.
- Added `RESET CELL` in the cell edit modal with a second-click confirmation; it clears the selected cell's name, type, color, settings, values, change logs, duration sessions, and runtime states while keeping its layout slot.
- Renamed the visible `Timer` cell type label to `Alarm` while keeping the existing internal storage type unchanged for compatibility.
- Strategy decision: `MM:SS`, `MIN`, `SEC`, and `SLEEP` should converge into one Span / Duration module family that writes timeline blocks; Alarm / Countdown remains a separate notification-oriented family.
- Implementation plan for Span / Duration unification: keep existing storage types for compatibility, add shared span helpers, record start-stop sessions for every span type, render both completed and running spans on day/week strips, and keep weekly totals in each type's existing display unit.
- Implemented timeline span recording for `MM:SS` and `SEC` in addition to `MIN` and `SLEEP`.
- Extended week rollover so running `MM:SS`, `MIN`, `SEC`, and `SLEEP` spans split cleanly across week boundaries.
- Added a per-cell `Timeline` flag in the edit modal. It defaults off, so day/week timeline strips now show only cells that are explicitly opted in.
- Added timeline hover/focus/tap info: duration blocks and counter markers now expose PIN, label, duration/value change, and time range in a compact status line.
- Reworked the top day/week meta rows into inspectors: left side now holds day+time or week+range, right side keeps progress percent, and the center shows the hovered/tapped timeline segment context.
- Refined header meta labels: day month uses the full month name, date/time are visually separated in the left block, and empty inspectors no longer show placeholder `DAY` / `WEEK` text.
- Matched day/week meta typography, removed dot separators between date/time and week/range, and widened the spacing between paired meta values.
- Changed timeline inspectors to use a colored dot for the source cell and white text for readability; unit events now show `previous->current` instead of `prev/week` wording.
- History day/week strips now render all cells enabled for History, while the top dashboard strips still require the per-cell Timeline flag.
- Removed the separate HISTORY event-log UI from this iteration; event history remains stored for undo/timeline work, but the table-based history expansion will be designed separately.
- Bumped app/export/cache version through `v1.33.19`.

### Parallel v2 Planning Re-Anchor

- Decision: keep the current root app stable for daily use instead of forcing every future idea through the existing 3x3/PIN interface.
- Added a plan for a separate `/v2/` GitHub Pages surface where Grid + Views are the starting architecture.
- Decision: v2 should use its own `trckng_v2_*` storage keys first, with one-way v1 import later, so experiments do not overwrite real v1 tracking data.

### v2 Privacy + Migration Planning

- Decision: planning docs must not preserve real private PIN contents, medication names, counts, budgets, work-hour totals, or exact private dates.
- Added `V2_DOCUMENTATION_RULES.md` so future agents can anonymize screenshots/scenarios and keep private details out of repo docs.
- Updated `V2_PRODUCT_SPEC.md` with latest v2 answers: v2 is an evolution of v1, all current module types are required, keep 3 PINs for now while allowing future variability, timeline must be able to include/exclude PINs, and sync remains private for the whole app.
- Clarified that the first major v2 capability is the correct larger movable modular field, preserving the current button/module logic while expanding beyond fixed 3x3.
- Clarified target character: personal art/instrument for working and feeling oriented in time, with possible future paid product direction, not generic corporate software.

### v2 Field / View Decisions

- Decision: start v2 with a 10x10 modular field per PIN.
- Decision: import old v1 `cell01..cell09` modules into a familiar 3x3 area inside the larger 10x10 field, with empty squares available around them.
- Decision: keep existing size presets first: `1x1`, `2x1`, `1x2`, and `2x2`; larger/free resize comes later.
- Decision: PINs remain fields/workspaces in the v2 MVP. Views are saved camera/filter/layout states inside PIN fields, not replacements for PINs at the start.
- Decision: v2 import creates a separate v2 dataset under the user's app/account storage and does not silently write back to v1 data.
- Decision: separate tracking from navigation/editing. TRACK taps/clicks should track; EDIT/NAV gestures should move, resize, pan, or select.
- Product note: phone navigation may need a bottom joystick/pad or explicit navigation mode; desktop may use an explicit NAV/EDIT mode, right-click, or modifier-drag.
- Timeline note: first timeline should be a simple scrollable strip with colored spans for timers/durations and point/callout events above/below the line, built only after event data is trustworthy.

### v2 Event Stopwatch Module Planning

- Decision: add `Event Stopwatch` as a v2-native module type: press/start, name the event, show elapsed time, add checkpoint/lap-style marks, stop, then archive/render on timeline.
- Product framing: this module covers abstract sequences such as transit, meeting, place change, festival/session markers, or creative/process milestones without hardcoding any private scenario.
- UX direction: Event Stopwatch should feel like a normal stopwatch inside a grid button; a separate Event mode or quick-capture overlay can be added later, but is not the base interaction.
- Data direction: start/end become colored timeline spans; checkpoints store elapsed time from start and delta from the previous checkpoint, then become points/callouts on the timeline.
- Decision: naming should not block capture. Event/checkpoint/segment labels can use defaults first and be edited later.
- Decision: segments are derived from neighboring boundaries (`start -> checkpoint -> checkpoint -> stop`) instead of stored as separate records in MVP.
- Media direction: optional camera snapshots or `128x128` thumbnails are a later, privacy-sensitive attachment layer. They should be opt-in and local-first by default.
- Documentation rule: do not record real routes, place names, private event sequences, faces, rooms, screens, or raw media in repo docs.
