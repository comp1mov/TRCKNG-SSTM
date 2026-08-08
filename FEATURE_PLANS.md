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

## 2. Shadow Event Log

Status: prerequisite for Timeline History.

Problem:

The current app stores current and weekly values, but not the history of changes that produced them.

Concept:

Start recording events behind the scenes while keeping all current behavior and storage intact.

MVP:

- Record `counter.increment`, `counter.decrement`.
- Record `timer.start`, `timer.pause`, `timer.reset`.
- Record `value.set`.
- Record `cell.edit`.
- Include event export/import.
- Add a small debug validator that compares derived totals to current weekly values.

Later:

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

## 3. Saved Views Instead Of PINs

Status: medium-term architecture.

Problem:

PINs are currently separate pages/workspaces. That is simple, but it limits the future infinite grid model and duplicates data boundaries.

Concept:

PINs become saved views over a shared world. Each view decides what modules are visible and how the grid/timeline is framed.

MVP:

- Keep current 3 PIN buttons.
- Internally add `views`.
- Map each PIN to one view.
- Save view name, color, visible module ids, and layout scope.

Later:

- More than 3 views.
- View browser.
- View templates.
- View-specific timeline filters.
- Presentation/work mode per view.

Data model impact:

- Add `views` collection.
- Decouple modules from PIN-specific storage.

UI impact:

- PIN switcher may become a view switcher.
- LAYOUT edits must clarify whether they affect view layout or module itself.

Risks:

- Migration complexity from `_pin0`, `_pin1`, `_pin2`.
- User confusion if modules appear in multiple views.

Open questions:

- Can the same module appear in multiple views with different size/position?
- Should view layout override module position, or should position be global?

## 4. Infinite Modular Grid

Status: future architecture after saved views.

Problem:

The current 3-column field cannot support large modular dashboards, node-like workflows, or spatial thinking.

Concept:

Create a large grid/canvas where modules can be positioned freely, zoomed, panned, grouped, connected, and viewed through saved windows.

MVP:

- Expand current CSS grid model to support more rows.
- Add drag reorder and resize handles.
- Add hidden/visible modules.
- Add view-specific filters.

Later:

- Real pan/zoom canvas.
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
