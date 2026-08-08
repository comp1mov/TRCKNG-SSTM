# TRCKNG SSTM Time Grid

Working status: planning board for order, not a promise.

This file keeps the big ideas from collapsing into one impossible mega-task. It should be updated whenever we decide what is Now, Next, Later, or Parked.

## Rule

The app should stay usable after every phase.

## Now

These are active or near-active items that protect the current app while preparing the larger architecture.

| Item | Why now | Output |
| --- | --- | --- |
| Responsive Field Shell verification | The field must feel intentional on phone, laptop, and desktop before deeper editing | final CSS/UX adjustments |
| LAYOUT cleanup | LAYOUT is becoming the modular editor, so it must be trustworthy | visibility controls, empty/hidden clarity |
| Current docs consolidation | The roadmap is spreading across README, DEVELOPMENT_PLAN, PROJECT_LOG, and Desktop file | local planning docs in repo |
| Small UI notes batching | Testing creates many small observations that should not derail architecture | keep using `UI_CHANGE_NOTES.md` |

## Next

These should follow after current field/editor stability.

| Item | Why next | Output |
| --- | --- | --- |
| Cell Cycle Architecture | Daily/weekly/monthly/never reset is needed before richer timeline and Goal Time | cycle settings and projections |
| Shadow Event Log | Timeline needs real events, but we can start invisibly | event records parallel to current data |
| Timeline MVP | HISTORY should become the memory layer | timeline view with summary mode |
| Goal Time | Long-running time goals depend on cycle/event foundations | goal-time module or preset |

## Later

These are important, but they need stronger foundations first.

| Item | Dependency | Notes |
| --- | --- | --- |
| Saved Views instead of PINs | stronger module model, layout cleanup | migrate PINs gradually |
| Module presets and constructors | stable module schema | start with single-module presets |
| Salary / Money Meter | timer + formula + preset support | strong practical feature |
| IndexedDB event store | shadow event log proves shape | needed for large timeline |
| Infinite canvas | saved views and module schema | avoid premature rewrite |
| Privacy engine | before automation/location | design before sensitive tracking |
| Automation sources | privacy engine | location zones only opt-in |

## Parked

These are exciting, but should not pull attention from the core time system yet.

| Item | Why parked |
| --- | --- |
| Full event-level sync | snapshot sync is enough for now |
| Real-time collaboration | not aligned with personal local-first focus yet |
| Public preset marketplace | requires stable preset schema first |
| Full groovebox/sequencer | depends on module/event foundations |
| Web MIDI | browser support is limited and permission-heavy |
| Location tracking | privacy-sensitive, must wait for privacy engine |

## Draft Phase Map

### Phase 2D: Responsive Field Shell

Status: active / verification.

Goal:

- stable field width;
- stable row height;
- usable phone and desktop layout;
- quiet utility controls;
- clear view/PIN hierarchy.

Exit criteria:

- field does not balloon on desktop;
- cells remain readable on phone;
- PIN switcher placement feels settled;
- LAYOUT and TRACK share the same spatial logic.

### Phase 2C+: LAYOUT Cleanup

Status: next immediate implementation.

Goal:

- LAYOUT is the single editor surface;
- empty cells are understandable;
- hidden cells are recoverable;
- no duplicated old EDIT mental model.

Exit criteria:

- user can hide/show a module;
- user can create from an empty slot;
- TRACK remains calm;
- export/import/sync preserve visibility.

### Phase 2E: Cell Cycle Architecture

Status: planned.

Goal:

- module-level reset behavior;
- daily / weekly / monthly / never;
- current weekly behavior preserved.

Exit criteria:

- existing cells remain weekly by default;
- new cells can choose cycle;
- summaries respect cycle.

### Phase 2F: Header / Week / PIN Polish

Status: planned after behavior is stable.

Goal:

- improve hierarchy;
- clarify current day/week;
- avoid cosmetic churn before layout model settles.

### Phase 2G: Drag Reorder And Resize Handles

Status: planned.

Goal:

- direct manipulation in LAYOUT;
- reduce reliance on UP/DOWN buttons;
- keep keyboard/button fallback.

### Phase 3A: Shadow Event Log

Status: strategic bridge.

Goal:

- record core interactions as events while current storage remains source of visible truth.

Exit criteria:

- events exported/imported;
- basic validation against current totals;
- no UI regression.

### Phase 3B: Timeline MVP

Status: strategic.

Goal:

- HISTORY becomes a timeline-first review mode.

Exit criteria:

- daily/weekly event list;
- module filters;
- old summary still accessible.

### Phase 4: Saved Views

Status: future.

Goal:

- evolve PINs into saved views over shared modules/world.

### Phase 5: Presets And Constructors

Status: future.

Goal:

- make useful systems easy to create.

### Phase 6: Privacy And Automation

Status: future.

Goal:

- build privacy controls before any deep automatic tracking.

### Phase 7: Sequencer / Groovebox

Status: future creative branch.

Goal:

- modules emit sound/light/trigger events;
- performance can be recorded into timeline.

## Planning Lanes

Use these lanes when adding new ideas:

| Lane | Meaning |
| --- | --- |
| Core architecture | storage, modules, timeline, views |
| Daily UX | current use, layout, controls, mobile |
| Data and sync | export, import, Supabase, IndexedDB |
| Presets | reusable module/scenario setups |
| Automation | location, activity, calendar, imports |
| Creative mode | audio, pulse, sequencer, groovebox |
| Privacy | local-only, redaction, encryption, permissions |
| Research | analog products, implementation options |

## Decision Log

| Date | Decision |
| --- | --- |
| 2026-08-09 | Keep global strategy docs local in the repository first. Do not publish or push without explicit instruction. |
| 2026-08-09 | Treat HISTORY as future event timeline, not only weekly table. |
| 2026-08-09 | Treat PINs as a bridge toward saved views over a shared modular world. |
| 2026-08-09 | Treat sequencer/groovebox as future branch on top of module/event primitives, not immediate rewrite target. |

## Next Discussion Prompts

- What did testing expose as painful in the current UI?
- Which is more urgent: LAYOUT cleanup or cycle architecture?
- Should the first timeline be visual lanes or a structured event list?
- Which preset would prove the module system best: Salary Meter, Goal Time, Sleep, or Show Schedule?
- What data should never leave the device?
