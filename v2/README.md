# SSTM v2 / beta 0.5.1

[Personal entry](https://comp1mov.github.io/TRCKNG-SSTM/v2/?mode=account) · [Demo](https://comp1mov.github.io/TRCKNG-SSTM/v2/?mode=demo) · [V1](https://comp1mov.github.io/TRCKNG-SSTM/)

## First recording

1. Sign in with your existing email account. If v2 already exists, it loads automatically. Otherwise preview **ПОДГОТОВИТЬ КОПИЮ V1** and confirm **СОЗДАТЬ МОЮ V2** after syncing v1.
2. Use **← НА ПОЛЕ** to return from Account.
3. Press **НАЧАТЬ**, for example before going to sleep. The clock continues from its saved start even with the page closed.
4. Press **+ ТОЧКА** on waking. This closes the first interval and starts the next without resetting elapsed time.
5. Open **ОТРЕЗКИ** to add optional names/tags, correct times or **ОСТАНОВИТЬ ЗАПИСЬ**. A recording may be short or span more than 24 hours; midnight does not end it.

The top also shows actual local time. **КАЛЕНДАРЬ** switches to calendar strips; **К ЗАПИСИ** returns. Separate sleep-to-sleep grouping across multiple recordings remains future work.

## Buttons and windows

All original types remain available. **РАССТАВИТЬ** offers creation, settings and module placement; free space and edge dragging grow the grid. Exact equal-size drops swap modules. Minimized panels retain drafts and appear in the window dock. Account always has a labelled return action.

**Меню → Сценарии / помощь** offers initial recipes. **Работа × ставка** takes an hourly amount, currency and preferred display. First press starts, second saves the work interval. Pauses do not earn. Each session retains its starting rate. A second control can show the same work source with another display.

Tap **#** to type inside the module. Existing tags are suggested by prefix across PINs. Tap a suggestion or use arrows and Enter to complete; another Enter or ✓ saves. × discards; Escape or leaving the field parks a separate local draft with its original time. Demo drafts reset on reload.

Tap **СОСТОЯНИЕ** to open eight initial choices in the responsive panel. Tap a word, or drag from the center and release over a word, to record one state. Press again for another. **+ СВОЁ СОСТОЯНИЕ** adds vocabulary without recording an observation. The panel docks at the side on desktop and uses the available field width on phones.

**История → # СЛОВА / СОСТОЯНИЯ** groups observations and interval tags into Monday–Sunday weeks. Words also appear in their matching recording interval without splitting it or duplicating duration. Tags classify/search records; they do not yet add interval time to original counter totals.

## Data and sync

Account identity is shared with v1; datasets are separate. The checked initial copy reads all three PINs, rechecks the source timestamp and retains the original as a downloadable backup. Existing v2 is loaded instead of copied again. V2 supports full backup export/restore with a recovery copy.

Only one local tab writes a given account at a time. Across devices, revision checks pause conflicting snapshots; automatic merging is not implemented. Wait for **V2 СОХРАНЕНА · V1 ОТДЕЛЬНО** before switching devices. If offline, records stay on that device pending sync. Local records are browser storage, not device-level encryption; avoid clearing site data before syncing/exporting.

A new visitor sees invented examples. Explicit `?mode=demo` does not initialize Auth, read private records or write account data. Demo interactions reset on reload. Use `?mode=account` for persistent personal tracking.

## Beta verification and limits

Original types, recordings/edits, shared work, words/states, field navigation, migration and mocked two-device/offline flows are covered by the scripts in `../tests/`. Inline inputs/state gestures passed Edge, Firefox and Playwright WebKit at six desktop/tablet/phone viewports and orientations. The release check covers upgrading from the previously deployed v1 worker and opening v2 offline, with independent caches and unchanged invented v1 data.

Real phone/tablet keyboards, physical Safari and private multi-device acceptance remain user testing. The main v2 is a browser link; a separate installable v2 home-screen app is not included yet. `points-lab.html` is an older separate IndexedDB experiment, not the account-connected daily-use entry.

Next work: improve interval-to-activity assignment and module input recipes, then personal-cycle grouping and richer connections. Predictive cycles, device imports and generative sound remain later work.
