# TRCKNG SSTM — v2 beta 0.11.1

A personal tracking field with timestamped points, notes, buttons and a shared event log.

- **[Open the current app](https://comp1mov.github.io/TRCKNG-SSTM/v2/?mode=account)**
- [Try the demo](https://comp1mov.github.io/TRCKNG-SSTM/v2/?mode=demo) — invented data, resets on reload.
- [Legacy v1 archive](https://comp1mov.github.io/TRCKNG-SSTM/) — independent data, outside the v2 workflow.

## Daily use

Sign in with your existing account. New accounts can create an empty field or load a v2 JSON file. START begins a cycle; + POINT saves a timestamp immediately. Add an optional thought or tags; start a new stage only when needed. Midnight does not reset the cycle.

The bottom **Log** button opens events directly: cycle elapsed time on the left, event/note in the middle, actual device-local time on the right. Points, stages, states, tags, value changes, undo and recorded timer starts/stops appear together across all PINs. **Timeline** and **Statistics** are adjacent tabs. Statistics starts with weekly totals and a button filter; detailed tables and corrections are collapsed. Search, filters and Show earlier browse retained records without changing them.

**Undo** stays beside Field and Log. Its caption names the numeric change it will restore in the current PIN and week. Repeated undo walks back retained number changes; it does not cancel points or timers. A changed PIN or replaced record cannot make a stale action undo another change.

Account shows **Use this device** and **Use cloud copy** together, with confirmation before replacement. Download v2 file saves all PINs and journals. Import v2 file loads locally; choose Use this device to publish it to the account. One previous copy is retained locally. Daily cloud backups and v1 import are not part of this release.

Phones keep compact headers and fold the timer/PIN panels while Account is open. Menu groups appearance and field settings into expandable sections and shows the version and Reload action. See [v2 usage and verification](v2/README.md).

## Development and releases

Static HTML/CSS/JS; no build step. Run `node dev-server.mjs 5173` and open `http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo`. Use invented data for development.

GitHub Pages publishes the root of **main**. The old remote codex/v125-stabilization branch is not the public release. The working directory can contain newer unpublished work; Menu identifies the loaded release. Keep experiments off main until checks pass, then publish to the same stable account URL.

V2 reuses root index.html, style.css, app.js, app-config.js and history-matrix.js. Preserve these shared dependencies when maintaining the v1 archive. V1 and v2 use separate data and worker caches. The local button-lab prototype is not included in this release.

V2 uses trckng_v2_snapshots and revision-checked commit_trckng_v2. Version 0.11.1 works with the previously deployed RPC; no new migration or daily-backup table is needed. New installations use the published supabase/v2-isolation.sql and supabase/v2-modules.sql. Only public client configuration is shipped.

## Verification

Tests use fabricated accounts and isolated browser profiles. v2-log-navigation.browser.cjs covers visible undo, stale PIN protection, log/timeline access, weekly statistics and 320/390/768/1280 layouts. v2-account-log.browser.cjs covers mobile conflicts, concurrent writes, second-device checkpoints, JSON transfer, reload, retry and the log. v2-surface.browser.cjs covers the wider account/editor/offline flow; v2-onboarding.browser.cjs covers first use and language. v2-release.browser.cjs checks old-worker upgrade and offline caching. Pure tests cover journal invariants and log projection. Original button behavior is checked separately. Physical iPhone/Safari acceptance is still needed.
