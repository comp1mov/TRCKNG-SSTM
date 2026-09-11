const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../v2/modules.js'), D = require('../v2/data.js');
const start = Date.UTC(2026, 0, 1, 23), hour = 3600000;
const settings = { pin: 0, cellId: 'cell01', name: 'Fixture work', rate: { amount: 120, intervalMs: hour, currency: '¤' }, display: { primary: 'money', decimals: 4, wholeHours: true } };
test('exact time × rate, gaps, complete hours, ranges and historical rate snapshots', () => {
 const original = M.empty(); let j = M.configure(original, settings); assert.equal(original.tracks.length, 0);
 j = M.toggle(j, 0, 'cell01', start);
 assert.equal(M.totals(j.tracks[0], start + 1000).money, 120 / 3600);
 assert.equal(M.totals(j.tracks[0], start + hour / 4).money, 30);
 j = M.toggle(j, 0, 'cell01', start + hour / 4);
 assert.equal(M.totals(j.tracks[0], start + hour).money, 30, 'Stopped time does not earn');
 j = M.configure(j, { ...settings, trackId: j.tracks[0].id, rate: { ...settings.rate, amount: 240 } });
 j = M.toggle(j, 0, 'cell01', start + hour); j = M.toggle(j, 0, 'cell01', start + 2 * hour);
 assert.deepEqual(M.totals(j.tracks[0]), { milliseconds: 1.25 * hour, seconds: 4500, completeHours: 1, money: 270, currency: '¤' });
 assert.equal(j.tracks[0].sessions[0].rate.amount, 120);
 assert.equal(M.totals(j.tracks[0], start + 3 * hour, start + 1.5 * hour, start + 2 * hour).money, 120);
 assert.equal(M.totals(j.tracks[0], start + 3 * hour, start + hour / 4, start + hour).money, 0);
 assert.throws(() => M.configure(j, { ...settings, trackId: j.tracks[0].id, rate: { ...settings.rate, currency: 'X' } }), /валюты/);
});
test('two views toggle one source, stale actions/edits and rate changes while running are rejected', () => {
 let j = M.configure(M.empty(), settings), id = j.tracks[0].id;
 j = M.configure(j, { ...settings, pin: 1, trackId: id, display: { primary: 'time', decimals: 2, wholeHours: false } });
 const before = structuredClone(j), stamp = M.editorStamp(j, 0, 'cell01', id), revision = j.tracks[0].revision;
 j = M.toggle(j, 1, 'cell01', start, revision);
 const sameRate = M.configure(j, { ...settings, trackId: id, rate: { currency: '¤', amount: 120, intervalMs: hour } });
 assert.equal(sameRate.tracks[0].running.start, start, 'Object key order does not change the rate');
 assert.throws(() => M.toggle(j, 0, 'cell01', start + 1000, revision), /изменилось/);
 assert.throws(() => M.configure(j, { ...settings, trackId: id, expected: stamp }), /изменился/);
 assert.throws(() => M.configure(j, { ...settings, trackId: id, rate: { ...settings.rate, amount: 1 } }), /останови/);
 assert.throws(() => M.configure(j, settings), /останови/);
 assert.throws(() => M.toggle(j, 0, 'cell01', start), /позже/);
 j = M.toggle(j, 0, 'cell01', start + hour);
 assert.equal(j.tracks.length, 1); assert.equal(j.tracks[0].sessions.length, 1); assert.equal(j.tracks[0].sessions[0].source.pin, 1);
 assert.equal(M.totals(j.tracks[0]).money, 120); assert.equal(before.tracks[0].running, null);
});
test('validate corrupt records before mutation and require supported complete snapshots', () => {
 let j = M.toggle(M.configure(M.empty(), settings), 0, 'cell01', start);
 for (const mutate of [x => x.version = 99, x => x.tracks[0].rate.amount = -1, x => x.tracks[0].running.end = start, x => x.bindings.push(x.bindings[0]), x => x.bindings = [], x => x.tracks[0].running.rate.currency = 'X']) {
  const bad = structuredClone(j); mutate(bad); assert.throws(() => M.validate(bad));
 }
 const v2 = { dataset: 'sstm-v2', dataVersion: 2, schemaVersion: 4, snapshotType: 'fullApp', cycleJournal: D.emptyJournal(), moduleJournal: j,
  pinData: [0, 1, 2].map(pin => ({ pin, habitLabels: { cell01: 'Fixture' }, habitTypes: { cell01: pin === 0 ? 'modular' : 'unit' }, weekData: {} })) };
 D.validate(JSON.parse(JSON.stringify(v2)));
 assert.throws(() => D.validate({ ...v2, dataVersion: 1 })); assert.throws(() => D.validate({ ...v2, dataVersion: 99 }));
 assert.throws(() => D.validate({ ...v2, moduleJournal: M.empty() }));
 const backing = new Map(), store = D.storage({ getItem: k => backing.get(k), setItem: (k, v) => backing.set(k, v) }, 'fixture');
 store.transaction(() => { store.setItem('sstm_v2_modules', JSON.stringify(j)); store.setItem('controls', 'present'); });
 assert.equal(JSON.parse(backing.get(store.keyName)).version, 2, 'Old clients reject upgraded local data');
 assert.equal(JSON.parse(store.getItem('sstm_v2_modules')).tracks.length, 1);
});
