# SSTM v2 / beta 0.7.0

[Personal entry](https://comp1mov.github.io/TRCKNG-SSTM/v2/?mode=account) · [Demo](https://comp1mov.github.io/TRCKNG-SSTM/v2/?mode=demo) · [V1](https://comp1mov.github.io/TRCKNG-SSTM/)

## First recording

1. Sign in or choose **CREATE ACCOUNT**. Confirm your email, then sign in. New accounts offer **CREATE EMPTY FIELD**. Existing records load automatically. **Import from v1** is optional and collapsed; sync v1 first if you use it.
2. Use **← BACK TO FIELD** to return from Account.
3. Press **START**, for example before going to sleep. The clock continues from its saved start even with the page closed.
4. Press **+ POINT** on waking. This closes the first interval and starts the next without resetting elapsed time.
5. Open **INTERVALS** to add optional names/tags, correct times or **STOP RECORDING**. A recording may be short or span more than 24 hours; midnight does not end it.

The top also shows actual local time. **CALENDAR** switches to calendar strips; **BACK TO RECORDING** returns. Separate sleep-to-sleep grouping across multiple recordings remains future work.

To remove a mistaken interval, press its **×**, review the time range, then **MOVE TO TRASH**. Its boundaries stay in place as a gap; neighbours do not gain its time. **Delete entire recording…** removes the selected recording. Deleting the running interval or recording explicitly stops it. **Recording trash → RESTORE** brings it back, stopped; restoring a removed interval in an otherwise running recording leaves that recording running. States, words and independent timers are kept. Trash is included in account sync and exports; there is no permanent purge in this beta.

## Language and readability

English is the default. **Menu → Language → Русский** switches without reloading. The preference stays on this device; personal labels, tags, typed drafts and records keep their original text. Built-in state choices are translated for display. New demo labels and recipe names use the language active at creation.

Main numbers use a shared large size at each zoom level. Unit symbols sit on a separate small line; long clocks use a consistent smaller size, and unusually long values/dense work modules still fit their available space. A local JetBrains Mono font covers Latin and Cyrillic; it is cached for offline use, with its OFL license in `fonts/`.

Idle modules have a dark background, neutral values and quiet color outlines. Duration timers and recording controls show a hollow indicator at rest, then a filled indicator and colored background while running. Work keeps its existing Start/Stop indicator. A saved total alone does not light up a module. Counter changes give a brief flash; BPM follows its real on/off phases. Until stays a dark clock display while approaching its target and retains the expiry alert. Running timers remain identifiable with reduced motion, without continuously scaling their numbers.

Phones and short landscape screens start with compact panels: recording, current clock, PINs and the field. Tap **⌄** beside Menu to expand, or **⌃** to collapse. This preference is saved on the device separately for small and large screens. **Menu** keeps Arrange, History, field controls and zoom available when compact. Tap the recording time (**INTERVALS ↗**) to review intervals. The field fills the remaining height down to the save-status row, accounting for safe areas and changing browser bars.

Account shows identity, save status, sign out and sync. Backup/recovery is collapsed and opens when a conflict needs attention. Legacy v1 source/recovery downloads appear only when those copies exist.

## Buttons and windows

All original types remain available. **ARRANGE** offers creation, settings and module placement; free space and edge dragging grow the grid. Exact equal-size drops swap modules. Minimized panels retain drafts and appear in the window dock. Account always has a labelled return action.

**Menu → Scenarios / Help** offers initial recipes. **Work × rate** takes an hourly amount, currency and preferred display. First press starts, second saves the work interval. Pauses do not earn. Each session retains its starting rate. A second control can show the same work source with another display.

Tap **#** to type inside the module. Existing tags are suggested by prefix across PINs. Tap a suggestion or use arrows and Enter to complete; another Enter or ✓ saves. × discards; Escape or leaving the field parks a separate local draft with its original time. Demo drafts reset on reload.

Tap **STATE** for eight quick choices. **GROUPS** opens four groups containing 32 everyday states. Tap a group or drag from the center and release over it; then choose a state the same way. Choosing a group does not create a record. Releasing outside a word cancels the gesture. Search works with displayed preset names and your own words. One state is recorded per selection; press again for another. **+ ADD YOUR OWN STATE** adds vocabulary without recording an observation; existing custom words take precedence over matching new presets.

**Menu → STATES / TAGS** opens the shared notebook. Add a state or tag directly, optionally attach tags to the same state timestamp, search the selected week, filter by kind/keyword, or delete/restore an observation. The latest-capture undo also undoes any tags attached in that capture. Typed capture drafts survive closing the panel with their original time; **CANCEL** discards them. The field's inline hashtag input still works. Header controls temporarily fold while these panels are open; phone layouts and landscape selection preserve touch targets.

**History → # WORDS / STATES** groups observations and interval tags into Monday–Sunday weeks. Words also appear in their matching recording interval without splitting it or duplicating duration. Tags classify/search records; they do not yet add interval time to original counter totals.

## Data and sync

Account identity is shared with v1; datasets are separate. The checked initial copy reads all three PINs, rechecks the source timestamp and retains the original as a downloadable backup. Existing v2 is loaded instead of copied again. V2 supports full backup export/restore with a recovery copy.

Using trash or a newly added preset upgrades the recording journal to version 3 and the local envelope to version 4. Older app versions reject these data instead of accidentally losing deletions or states. The cloud snapshot remains data version 2. Refresh v2 on each device before continuing with the upgraded data; v1 is independent.

Only one local tab writes a given account at a time. Across devices, revision checks pause conflicting snapshots; automatic merging is not implemented. Wait for **ALL SAVED** before switching devices. If offline, records stay on that device pending sync. Local records are browser storage, not device-level encryption; avoid clearing site data before syncing/exporting.

A new visitor sees invented examples. Explicit `?mode=demo` does not initialize Auth, read private records or write account data. Demo interactions reset on reload. Use `?mode=account` for persistent personal tracking.

## Beta verification and limits

`v2-corrections.test.cjs` checks preserved deletion boundaries, restore/live-stop rules, stale/corrupt data rejection, vocabulary collisions and versioned storage. `v2-corrections.browser.cjs` covers notebook capture/search/trash, group/word gestures, five desktop/tablet/phone layouts in Edge and Playwright WebKit, interval/recording deletion previews and export roundtrip. `v2-surface.browser.cjs` also carries removed intervals and expanded states through the mocked two-device account flow.

`v2-mobile-field.browser.cjs` covers compact/expanded layouts at six phone/tablet/desktop sizes in Edge and Playwright WebKit, menu access, module creation, point recording, unchanged data when folding, dismissal without accidental tracking, EN/RU switching, consistent figures with unit symbols and saved presentation preferences. Physical Safari/browser-bar and software-keyboard behavior still needs device acceptance.

`v2-onboarding.browser.cjs` covers anonymous demo, live EN/RU switching with drafts, large figures/font loading, email-confirmation signup, fresh field creation without v1 requests, record sync/reload and account layouts. All accounts and responses in this test are fabricated; public Auth settings were checked read-only to confirm email registration is enabled.

Original types, recordings/edits, shared work, words/states, field navigation, migration and mocked two-device/offline flows are covered by the scripts in `../tests/`. Inline inputs/state gestures passed Edge, Firefox and Playwright WebKit at six desktop/tablet/phone viewports and orientations. The release check covers upgrading from the previously deployed v1 worker and opening v2 offline, with independent caches and unchanged invented v1 data.

Real phone/tablet keyboards, physical Safari and private multi-device acceptance remain user testing. The main v2 is a browser link; a separate installable v2 home-screen app is not included yet. `points-lab.html` is an older separate IndexedDB experiment, not the account-connected daily-use entry.

Next work: improve interval-to-activity assignment and module input recipes, then personal-cycle grouping and richer connections. Predictive cycles, device imports and generative sound remain later work.
