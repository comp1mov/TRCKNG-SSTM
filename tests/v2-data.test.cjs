const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('../v2/data.js');
const fixture = () => ({ schemaVersion: 4, snapshotType: 'fullApp', pinData: [0, 1, 2].map(pin => ({ pin, habitLabels: { cell01: 'Example' }, habitTypes: { cell01: 'unit' }, weekData: { '2026W01': { cell01: 3 } }, durationSessions: [], counterChangeLog: [] })), pinNames: { 0: 'A', 1: 'B', 2: 'C' } });
test('migration deep-copies all fields; validates versions and complete PINs before writing', () => {
 const v1 = fixture(), before = structuredClone(v1), v2 = D.migrate(v1, '2026-01-01', 1000000);
 assert.deepEqual(v1, before); assert.deepEqual(v2.pinData, before.pinData);
 v2.pinData[0].weekData['2026W01'].cell01 = 9; assert.equal(v1.pinData[0].weekData['2026W01'].cell01, 3);
 assert.equal(v2.dataset, 'sstm-v2'); assert.deepEqual(v2.cycleJournal, D.emptyJournal());
 for (const bad of [{ ...v1, pinData: v1.pinData.slice(1) }, { ...v1, schemaVersion: 99 }, { ...v2, dataVersion: 2 }, { ...v2, cycleJournal: null }, { ...v1, pinData: [null, ...v1.pinData.slice(1)] }]) assert.throws(() => D.validate(bad));
 assert.throws(() => D.migrate(v2));
});
test('account namespaces and atomic rollback preserve v1 and other accounts', () => {
 const map = new Map([['trckng_sstm_data_pin0', 'v1']]);
 const backing = { getItem: k => map.get(k), setItem: (k, v) => map.set(k, v) };
 const a = D.storage(backing, 'a'), b = D.storage(backing, 'b');
 a.transaction(() => { a.setItem('counter', 1); a.setItem('label', 'A'); }); b.setItem('counter', 2);
 assert.throws(() => a.transaction(() => { a.clear(); a.setItem('counter', 99); throw Error('quota/app failure'); }));
 assert.equal(a.getItem('counter'), '1'); assert.equal(a.getItem('label'), 'A'); assert.equal(b.getItem('counter'), '2');
 a.transaction(() => { a.clear(); a.setItem('new', 'ok'); }); assert.equal(a.getItem('counter'), null);
 assert.equal(map.get('trckng_sstm_data_pin0'), 'v1');
});
test('cycles cross midnight/24 hours, names never add duration, explicit end preserves history', () => {
 let n = 0; const id = () => String(++n), start = Date.UTC(2026, 0, 1, 22);
 let journal = D.point(D.emptyJournal(), start, false, id);
 journal = D.point(journal, start + 26 * 3600000, false, id);
 assert.equal(journal.cycles.length, 1); assert.equal(journal.cycles[0].startedAt, start);
 const c = journal.cycles[0]; journal = D.annotate(journal, c.id, c.points[0].id, 'interval', 'Example');
 assert.equal(journal.cycles[0].points.length, 2);
 assert.throws(() => D.point(journal, start + 1, false, id));
 journal = D.point(journal, start + 27 * 3600000, true, id); assert.equal(journal.active, null);
 const ended = structuredClone(journal.cycles[0]);
 assert.throws(() => D.point(journal, start + 1, false, id));
 journal = D.point(journal, start + 28 * 3600000, false, id);
 assert.deepEqual(journal.cycles[0], ended); assert.equal(journal.cycles.length, 2);
 D.validateJournal(journal);
 for (const mutate of [j => j.cycles[0].points.reverse(), j => j.active = 'missing', j => j.cycles[1].startedAt = 0, j => j.cycles[0].endedAt++, j => j.cycles[0].names.missing = 'x']) {
  const bad = structuredClone(journal); mutate(bad); assert.throws(() => D.validateJournal(bad));
 }
});

test('time repairs keep identities, originals and adjacent boundaries, reject stale edits', () => {
 const start = Date.UTC(2026, 0, 1), hour = 3600000, now = start + 10 * hour;
 let j = D.point(D.emptyJournal(), start); j = D.point(j, start + hour); j = D.point(j, start + 2 * hour, true);
 j = D.point(j, start + 3 * hour); j = D.point(j, start + 4 * hour);
 const original = structuredClone(j), c = j.cycles[0], id = c.points[1].id;
 j = D.changeTime(j, c.id, id, start + hour / 2, JSON.stringify(c), now);
 assert.equal(j.cycles[0].points[1].id, id); assert.equal(j.cycles[0].points[1].at, start + hour / 2);
 assert.deepEqual(j.edits[0].before, { at: start + hour }); assert.equal(original.cycles[0].points[1].at, start + hour);
 assert.throws(() => D.changeTime(j, c.id, id, start + hour, JSON.stringify(c), now), /изменилась/);
 for (const at of [start, start + 2 * hour, now + 1, NaN]) assert.throws(() => D.changeTime(j, c.id, id, at, undefined, now));
 assert.throws(() => D.changeTime(j, c.id, c.points.at(-1).id, start + 3 * hour + 1, undefined, now), /пересекаться/);
 assert.throws(() => D.changeTime(j, j.cycles[1].id, j.cycles[1].points[0].id, start + hour, undefined, now), /пересекаться/);
 const changedStart = D.changeTime(j, c.id, c.points[0].id, start - hour, undefined, now);
 assert.equal(changedStart.cycles[0].startedAt, start - hour);
 const changedEnd = D.changeTime(j, c.id, c.points.at(-1).id, start + 3 * hour, undefined, now);
 assert.equal(changedEnd.cycles[0].endedAt, start + 3 * hour); D.validateJournal(changedEnd);
 const v2 = D.migrate(fixture()); v2.cycleJournal = changedEnd; D.validate(JSON.parse(JSON.stringify(v2)));
});

test('tags classify without duplicating time; removing the last point preserves originals and previous labels', () => {
 let j = D.point(D.emptyJournal(), 1000); j = D.point(j, 2000); j = D.point(j, 3000);
 const c = j.cycles[0], [a, b, last] = c.points;
 j = D.annotate(j, c.id, b.id, 'interval', 'Keep interval'); j = D.annotate(j, c.id, last.id, 'point', 'Removed marker');
 j = D.annotate(j, c.id, last.id, 'interval', 'Retain in audit');
 j = D.tagInterval(j, c.id, b.id, '#Work work, #Example'); j = D.tagInterval(j, c.id, last.id, 'discarded');
 assert.deepEqual(j.cycles[0].tags[b.id], ['work', 'example']); assert.equal(j.cycles[0].points.length, 3);
 assert.throws(() => D.tagInterval(j, c.id, a.id, 'x'.repeat(41)));
 const old = JSON.stringify(j.cycles[0]), before = structuredClone(j);
 j = D.removeLastPoint(j, c.id, old, 4000);
 assert.equal(j.cycles[0].points.length, 2); assert.equal(j.cycles[0].names[b.id], 'Keep interval');
 assert.deepEqual(j.cycles[0].tags[b.id], ['work', 'example']); assert.equal(j.edits[0].before.intervalName, 'Retain in audit');
 assert.equal(j.edits[0].before.point.name, 'Removed marker'); assert.deepEqual(j.edits[0].before.tags, ['discarded']);
 assert.equal(before.cycles[0].points.length, 3); assert.throws(() => D.removeLastPoint(j, c.id, old), /изменилась/);
 j = D.point(j, 5000, true); assert.throws(() => D.tagInterval(j, c.id, j.cycles[0].points.at(-1).id, 'no-interval'));
 j = D.removeLastPoint(j, c.id); assert.equal(j.active, c.id); assert.equal(j.cycles[0].endedAt, null);
 j = D.point(j, 6000, true); j = D.point(j, 7000);
 assert.throws(() => D.removeLastPoint(j, c.id), /последней записи/);
 const newId = j.active; j = D.removeLastPoint(j, newId); assert.equal(j.cycles.length, 1); assert.equal(j.active, null);
 D.validateJournal(j); assert.equal(j.edits.at(-1).before.point.at, 7000);
 const bad = structuredClone(j); bad.edits[0].before.point = null; assert.throws(() => D.validateJournal(bad));
});
