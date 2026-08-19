# TRCKNG SSTM Global Strategy

Working status: living strategy draft.

This document captures the larger product direction beyond the current v1.32.x habit grid. It is intentionally local to the repository first. Publishing, pushing, or turning this into public-facing material is a separate decision.

## North Star

TRCKNG SSTM should become a local-first modular time system:

- an infinite modular grid where modules can be placed, connected, grouped, and reused;
- a detailed timeline that records what happened inside modules over time;
- saved views that show different windows into PIN fields and, later, possibly a larger shared world;
- presets and constructors for common personal, creative, work, money, and timing scenarios;
- privacy-first storage, with cloud sync as an optional layer rather than the source of truth;
- eventually, a sequencer/groovebox mode where modules can emit sound, light, pulse, and rhythmic triggers.

Short version:

```text
Modules live on the grid.
Events live in time.
Views show useful slices of both.
```

## Product Shift

The current app is a local-first tracking field with:

- 3 PIN workspaces;
- 9 configurable cells per PIN;
- TRACK / LAYOUT / HISTORY views;
- localStorage persistence;
- optional Supabase snapshot sync;
- early `cells` and `cellLayout` adapters.

The bigger direction reframes those pieces:

| Current concept | Future concept |
| --- | --- |
| PIN page | PIN field / workspace |
| Saved view | Camera/filter/layout state inside a PIN field |
| Cell | Module instance |
| Cell type | Module type |
| Cell layout | Position and size on a modular field |
| HISTORY table | Event timeline and projections |
| Weekly values | Derived summaries from timeline events |
| Export/import snapshot | Portable world graph and event archive |
| Supabase snapshot | Optional private sync backup |

## Core Layers

Two layers are equally important and should evolve in parallel:

```text
Field / Grid = where modules live and connect.
History / Timeline = where module actions and time events are remembered.
Views = saved perspectives that combine a field window with timeline filters.
Orientation Strips = compressed live projections of day/week/event state.
```

The field is not a late feature. The current responsive field and LAYOUT editor are already the first version of the future modular grid. What should be deferred is only the full infinite-canvas jump: pan/zoom, minimap, node wires, and Miro-like spatial scale.

### 1. World / Grid

The world is the top-level container. In the v2 MVP, it contains three PIN fields. Each PIN field is a larger modular grid, starting as 10x10.

Later, those PIN fields may become windows into one larger shared world, but v2 should not force that abstraction before the current PIN workflow is preserved.

The field may start as a bounded CSS grid, but the model should not assume only 3x3 or one page.

The grid stores:

- modules;
- positions;
- sizes;
- groups;
- links;
- visual labels;
- saved views;
- presets applied to the world.

Inspirations:

- Miro-style infinite canvas and saved workspaces;
- ComfyUI-style portable graph JSON;
- TouchOSC-style modular control surfaces.

### 2. Modules

A module is an entity with behavior. It can be visual, logical, temporal, financial, sonic, or a combination.

Early module families:

- Counter: unit count, decrement/increment, target count.
- Span / Duration: start-stop time blocks such as MM:SS, MIN, SEC, Sleep, commute, work session, route, or practice interval.
- Alarm / Countdown: notification-oriented timers that count down to an alert rather than recording a primary timeline span.
- Goal Time: long-running accumulation over many span/duration sessions.
- Value: manual number entry, formatted value, note-like data.
- Money: income, budget, salary meter, tax/deduction chain.
- Formula: math between module outputs.
- Converter: currency, units, frame rates, time formats.
- Pulse: LED pulse, metronome, beat indicator.
- Event Stopwatch: named event stopwatch, elapsed time, checkpoints inside a process.
- Label: section text, separators, visual markers.
- Scenario: compound module that installs a small graph of other modules.

Span / Duration should become one conceptual module family. The current `MM:SS`, `MIN`, `SEC`, and `SLEEP` buttons are mostly different display modes or presets over the same primitive: a time span with `startedAt`, `endedAt`, elapsed seconds, color, label, and optional summary rules. Sleep can remain a specialized preset with sleep-specific display modes, but its data shape should stay compatible with generic span events.

This distinction keeps terminology clear:

```text
Span / Duration = records time that happened and renders as a timeline block.
Alarm / Countdown = reminds or alerts; it may emit events, but it is not primarily the measured activity.
Unit / Counter = records points or count changes; it can later choose point or short-span rendering in strips.
```

Important distinction:

```text
Module type = reusable behavior definition.
Module instance = one configured object on the user's grid.
Preset = saved module or group configuration.
View = saved camera/filter/layout state over the world.
```

### 3. Event Timeline

History should become a timeline, not just a weekly summary table.

Every important change should be recorded as an event:

```text
event {
  id,
  moduleId,
  type,
  startedAt,
  endedAt,
  valueBefore,
  valueAfter,
  delta,
  source,
  tags,
  privacyLevel,
  deviceId,
  revision
}
```

Examples:

- counter incremented;
- timer started;
- timer paused;
- event stopwatch started;
- event stopwatch checkpoint added;
- event stopwatch ended;
- manual value changed;
- formula recalculated;
- module created;
- module moved;
- preset applied;
- cloud snapshot loaded;
- conflict resolved;
- future location zone entered;
- future automation source detected.

Then weekly totals, daily summaries, work sessions, sleep overlays, money summaries, and project reports become projections derived from events.

Event Stopwatch modules add another timeline primitive:

```text
button = a named stopwatch event in the grid
span = the same event rendered over time
checkpoint = a meaningful mark inside the running event
attachment = optional note/media connected to the moment
```

This supports abstract sequences such as transit -> meeting -> second place -> return, or creative/process milestones during a larger session.

This gives the system rewind, auditability, richer statistics, and safer sync conflict handling.

### 4. Orientation Strips

The day/week strips are a compressed live surface for orientation.

They are not the full timeline. They are a mini projection that can show enough temporal signal to keep the user oriented while tracking.

Possible strip content:

- day/week progress;
- sunrise/sunset/day phase;
- module opt-in marks;
- active module spans;
- Event Stopwatch spans/checkpoints;
- deadline markers;
- sleep/work/session blocks;
- simple activity density hints.

The strips should feel like an electronic instrument display: useful, compact, and visually alive, without becoming generic analytics UI.

The first practical rule is selectivity: modules should choose whether they appear in the strips. Collapsed strips show a reduced signal; expanded strips can reveal more detail and settings.

### 5. Views

A view is a saved perspective on the world.

It can store:

- viewport position;
- zoom;
- visible module ids or filters;
- timeline range;
- layers;
- sort mode;
- presentation density;
- active tools;
- privacy redaction mode.

Examples:

- HEALTH;
- WORK;
- MONEY;
- SHOW CONTROL;
- SLEEP;
- TODAY;
- WEEK REVIEW;
- GROOVEBOX;
- DEBUG / DATA.

Current PINs can evolve into the first saved views.

### 5. Presets And Constructors

Presets should let the user create useful systems quickly without wiring every detail by hand.

Examples:

- Currency converter.
- Salary meter: hourly/monthly salary, live income ticking while timer runs.
- Budget meter with deductions.
- Sleep tracker.
- Project work tracker.
- Vitamins / pills tracker.
- Show schedule timeline.
- Pomodoro / interval set.
- Goal Time: 10k hours style tracker.
- Groove pulse pad.

Presets should be stored as portable JSON:

```text
preset {
  id,
  name,
  version,
  modules,
  links,
  layout,
  defaultView,
  requiredCapabilities
}
```

### 6. Privacy Engine

Because the system may eventually track sensitive time, work, location, mood, and behavior, privacy cannot be an afterthought.

Default stance:

- local-first;
- no automatic external sending;
- cloud optional;
- automation opt-in;
- location opt-in and scoped;
- export/delete controls;
- private/off-record mode;
- per-module privacy level;
- redacted exports.

Future privacy levels:

- `local`: never sync;
- `private`: sync only in encrypted/private snapshot;
- `normal`: sync in regular snapshot;
- `shareable`: allowed in public/export/report views;
- `ephemeral`: visible now, not stored long-term.

### 7. Storage And Sync

The current `localStorage` snapshot approach is useful for v1.x, but a real timeline will need a stronger storage layer.

Likely direction:

- keep current localStorage keys during transition;
- add an Event Layer that records actions alongside current state;
- move heavy structured data to IndexedDB;
- keep export/import as JSON;
- keep Supabase as optional snapshot sync until a better event sync model is justified.

IndexedDB is a better fit for:

- large event timelines;
- range queries by time;
- module/event indexes;
- offline-first local data;
- future media or large payloads.

### 8. Sequencer / Groovebox

The sequencer idea should be treated as a future mode built on the same primitives.

Core concept:

- modules can emit events;
- events can emit sound, pulse, light, MIDI, or state changes;
- clocks and triggers can drive other modules;
- timeline can record performance;
- grid can become an instrument surface.

Relevant references:

- Ableton Session View: non-linear launch surface plus arrangement recording.
- Bitwig Grid: modular sound/logic patching.
- VCV Rack: modular signal routing and patch cables.
- TidalCycles / Strudel: pattern language, polyrhythm, Euclidean rhythms.
- Elektron parameter locks: per-step parameter snapshots.

Possible TRCKNG interpretation:

- counter tap emits a quiet click or tone;
- LED module produces BPM pulses;
- empty pads can become mute/blank/trig buttons;
- timer state can drive sound;
- "work session started" can trigger an ambience;
- pattern lane can trigger modules;
- module parameters can be locked per step.

## Architecture Principles

1. Local-first stays foundational.
2. Timeline is the source of truth for history.
3. Current state is a projection, not the only data.
4. Views should not own data; they show data.
5. Modules should be composable but understandable.
6. Presets should make complexity approachable.
7. Privacy must be designed before automation becomes deep.
8. Every phase should leave the app usable.
9. Current v1.x behavior should be migrated, not discarded.
10. Visual playfulness is allowed, but the data model should be calm and boring.

## Parallel Tracks

The work should be planned as parallel tracks, not one long chain.

```text
Track A: Field / Grid
parallel v2 surface -> world grid -> saved views -> modules -> direct manipulation -> presets -> infinite canvas

Track B: History / Timeline
counterChangeLog -> Event Layer -> event projection -> Timeline MVP -> cycles -> richer review

Track C: Shared Model
stable module ids -> module settings -> views -> events -> presets -> privacy
```

Track A and Track B should meet through the shared module model:

- every field module needs a stable id;
- every event points to a module id;
- every view decides which modules and timeline range are visible.

## Phased Direction

### Phase A: Keep v1 Stable

Purpose:

- keep the current root app usable for daily tracking;
- keep sync/export/import safe;
- apply small UI fixes when they protect current use;
- avoid forcing the old 3x3 surface to carry every future idea.

This is the stable track.

### Phase B1: Parallel v2 Grid / Views Interface

Purpose:

- create a separate `/v2/` interface;
- start from PIN fields, grid modules, and saved views instead of the old fixed 3x3 page model;
- keep v2 data in a separate namespace at first;
- import from v1 intentionally instead of writing into v1 data;
- let the new interface become the place where Grid + Views are refined.

This is the main future interface track.

### Phase B2: Event Layer

Purpose:

- add event recording while keeping current weekly storage;
- record basic interactions: increment, decrement, timer start/stop, value edit, cell edit;
- keep event log internal at first;
- export events in backup JSON;
- verify that derived summaries match current values.

This is the bridge from history table to timeline.

### Phase C1: Timeline MVP

Purpose:

- turn HISTORY into a timeline surface;
- show events by day/week;
- group by module;
- support zoom levels;
- keep old weekly table available as a summary mode;
- add filters: module, type, view, day, week.

### Phase C2: Module Presets

Purpose:

- add reusable module presets;
- add compound scenarios;
- add import/export for presets;
- make module creation faster and less modal-heavy.

### Phase D: Saved Views

Purpose:

- add saved views inside PIN fields;
- save viewport, visible modules, field layout scope, filters, and timeline range;
- keep PIN switching as field/workspace navigation;
- later allow more than 3 views.

### Phase F: IndexedDB Foundation

Purpose:

- move event timeline to IndexedDB;
- keep current localStorage adapter for settings during migration;
- add query helpers;
- prepare for larger history and future automation.

### Phase G: Privacy And Automation

Purpose:

- add off-record mode;
- add per-module privacy levels;
- add redacted export;
- only then explore automation sources like geolocation zones, browser activity, or integrations.

### Phase H: Sequencer / Groovebox

Purpose:

- add clock modules;
- add trigger modules;
- add simple Web Audio sounds;
- add pattern lanes;
- record performance into timeline;
- keep MIDI optional because browser support is uneven.

## Key Risks

- Scope explosion: the product can become too many tools at once.
- Data migration risk: current localStorage data must not be broken casually.
- Timeline volume: event logs can grow quickly.
- Privacy risk: automation and location tracking are sensitive.
- UX complexity: infinite canvas plus modules plus timeline can become intimidating.
- Audio timing: browser audio has constraints, especially on mobile.
- Sync conflict complexity: event-level sync is more powerful but much harder than snapshots.

## Current Strategic Decision

Do not jump directly to the full infinite canvas.

Instead, move the new interface and history system forward without breaking v1:

```text
Field: /v2/ -> world grid -> saved views -> modules -> drag/resize -> presets -> larger canvas
Timeline: counterChangeLog -> Event Layer -> projection -> Timeline MVP -> cycles -> richer history
```

This keeps the app usable while moving toward the big system.

## Research References

- Miro: https://miro.com/en-us/
- ComfyUI workflow concepts: https://docs.comfy.org/development/core-concepts/workflow
- ComfyUI node concepts: https://docs.comfy.org/development/core-concepts/nodes
- TouchOSC: https://touchosc.app/
- ActivityWatch privacy/local-first model: https://docs.activitywatch.net/en/latest/privacy.html
- ManicTime automatic timelines: https://www.manictime.com/features/automatic-time-tracking
- Toggl Timeline: https://support.toggl.com/the-timeline-feature
- Ableton Live concepts: https://www.ableton.com/en/manual/live-concepts/
- Ableton Session View: https://www.ableton.com/en/live-manual/11/session-view/
- Bitwig Grid: https://www.bitwig.com/de/the-grid/
- VCV Rack getting started: https://vcvrack.com/manual/GettingStarted
- TidalCycles patterns: https://userbase.tidalcycles.org/Different_Kinds_of_Pattern/en-gb.html
- Strudel: https://patterns.slab.org/learn/getting-started/
- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- Web MIDI API: https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API
- Geolocation API: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
