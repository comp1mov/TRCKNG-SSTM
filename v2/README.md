# SSTM v2 / beta 0.11.0

[Current app](https://comp1mov.github.io/TRCKNG-SSTM/v2/?mode=account) · [Demo](https://comp1mov.github.io/TRCKNG-SSTM/v2/?mode=demo)

## Account and copy choice

Use the existing email account. New accounts can create an empty field or load a v2 file. Returning devices load cloud records unless they have unsynchronized changes or a pending copy choice.

When copies differ, Account immediately shows **Use this device** and **Use cloud copy**. Device replaces the cloud after confirmation using its freshly read revision; another write in between remains a conflict. Cloud replaces local records after confirmation. The overwritten copy is retained under This device → Download previous copy. This is one local recovery copy, not daily backups.

**Download v2 file** includes all PINs, original histories, points/checkpoints, notes/tags, state vocabulary, modular sessions and stopwatch settings. **Import v2 file** validates and loads locally, pausing sync until you choose which copy to use, including after reload. Choose Use this device to send the imported data to the account; another device can then sync or choose Use cloud copy if it has its own changes.

V1 import and daily cloud backup controls have been removed. Existing v1 records and database backups are not deleted. Device names are local preferences. No administrative credential or new database migration is needed.

## Points and the log

START begins a cycle. + POINT immediately stores an inner point. Add an optional thought/name and tags; select New interval to start a stage at that timestamp. Skipping keeps the point. Stop recording is explicit in the intervals panel. Closing the app and midnight do not reset the clock.

History opens Log. Rows show elapsed time since the containing cycle began, the event/note, and actual local time. Dates separate days; events outside cycles show a dash on the left. Newest events come first, across all PINs. Search and filters do not mutate journals. Show earlier loads more rows. A point promoted to a stage appears once, retaining its note and tags.

Click a point row to reach its existing editor in the intervals panel. Statistics is a separate tab. Timer starts/stops, value changes and undo, words and states use their original records. Visual generators do not invent events. Historical totals without retained timestamps cannot be reconstructed. V2 no longer trims future counter/duration records at 1,000; already-discarded detail cannot be recovered.

## Phone navigation

Phones use compact panels regardless of an old expanded preference. Open panels hide the large timer/PIN header and retain a clear return action. Menu groups Appearance/settings and Field controls into expandable sections. Module sizes, tracking actions and light settings remain available.

Menu shows 0.11.0 and Reload. Reload preserves stored records and pending sync but warns about unsaved form text. Appearance/settings contains language, Night mode and the optional point prompt. Private labels and notes are not translated. V1 has only its separate legacy URL.

## Data and verification

The log is a read-only projection over the existing synchronized snapshot. Inner points use journal version 5 and local envelope 8; older clients reject unsupported data. Update all devices before editing new checkpoint data.

Synthetic checks cover new accounts, existing records, mobile conflict choices, revision races, retry, edits during upload, two-device checkpoint/word/state/module sync, JSON transfer, recovery and offline records/drafts. Geometry checks cover 320/390/768 widths; separate suites check the thirteen original button types and old-worker upgrade/offline caching. Physical phone keyboard, long-press feel and Safari remain user acceptance. No private account was inspected or modified by tests.

Keep main as the daily testing release; test development changes locally with invented data before publishing. Button-lab is separate. Extended statistics, general module wiring, richer cycle comparison, sound and an independent installable home-screen app remain future work.
