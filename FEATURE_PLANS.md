# TRCKNG SSTM Feature Plans

Working status: living feature bank.

This document breaks large ideas into implementable feature plans. It should stay practical: every feature should have an MVP, a later version, data impact, UX impact, risks, and open questions.

## Feature Plan Template

```text
Feature:
Status:
Problem:
Concept:
MVP:
Later:
Data model impact:
UI impact:
Risks:
Open questions:
```

## 1. Timeline History

Status: strategic next foundation after LAYOUT stabilization.

Problem:

Current HISTORY is mostly a weekly table. It helps review totals, but it does not show the actual sequence of actions, sessions, overlaps, edits, or life/work rhythms.

Concept:

Replace HISTORY with a timeline-first review surface. Weekly summaries become one projection, not the whole history.

MVP:

- Record basic events in parallel with current storage.
- Show a daily/weekly list grouped by module.
- Keep current table as `Summary`.
- Add filters by module and event type.
- Include timer start/stop spans and counter/value changes.

Later:

- Timeline lanes by module.
- Zoom modes: hour, day, week, month.
- Overlay modules: sleep over work, emotions over location, project over money.
- Timeline search.
- Event correction/editing.
- Derived charts.
- Export to Markdown/CSV/JSON.

Data model impact:

- Add event ids.
- Add module ids as stable references.
- Add time range fields.
- Move to IndexedDB once events become large.

UI impact:

- HISTORY becomes TIMELINE or HISTORY/TIMELINE hybrid.
- Needs range controls, filters, zoom, and module lanes.

Risks:

- Too much UI density on phone.
- Event log can become heavy.
- Editing historical events requires careful rules.

Open questions:

- Should old weekly values be backfilled into approximate events?
- Should timeline start invisible as a debug panel first?
- What event types are required for v1?

### Current v1 Direction After v1.33.20

Recent implementation changed the order of work:

```text
Orientation strips first -> table-integrated event details -> generic Event Layer -> full timeline review.
```

Decisions:

- The top day/week strips are an orientation layer, not the full history UI.
- The top strips use per-cell `Timeline` by default.
- DASH `All data` can temporarily show all `History`-visible events on the top strips.
- HISTORY strips show `History`-visible events regardless of the per-cell `Timeline` flag.
- The separate standalone event list is not the right primary UI yet.
- Event details should be integrated into the weekly History table through expandable rows/cells.

Next MVP:

- Add expandable History rows or cells.
- Keep weekly totals visible.
- On expand, show event details for that week/cell.
- Include Unit/Counter changes, undo status, Value/Money changes, and Span/Sleep sessions.
- Keep current `weekData` table authoritative until event projections are proven.
- Use existing `counterChangeLog` and `durationSessions` as the first event sources.

Later:

- Add filters for event type, PIN, cell, and date range.
- Add event-derived summaries beside legacy weekly values.
- Add correction/editing tools.
- Move to a generic Event Layer once projection logic is trustworthy.

## 1A. Orientation Strips / Mini Timeline

Status: design and architecture layer for v2, building on the current day/week progress strips.

Problem:

The full timeline is useful for review, but the user also needs fast orientation while actively tracking. The current top strips already show day/week progress, time, and sunrise/sunset. They can become much more informative without becoming a heavy dashboard.

Concept:

Upgrade the top day/week strips into a compact live orientation layer.

```text
Full timeline = deep review.
Orientation strips = compressed live signal.
```

MVP:

- Keep day and week strips visible and simple.
- Preserve current time/day/week percent.
- Preserve or improve sunrise/sunset/day-phase markers.
- Add a data model hook so strips can receive timeline/event projections.
- Add a per-module setting: show/hide this module in orientation strips.
- Use the module's color as the default strip color.
- Show selected timers, sleep/work/session spans, or Event Stopwatch spans as subtle colored marks.
- Show checkpoint/event ticks only when they remain readable.
- Start with the week strip as the most useful planning/analysis band.
- Keep strips visually aligned with the field width.

Later:

- Expand/collapse into a richer mini-dashboard.
- Dedicated orientation dashboard settings.
- PIN filters inside the strips.
- Per-module strip display style: span, point, density, deadline marker.
- Per-module strip color/contrast override.
- Deadline pressure markers.
- Sleep/work/session mini bands.
- Activity density / heat hints.
- Artistic waveform-like or sequencer-like rendering.
- More detailed hover/tap inspection.

Data impact:

- Orientation strips should read derived timeline/event projections, not invent separate storage.
- Need lightweight daily/weekly projection helpers.
- Need module flag such as `showInOrientationStrips`.
- Need module strip display metadata later: `stripStyle`, `stripPriority`, `stripColorOverride`.
- Need a clear priority system so too many events do not make the strips unreadable.
- Collapsed and expanded modes can use the same data with different density thresholds.

UI impact:

- The strips become useful instrumentation, not decoration.
- Collapsed state stays thin.
- Collapsed state shows only essential colored marks.
- Expanded state can become a mini dashboard with more labels, bands, and settings.
- The dashboard should state its date/range and active source/filter, such as active PINs or selected modules.
- Must not compete with the main tracking field.

Risks:

- Too much information can become visual noise.
- If strip data is inaccurate, it damages trust.
- Over-polishing strips before event data exists can waste time.

Open questions:

- Which first signal belongs in the strip: sleep/work spans, active timers, Event Stopwatch, or deadlines?
- Should strip marks be per active PIN only or all selected PINs?
- Should expanded mini-dashboard open from day strip, week strip, or a separate button?
- Should the first implementation draw only the week strip, then later the day strip?
- Which module types render as spans vs points by default?
- How artistic can the strip become while staying readable?

### Current v1 Orientation Strip State

Implemented:

- Day and week strips render progress, dividers, current-time marker, sun markers, span blocks, and counter/unit markers.
- Hover/tap/focus updates the row inspector.
- Inspector uses a colored source dot plus white text.
- Per-cell `Timeline` controls top-strip visibility.
- DASH `All pins` controls PIN scope.
- DASH `All data` makes the top strips use `History` visibility instead of `Timeline` visibility.
- HISTORY strips use `History` visibility by default.

Next polish:

- Test density on phone with `All data` enabled.
- Decide whether inspector should stick after touch.
- Add clearer visual state when `All data` is enabled.
- Consider density limiting if all events make the strips too noisy.

## 2. Event Layer

Status: prerequisite for Timeline History.

Problem:

The current app stores current and weekly values, but not the history of changes that produced them.

Concept:

Start recording events behind the scenes while keeping all current behavior and storage intact.

MVP:

- Add a generic `eventLog` storage layer while keeping current state authoritative.
- Double-write existing Unit/Counter, Money, and Value changes from `recordCounterChange()`.
- Record undo as a compensating event instead of deleting or hiding the original event.
- Add debug projection to compare event-derived current-week values with legacy `weekData`.
- Include event export/import.
- Keep the visual UI unchanged until the event records are trustworthy.

Later:

- Record `timer.start`, `timer.pause`, `timer.reset`.
- Record `duration.start`, `duration.stop`.
- Record all layout changes.
- Record sync/import/reset events.
- Record formula recalculations.
- Record manual correction events.

Data model impact:

- New event collection.
- Eventually IndexedDB.

UI impact:

- No major UI at first.
- Optional debug panel only.

Risks:

- Double-writing bugs.
- Event duplication during import/cloud load.
- Device clock inaccuracies.

Open questions:

- Should events use wall-clock time only, or also monotonic session time?
- How much metadata is useful before it becomes noisy?

## 2A. Event Stopwatch Module

Status: important v2-native module after the Event Layer shape is clear.

Problem:

Counters and timers track quantities, but the user also needs a general way to start an event, name it, let time run, and add marks inside that event.

Concept:

Add an `Event Stopwatch` module.

It should feel simple:

```text
press -> optional name/default -> stopwatch runs -> add marks/checkpoints -> stop
```

Timeline rendering is a projection of that data, not the primary interaction.

MVP:

- Create an Event Stopwatch module type in v2 schema.
- On start, optionally ask for an event name with a fast default option.
- Allow the event name to be edited later.
- Show elapsed time inside the module while the event is active.
- Add checkpoint marks while the event is active.
- Store checkpoint time since event start.
- Store checkpoint delta from previous checkpoint.
- Derive segments from start/checkpoint/checkpoint/stop boundaries.
- Allow segment/checkpoint labels to be edited later.
- Allow optional checkpoint label/category later.
- Render finished event as a colored span on timeline.
- Render checkpoints as ticks/callouts on timeline.
- Later render internal segments between checkpoints.
- Show simple event archive/detail from the module.
- Keep it usable from the normal TRACK field so the user does not constantly switch modes.

Later:

- Separate Event mode or global quick-capture overlay.
- Reusable event category sets.
- Route/process templates.
- Media attachments.
- Low-resolution camera snapshots around `128x128`.
- Front/back/both-camera capture when supported.
- Pixel-grid thumbnail rendering inside timeline or module archive.

Data impact:

- Add event types for session start/end and checkpoint add.
- Store `sessionId` or `groupId` so checkpoint events attach to the parent session.
- Store event name, start time, end time, elapsed duration, checkpoint elapsed time, checkpoint delta time, category, label, note, color, and source.
- Derive segment ranges from ordered checkpoints instead of requiring separate segment records in MVP.
- Media should be stored as attachment refs, not large inline event blobs.
- Media storage likely belongs in IndexedDB before sync is considered.

UI impact:

- Module tile needs active/inactive states.
- Active session should show elapsed time and current title.
- A secondary action should add a checkpoint without stopping the session.
- The timeline needs a parent span plus checkpoint ticks; later it can show segment coloring/names between ticks.
- Phone UI must avoid accidental stop/start while moving through the field.

Risks:

- Too much typing can make quick capture useless.
- Event labels and snapshots are privacy-sensitive.
- Camera permissions and browser support may be uneven.
- Media sync can become heavy and risky.
- Interaction can conflict with normal counters if modes are unclear.

Open questions:

- What is the fastest name-entry flow when starting an event?
- Should unnamed events auto-use a timestamp/default name?
- Where should the checkpoint button live inside an active module?
- Should checkpoint labels be optional, quick categories, free text, or all three?
- Should segment names be edited only after the event, or also during the event?
- Should a session auto-stop when another event session starts?
- Should Event Stopwatch be per-PIN, global, or allowed to appear in multiple PIN timelines?
- Should snapshots be local-only by default even when normal events sync?
- Should separate Event mode exist later, or is the grid module enough for v2 beta?

## 3. Saved Views Inside PIN Fields

Status: medium-term architecture.

Problem:

PINs are currently separate pages/workspaces. That is simple and useful, but each PIN is trapped in a small fixed cell surface.

Concept:

PINs remain fields/workspaces in the first v2 model. Views become saved perspectives inside those PIN fields.

Each view can decide:

- camera/zoom/field position;
- visible module subset;
- timeline filters;
- maybe view-specific layout overrides later.

A single shared world can be reconsidered later, but it should not replace the PIN mental model before v2 is usable.

MVP:

- Keep current 3 PIN buttons.
- Internally add `views`.
- Give each PIN field at least one default view.
- Save view name, color, visible module ids, camera/zoom placeholder, and timeline filter scope.

Later:

- More than 3 views.
- View browser.
- View templates.
- View-specific timeline filters.
- Presentation/work mode per view.

Data model impact:

- Add `views` collection.
- Add `pinId` to modules and views.
- Decouple rendering from fixed `cell01..cell09` slots without forcing all PINs into one shared field.

UI impact:

- PIN switcher remains field/workspace navigation.
- View switcher appears inside or near the active PIN field.
- LAYOUT edits must clarify whether they affect view layout or module itself.

Risks:

- Migration complexity from `_pin0`, `_pin1`, `_pin2`.
- User confusion if modules appear in multiple views.

Open questions:

- Can the same module appear in multiple views with different size/position?
- Should view layout override module position, or should position be global?
- When should a shared cross-PIN world be reconsidered?

## 4. Modular Field / Grid

Status: active primary direction, with full infinite canvas deferred.

Problem:

The current 3-column field cannot support large modular dashboards, node-like workflows, or spatial thinking.

Concept:

Create a modular field where modules can be positioned, resized, grouped, connected, and viewed through saved windows. The near-term implementation can stay CSS Grid based; full pan/zoom infinite canvas comes later.

MVP:

- Start v2 as a 10x10 modular field per PIN.
- Import old v1 3x3 cells into a familiar area inside that larger field.
- Keep current size presets first: `1x1`, `2x1`, `1x2`, `2x2`.
- Add drag reorder and resize handles.
- Add hidden/visible modules.
- Add view-specific filters.
- Keep tracking actions separate from edit/navigation gestures.

Later:

- Real pan/zoom canvas.
- Field expansion beyond 10x10.
- Minimap.
- Group frames.
- Connection lines.
- Lasso selection.
- Keyboard shortcuts.
- Module browser palette.

Implementation options:

- Continue custom CSS grid for near-term.
- Later evaluate React Flow or tldraw if the project moves to a framework.
- For the current static app, avoid pulling in a full app framework too early.

Data model impact:

- More robust layout objects.
- Possibly global coordinates instead of row/col only.

UI impact:

- Needs edit mode distinction: use vs arrange vs wire.

Risks:

- Big rewrite temptation.
- Mobile pan/zoom gestures can fight normal scrolling.

Open questions:

- How long can CSS grid carry us before a canvas library is worth it?
- Should wiring be visual only at first, or functional?

## 5. Module Presets And Constructors

Status: important after layout cleanup.

Problem:

Creating useful setups from raw cells is slow. The user should be able to create meaningful systems quickly.

Concept:

Provide reusable presets and compound constructors that install one or more configured modules.

MVP:

- Preset picker in LAYOUT.
- Single-module presets: timer, counter, currency converter, budget, LED pulse.
- Store presets as JSON objects.
- Allow duplicate/apply preset to empty cell.

Later:

- Compound presets: salary meter, show schedule, sleep tracker, project tracker.
- User-created presets.
- Import/export preset packs.
- Preset marketplace/library only much later.

Data model impact:

- Add preset schema.
- Add module creation from preset.

UI impact:

- LAYOUT needs module browser/palette.
- Empty cells should invite choosing a preset.

Risks:

- Too many presets can clutter the UI.
- Presets can hide how modules work.

Open questions:

- Should presets be grouped by domain or module type?
- Should user presets include visual style?

## 6. Cell Cycle Architecture

Status: next planned architecture feature after LAYOUT cleanup.

Problem:

Current weekly model is too narrow. Some modules reset daily, some weekly, some monthly, and some never reset.

Concept:

Each module owns its cycle behavior.

MVP:

- Add `cycleType`: daily, weekly, monthly, never.
- Add cycle-aware summaries.
- Keep weekly default for existing cells.
- Do not break current weekly history.

Later:

- Custom cycles.
- Per-module timezone.
- Manual cycle closing/review.
- Carryover rules.
- Goal period templates.

Data model impact:

- Cell/module settings need cycle config.
- Event projections need cycle boundaries.

UI impact:

- Cell editor needs cycle section.
- History/timeline needs cycle filters.

Risks:

- Complex migration.
- Hard to explain without clutter.

Open questions:

- Should cycle be available for all module types?
- What happens when a module changes cycle type mid-history?

## 7. Goal Time

Status: planned after cycle architecture is stable.

Problem:

Some time goals are long-term and should not reset weekly.

Concept:

A long-running time module for targets like "10k hours", deep work totals, practice hours, or project accumulation.

MVP:

- `targetTotalSeconds`.
- `totalSpentSeconds`.
- Start/stop session.
- Display spent/remaining.
- Quick add: +15m, +30m, +1h.

Later:

- Progress bar.
- Timeline sessions.
- Milestones.
- Burn-up charts.
- Multiple goals per module.

Data model impact:

- Needs never-reset cycle.
- Should record sessions as timeline events.

UI impact:

- Needs explicit in-cell controls.

Risks:

- Overloaded tap behavior.
- Timer state recovery across reloads.

Open questions:

- Should Goal Time be a separate type or a timer preset?

## 8. Salary / Money Meter

Status: strong preset candidate.

Problem:

Money and work time can be tracked together, but raw math cells make this cumbersome.

Concept:

A compound preset that calculates live earnings from work time and rate settings.

MVP:

- Input hourly or monthly rate.
- Work timer.
- Live gross earned.
- Optional deduction percent.
- Net estimate.

Later:

- Tax brackets.
- Multiple clients/projects.
- Invoice export.
- Currency conversion.
- Budget allocation graph.

Data model impact:

- Links between timer and formula modules.
- Money events and derived projections.

UI impact:

- Preset wizard likely better than raw cell modal.

Risks:

- Financial calculations can imply accuracy.
- Need clear "estimate" language.

Open questions:

- Which countries/currencies matter first?
- Should monthly salary convert using workdays/hours assumptions?

## 9. Privacy Engine

Status: strategic requirement before deep automation.

Problem:

Future features may track sensitive personal data: mood, work, location, sleep, relationships, money.

Concept:

Make privacy visible and configurable from the architecture level.

MVP:

- Add off-record mode.
- Add per-module privacy level.
- Add local-only module option.
- Redact private modules from export.

Later:

- Encrypted local archive.
- Encrypted cloud snapshot.
- Auto-delete rules.
- Privacy report.
- Location precision reduction.

Data model impact:

- Add `privacyLevel` to modules and events.
- Export/import must respect privacy modes.

UI impact:

- Privacy controls in module editor and account/settings.

Risks:

- Security promises must be honest.
- Encryption adds complexity.

Open questions:

- Should default be `private` or `normal`?
- Should cloud sync skip `local` modules entirely?

## 10. Automation Sources And Location Zones

Status: future, gated by privacy engine.

Problem:

Manual tracking is powerful but easy to forget.

Concept:

Allow optional sources to create timeline events automatically.

MVP:

- None until privacy controls exist.

Later:

- Location zones: home, studio, gym, commute.
- Manual zone boundaries.
- Browser/device activity import.
- Calendar import.
- Desktop helper app only if browser limits block useful workflows.

Data model impact:

- Event source metadata.
- Permission status metadata.

UI impact:

- Permission dashboard.
- Source setup wizard.

Risks:

- Location data is highly sensitive.
- Browser permissions are inconsistent.
- False positives can damage trust.

Open questions:

- Should location ever sync?
- Should raw GPS be stored, or only zone enter/exit events?

## 11. Sequencer / Groovebox

Status: future creative mode.

Problem:

The module grid can become expressive, not only analytical. Timers, counters, LEDs, and empty pads can become rhythmic controls.

Concept:

Modules can emit sound/light/trigger events. A clock drives patterns. Performance can be recorded into the timeline.

MVP:

- Web Audio click/tone per module.
- LED pulse module as visual metronome.
- Clock module with BPM.
- Mute sound globally.
- Record sound-trigger events.

Later:

- Pattern lanes.
- Step sequencer.
- Euclidean rhythms.
- Parameter locks.
- MIDI output where supported.
- Groove/swing.
- Scene launch.

Data model impact:

- Add sonic parameters to modules.
- Add pattern events.
- Add clock state.

UI impact:

- Needs a dedicated GROOVEBOX view or mode.
- Needs performance-safe controls.

Risks:

- Mobile browser audio restrictions.
- Audio scheduling precision.
- Scope could pull project away from tracking foundation.

Open questions:

- Is sequencer a separate view, a module family, or both?
- Should sounds be generated or sample-based first?

## 12. IndexedDB Event Store

Status: architecture migration candidate after event log MVP.

Problem:

localStorage is not suitable for large histories or efficient timeline queries.

Concept:

Move events and eventually world data into IndexedDB while keeping localStorage as a compatibility adapter during transition.

MVP:

- Store events in IndexedDB.
- Query by time range and module id.
- Export events to JSON.
- Keep settings in localStorage.

Later:

- Store modules, views, presets in IndexedDB.
- Add schema migrations.
- Add compaction/snapshotting.
- Add event sync strategy.

Data model impact:

- New storage abstraction.
- Versioned migrations.

UI impact:

- Ideally invisible.
- Add backup/export warnings if storage unavailable.

Risks:

- IndexedDB API complexity.
- Migration bugs.
- Browser storage eviction.

Open questions:

- Should we use a tiny wrapper library later, or write minimal native helpers?
- When do we outgrow snapshot sync?

## 13. LAYOUT Cleanup

Status: immediate near-term work.

Problem:

LAYOUT is now the correct editing surface, but it still needs clarity around empty cells, hidden cells, visibility, and avoiding old edit duplication.

Concept:

Make LAYOUT feel like editing the same modular field, not a separate settings page.

MVP:

- Add visibility controls.
- Clarify empty cells.
- Make hidden cells recoverable.
- Keep TRACK quiet.
- Remove/deprecate leftover old edit paths.

Later:

- Drag reorder.
- Resize handles.
- Module browser.
- Multi-select.
- View-specific layout controls.

Data model impact:

- `visible` needs clear semantics.
- Hidden vs empty vs archived modules must be distinct.

UI impact:

- LAYOUT tiles need better state language.

Risks:

- Too many controls on tiny tiles.

Open questions:

- Should empty cells count as modules or slots?
- Should hidden modules still appear in timeline?

## 14. History Matrix

Status: next v1 History feature after timeline correction and week navigation.

Problem:

HISTORY now has useful raw ingredients: weekly totals, duration sessions, counter change events, correction tools, selected-week navigation, and landscape timeline strips. But the user still needs a clear way to compare many tracked cells across time without reading a long table or a disconnected event log.

Concept:

Create a time-first matrix inside `HISTORY`.

```text
columns = time
rows = tracked cells
cells = what happened in that time bucket
timeline = visual detail for the same selected range
```

The matrix should answer simple review questions quickly:

- What happened this week?
- Which days have missing or suspicious data?
- Which timers/sleep sessions need correction?
- Which counters moved on which day?
- What is the total for this visible range?

MVP:

- Start with week view.
- Columns: `MON`, `TUE`, `WED`, `THU`, `FRI`, `SAT`, `SUN`, `TOTAL`.
- Rows: current PIN cells that are enabled for `History`.
- Duration rows: daily duration derived from `durationSessions`.
- Sleep rows: daily sleep duration, using the same duration-session model.
- Counter/unit rows: daily event buckets from `counterChangeLog`.
- Value/money rows: daily changes when event data exists; otherwise weekly fallback only.
- Use `historyTimelineWeekKey` so matrix, weekly table selection, and timeline navigation share one selected week.
- Tap/hover a matrix cell to focus that cell/day in the timeline inspector.
- Tap a duration cell to enter correction for that day/cell.
- Add simple filters: `ALL`, `TIME`, `COUNTS`, `ACTIVE`.
- Keep legacy weekly table available as a fallback while Matrix is being proven.

Data rules:

- Matrix is a projection, not a new source of truth.
- Do not invent day-level data from old weekly-only totals.
- If old data lacks event/session detail, show it as a weekly total/fallback state.
- Preserve historical label snapshots where available.
- Renaming a button keeps the same slot identity; Matrix should still understand old events as belonging to the same slot.

UI direction:

- Portrait phone: horizontal scroll is acceptable; rows must stay readable.
- Landscape phone: timeline remains large; matrix becomes the structured drilldown underneath or alongside it.
- Desktop: matrix can be denser, with row totals and quick filters visible.
- Matrix cells should be compact and tappable, not text-heavy.
- Use color from the source cell/module, but do not rely on color alone.

Later:

- Add month view with columns as weeks first, then optional day-level zoom.
- Add day view with columns as hours/time blocks.
- Add visible-range totals for day/week/month.
- Add row grouping by cell type, active status, or PIN.
- Add expandable cell/day detail panels.
- Add event corrections for counter/value changes after duration correction is stable.
- Add saved History views after filters become useful.

Risks:

- Old data may not have enough detail for accurate daily cells.
- Too many rows can make phone review cramped.
- A matrix can become spreadsheet-like if it tries to edit every kind of data directly.
- Event projection bugs would damage trust, so projection helpers should be tested before adding richer UI.

Open questions:

- Should the first matrix replace the table visually, or live behind a `MATRIX` switch?
- Should totals show raw value, delta, duration, or all depending on module type?
- Should inactive/empty/hidden cells be filterable from the start or later?
- Should month mode group by calendar month or rolling 4/5-week range?
