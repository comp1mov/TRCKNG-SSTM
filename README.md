# TRCKNG SSTM — v1.34.7 / v2 beta 0.8.0

A modular tracking field for habits, time, words, states and personal metrics.

- **[Open v2 with your account](https://comp1mov.github.io/TRCKNG-SSTM/v2/?mode=account)**
- [Try the interactive demo](https://comp1mov.github.io/TRCKNG-SSTM/v2/?mode=demo)
- [Open v1](https://comp1mov.github.io/TRCKNG-SSTM/)

## Start using v2

Sign in or create an email account. New accounts can create an empty field; returning accounts load their records automatically. An optional **Import from v1** section previews a one-time copy of all three cloud PINs. Sync v1 before copying. V1 and v2 keep independent datasets.

Return from Account with **← BACK TO FIELD**. Press **START** to start a recording, and **+ POINT** to mark the next boundary. Names are optional and can be added in **INTERVALS**. Midnight and 24 hours do not end a recording. Elapsed time is derived from saved timestamps, so closing the tab does not stop it. Check that the status says **ALL SAVED** before moving to another device.

The explicit demo uses invented examples and resets on reload. Use your account for records you want to keep.

English is the default interface language. **Menu → Language** switches to Russian without reloading or changing personal labels, notes or records. Large figures use a shared Latin/Cyrillic font. Idle modules are dark with quiet color outlines; running timers have a colored fill and a steady filled indicator. Counters briefly flash after a change, while BPM controls follow their actual pulse.

On phones, the header starts compact. **⌄ / ⌃** beside Menu expands/collapses the panels; Menu contains Arrange, History and zoom. Tap the recording clock to open intervals. Counters share a large figure size, with unit symbols on a separate small line. The field uses the remaining screen height down to save status.

## Included in this beta

- All 13 original button types, settings and histories.
- Three PINs, creation from empty field cells, grouped button settings and an expanding field. Larger buttons shift colliding neighbours on save.
- History Matrix, point recordings, editable interval labels/times/tags.
- Reversible interval/recording deletion; deleted intervals leave gaps without changing neighbouring durations.
- Work × hourly rate, shared work controls and captured per-session rates.
- Inline # tags with suggestions; a 64-state matrix, quick choices, bilingual phrase search and custom words.
- **Menu → States / Tags** for quick capture, weekly search and observation trash.
- Weekly words/states, scenarios/help, synchronized Until clock hands.
- Separate v2 account storage, checked migration, full v2 backup/restore, conflict recovery and offline loading after the initial visit.

See [v2 usage and limits](v2/README.md). Physical phone/tablet keyboard and Safari acceptance remain part of the personal beta. A separate installable v2 home-screen app, general module wiring, personal-cycle grouping and sound are later work.

## Development and deployment

Static HTML/CSS/JS; no build step. Run `node dev-server.mjs 5173` and open `http://127.0.0.1:5173/TRCKNG-SSTM/`. Add `--lan` after the port for a same-Wi-Fi preview.

GitHub Pages publishes the root of `main`. V2 needs its folder **and** the matching shared root `index.html`, `style.css`, `app.js`, `app-config.js` and `history-matrix.js`. Workers have separate v1/v2 cache namespaces. Private exports, credentials and local planning notes do not belong in a release.

The existing publishable Supabase configuration is in `app-config.js`. V1 uses `trckng_snapshots`; v2 uses `trckng_v2_snapshots` and revision-checked `commit_trckng_v2`. New installations require `supabase/v2-isolation.sql` followed by `supabase/v2-modules.sql`; these are already applied to the configured project. No administrative credential is shipped.

## Verification

Unit and browser scripts are in `tests/`; browser checks require Playwright and use isolated profiles with invented data. `v2-release.browser.cjs` verifies the deployed old v1 worker upgrade, complete static precaching, independent caches and offline v2 loading. `v2-surface.browser.cjs` exercises migration, two mocked devices, conflicts, retries, recovery, export/restore and offline records. Other suites cover original types, field placement, intervals, clocks and input. No private account records are used by the checks.
