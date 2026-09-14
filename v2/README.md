# SSTM v2 / beta 0.10.2

[Personal entry](https://comp1mov.github.io/TRCKNG-SSTM/v2/?mode=account) · [Demo](https://comp1mov.github.io/TRCKNG-SSTM/v2/?mode=demo) · [V1](https://comp1mov.github.io/TRCKNG-SSTM/)

## Light continuity fix (0.10.1)

Pulse now keeps its functional rhythm when the device requests reduced motion or the material is set to Static. The motion control explicitly applies to the texture only; tapping Pulse still starts/stops its light. Unchanged controls retain their canvas, current texture and brightness when neighbouring timers are started/stopped. Re-observing the same size no longer clears the backing canvas. Texture opacity is quieter and evolution is slower, independent of BPM, while ordinary timers keep a constant activity light.

Verified with a reduced-motion browser: all four 4+4 phase samples, static-texture Pulse, preserved canvas/pixels/light over neighbour toggles, PIN isolation and stop. Existing visual settings/snapshot/layout, dense field and offline checks also pass.

## Light and texture (0.10.0)

In **ARRANGE → edit a button → Light and texture**, choose one of five materials or tune speed, scale, seed, blur and glow. The color picker above it controls the whole button. Running stopwatches, timers, points and work controls stay lit; stopped controls go dark. Positive counter marks fade over a configurable number of minutes (15 by default, 0 disables the tail). Decreases and undo use the original mark time.

Pulse offers Beat, Wave, 4+4, 5+5 and 4+4+4+4. BPM and milliseconds describe the same full cycle. A saved start timestamp keeps the phase when the field is rebuilt or a snapshot is restored. Beat decay is adjustable; the named patterns have fixed lengths.

Existing controls receive stable, deterministic defaults without a data write. Newly created controls choose one recipe once, then save its concrete values under `cellFlags[id].light`. These preferences travel through the existing v2 snapshot and sync path; there is no database migration. Unknown future visual versions are retained with a plain fallback. Texture animation follows the device preference by default, with explicit On and Static options. Pulse rhythm is controlled by the Pulse button independently.

MEDIUM is a separate renderer (`medium.js`); it does not record events. One host loop limits texture painting to three visible buttons per frame and stops scheduling work in hidden tabs. Letters use self-hosted Roboto Mono, with plain Roboto digits and included OFL licenses, in both languages. These assets are included in the 0.10.2 release.

## Interval tag suggestions (0.10.2)

In **INTERVALS → + tag**, previous tags are visible before typing. Suggestions use the current account's existing moment and interval tags, filter by the word at the cursor, and exclude tags already selected. Tap a suggestion or press Arrow Down then Enter. Selection only updates the draft; Save commits it. Creating a new point starts with empty tags and never copies the prior interval's tags automatically.

## First recording

1. Sign in or choose **CREATE ACCOUNT**. Confirm your email, then sign in. New accounts offer **CREATE EMPTY FIELD**. Existing records load automatically. **Import from v1** is optional and collapsed; sync v1 first if you use it.
2. Use **← BACK TO FIELD** to return from Account.
3. Press **START**, for example before going to sleep. The clock continues from its saved start even with the page closed.
4. Press **+ POINT** on waking. This closes the first interval and starts the next without resetting elapsed time.
5. Open **INTERVALS** to add optional names/tags, correct times or **STOP RECORDING**. A recording may be short or span more than 24 hours; midnight does not end it.

The top also shows actual local time. **CALENDAR** switches to calendar strips; **BACK TO RECORDING** returns. Separate sleep-to-sleep grouping across multiple recordings remains future work.

Tap **INTERVALS** again to close its window. This keeps the recording running and retains any label/time drafts, just like the close button. The control shows whether its window is open.

To remove a mistaken interval, press its **×**, review the time range, then **MOVE TO TRASH**. Its boundaries stay in place as a gap; neighbours do not gain its time. **Delete entire recording…** removes the selected recording. Deleting the running interval or recording explicitly stops it. **Recording trash → RESTORE** brings it back, stopped; restoring a removed interval in an otherwise running recording leaves that recording running. States, words and independent timers are kept. Trash is included in account sync and exports; there is no permanent purge in this beta.

## Language and readability

English is the default. **Menu → Language → Русский** switches without reloading. The preference stays on this device; personal labels, tags, typed drafts and records keep their original text. Built-in state choices are translated for display. New demo labels and recipe names use the language active at creation.

Main numbers use a shared large size at each zoom level. Unit symbols sit on a separate small line; long clocks use a consistent smaller size, and unusually long values/dense work modules still fit their available space. A local JetBrains Mono font covers Latin and Cyrillic; it is cached for offline use, with its OFL license in `fonts/`.

Idle modules have a dark background, neutral values and quiet color outlines. Duration timers and recording controls show a hollow indicator at rest, then a filled indicator and colored background while running. Work keeps its existing Start/Stop indicator. A saved total alone does not light up a module. Counter changes give a brief flash; BPM follows its real on/off phases. Until stays a dark clock display while approaching its target and retains the expiry alert. Running timers remain identifiable with reduced motion, without continuously scaling their numbers.

Phones and short landscape screens start with compact panels: recording, current clock, PINs and the field. Tap **⌄** beside Menu to expand, or **⌃** to collapse. This preference is saved on the device separately for small and large screens. **Menu** keeps Arrange, History, field controls and zoom available when compact. Tap the recording time (**INTERVALS ↗**) to review intervals. The field fills the remaining height down to the save-status row, accounting for safe areas and changing browser bars.

Account shows identity, save status, sign out and sync. Backup/recovery is collapsed and opens when a conflict needs attention. Legacy v1 source/recovery downloads appear only when those copies exist.

## Buttons and windows

**Unit → Unit view → Time since last mark** shows elapsed hours/minutes until 48 hours, then full days, with the count below. **Confirm each tap** protects both additions and decreases. Decreases and zero-change taps do not restart elapsed time; numerical undo restores the preceding mark. Unknown older marks show **—**; retained positive counter history can supply a baseline. Preferences and the baseline travel with the existing PIN settings in sync and backups. The count view remains the default. Previous-week preview still shows historical counts.

Tap a **+** in an empty field cell on any PIN to create there. These affordances are generated for the visible area and are not stored as buttons. Existing blank cells also open directly from the field. **ARRANGE** offers settings and module placement; free space and edge dragging grow the grid. Exact equal-size drops swap modules. Minimized panels retain drafts and appear in the window dock. Account always has a labelled return action.

The editor groups all existing types under **RECORD / TIME / MONEY / TOOLS**. Choosing a category browses its types; tap a type to select it. The current type and its action are described below. **Description and history** contains secondary flags and reset. Save/Cancel stay available while scrolling.

**TIME → Stopwatch → Stopwatch view** offers ready-made presentations:

- **Stopwatch · classic:** current interval, or last when stopped; this week's total underneath. A short `MM:SS` clock grows to `H:MM:SS` after an hour.
- **Total minutes / Total seconds:** whole minutes or seconds this week, with the same exact duration broken down into hours, minutes and seconds underneath.
- **Total time / Total hours:** this week's clock or decimal hours, with the current/last interval underneath.
- **Last interval:** the previous completed interval stays visible while the next runs underneath. A first run has no previous result and shows **—**.

The preview shows both lines. Existing explicit 0.9 display settings remain available as **My saved view** until you choose a preset. There is one view selector; no separate unit submenu. Tap still starts/stops the same stopwatch.

Changing these views preserves the original control, stored units, totals and timestamped history, including sub-minute runtime precision. The classic minute preset renders 65 seconds as `01 min` plus `0h 1m 5s`; it does not round the stored duration. During a week rollover handled by this version, the current interval continues from its original start while the weekly total starts again. Starting another run preserves the previous completed duration. Older running states that cleared that value can use a retained preceding session, excluding the current run's weekly fragments. Absent detail is shown as **—**, not invented from a weekly sum. Past weekly aggregates can already be rounded by older versions. Sleep retains its specialized options; countdown, Until and point recording keep their separate actions.

Choose 2×2 or another size without clearing space manually: the requested anchor stays fixed, and only colliding neighbours shift right or down by whole cells, including a cascade if needed. The plan chooses the shorter total shift and keeps neighbours' sizes, identities and records. A notice explains displacement before Save. Cancel or a failed validation moves nothing. Placement stays within the existing 200×200 module-coordinate limit; at the limit another location may be needed. Duration/recording and work indicators sit at the bottom, clear of the large value.

**Menu → Scenarios / Help** offers initial recipes. **Work × rate** takes an hourly amount, currency and preferred display. First press starts, second saves the work interval. Pauses do not earn. Each session retains its starting rate. A second control can show the same work source with another display.

Tap **#** to type inside the module. Existing tags are suggested by prefix across PINs. Tap a suggestion or use arrows and Enter to complete; another Enter or ✓ saves. × discards; Escape or leaving the field parks a separate local draft with its original time. Demo drafts reset on reload.

Tap **STATE** for eight quick choices. **MATRIX** opens all 64 everyday states on one large map: energy above, less energy below; more pleasant on the left, more difficult on the right. These are browsing guides. On phones, scroll to reach the lower areas. Tap a word to capture it, or enable **DRAG TO CHOOSE**, move across visible words and release on one. Releasing outside a word cancels; ordinary scrolling records nothing. Gesture mode resets when opening a capture. A quadrant heading opens its smaller paged radial selection; quick choices and custom vocabulary remain available. Search understands preset names and everyday phrases in English and Russian regardless of interface language, such as “looking forward”, “скучаю” or “не знаю”, plus your own words. One state is recorded per selection; press again for another. **+ ADD YOUR OWN STATE** adds vocabulary without recording an observation; matching custom words keep their identity in search and the map.

**Menu → STATES / TAGS** opens the shared notebook. Add a state or tag directly, optionally attach tags to the same state timestamp, search the selected week, filter by kind/keyword, or delete/restore an observation. The latest-capture undo also undoes any tags attached in that capture. Typed capture drafts survive closing the panel with their original time; **CANCEL** discards them. The field's inline hashtag input still works. Header controls temporarily fold while these panels are open; phone layouts and landscape selection preserve touch targets.

**History → # WORDS / STATES** groups observations and interval tags into Monday–Sunday weeks. Words also appear in their matching recording interval without splitting it or duplicating duration. Tags classify/search records; they do not yet add interval time to original counter totals.

## Data and sync

Account identity is shared with v1; datasets are separate. The checked initial copy reads all three PINs, rechecks the source timestamp and retains the original as a downloadable backup. Existing v2 is loaded instead of copied again. V2 supports full backup export/restore with a recovery copy.

Trash and the first 32 presets retain the existing data format. Selecting one of the 32 presets added in 0.7.1 upgrades the recording journal to version 4 and the local envelope to version 5. Later use of an older choice or trash cannot downgrade the journal. Older app versions reject these data instead of accidentally losing states. The cloud snapshot remains data version 2. Refresh v2 on each device before continuing with upgraded data; v1 is independent.

Stopwatch settings use full snapshot schema 5 and cloud data version 2 in the existing table. Choosing a preset or capturing a generic stopwatch upgrades its view journal to version 2 and local envelope to 7, protecting the previous-session semantics. Existing version-1 views stay readable. Preferences travel through account sync, export/restore and recovery. Earlier v2 clients reject newer copies before applying them, including offline; refresh v2 on other devices to continue. No existing timestamps or weekly units are converted by this upgrade.

Only one local tab writes a given account at a time. Across devices, revision checks pause conflicting snapshots; automatic merging is not implemented. Wait for **ALL SAVED** before switching devices. If offline, records stay on that device pending sync. Local records are browser storage, not device-level encryption; avoid clearing site data before syncing/exporting.

A new visitor sees invented examples. Explicit `?mode=demo` does not initialize Auth, read private records or write account data. Demo interactions reset on reload. Use `?mode=account` for persistent personal tracking.

## Beta verification and limits

`v2-stopwatch.test.cjs` checks precise formats and classic presets, separate current/previous/weekly values, missing retained detail, schema validation and rejection by the 0.8.0/0.9.0 readers. `v2-stopwatch.browser.cjs` verifies all three legacy sources, unchanged history on repeated preset switches, the previous result during a subsequent run, week rollover, old saved-view compatibility, cancel/parked/stale drafts and snapshot adoption in Edge and Playwright WebKit at five EN/RU sizes. Preview visibility is checked against sticky header/save controls. The synthetic two-device suite carries preset changes through sync, conflict/recovery and export/restore. Original button types and worker upgrade/offline checks passed. Physical devices and actual private accounts remain user acceptance.

`v2-layout.test.cjs` checks deterministic cascades, mixed sizes, boundaries, hidden cells and dense fields. `v2-creation-map.browser.cjs` checks atomic create/cancel/failure, retained neighbour records, PIN slots, snapshot roundtrip, grouped editor layouts, all matrix targets, touch-scroll cancellation and single gesture capture in Edge and Playwright WebKit. Original type, field/touch-drag, modular timer, mobile-panel, two-device sync and worker/offline suites also passed. V2 0.8.0 changes layout/presentation using the existing data format. The shared engine hook is inactive in v1; root worker 1.34.7 and v2 worker 0.8.0 retain separate caches.

`v2-state-catalog.test.cjs` checks all 64 translations, phrase search, custom-name collisions, snapshot validation and rejection by the released 0.7.0 reader. `v2-emotions.browser.cjs` verifies interval toggle/draft preservation, all 64 touch targets at five viewport sizes, paging, bilingual search and new-state capture/export in Edge and Playwright WebKit. The mocked two-device test carries a new preset through sync, conflict recovery, export/restore and offline reload.

`v2-corrections.test.cjs` checks preserved deletion boundaries, restore/live-stop rules, stale/corrupt data rejection, vocabulary collisions and versioned storage. `v2-corrections.browser.cjs` covers notebook capture/search/trash, group/word gestures, five desktop/tablet/phone layouts in Edge and Playwright WebKit, interval/recording deletion previews and export roundtrip. `v2-surface.browser.cjs` also carries removed intervals and expanded states through the mocked two-device account flow.

`v2-mobile-field.browser.cjs` covers compact/expanded layouts at six phone/tablet/desktop sizes in Edge and Playwright WebKit, menu access, module creation, point recording, unchanged data when folding, dismissal without accidental tracking, EN/RU switching, consistent figures with unit symbols and saved presentation preferences. Physical Safari/browser-bar and software-keyboard behavior still needs device acceptance.

`v2-onboarding.browser.cjs` covers anonymous demo, live EN/RU switching with drafts, large figures/font loading, email-confirmation signup, fresh field creation without v1 requests, record sync/reload and account layouts. All accounts and responses in this test are fabricated; public Auth settings were checked read-only to confirm email registration is enabled.

Original types, recordings/edits, shared work, words/states, field navigation, migration and mocked two-device/offline flows are covered by the scripts in `../tests/`. Inline inputs/state gestures passed Edge, Firefox and Playwright WebKit at six desktop/tablet/phone viewports and orientations. The release check covers upgrading from the previously deployed v1 worker and opening v2 offline, with independent caches and unchanged invented v1 data.

Real phone/tablet keyboards, physical Safari and private multi-device acceptance remain user testing. The main v2 is a browser link; a separate installable v2 home-screen app is not included yet. `points-lab.html` is an older separate IndexedDB experiment, not the account-connected daily-use entry.

Next work: a general history Timeline / Matrix for selected counts, durations and states, with explicit interval/source links and personal-cycle comparison. Work, money and tag filters are optional layers. Elapsed time since a counter's last mark can be a view of existing observations; a separate Days-since span journal is not planned for the next stage. Inventory/general composition, predictive cycles, device imports and generative sound remain later work.
