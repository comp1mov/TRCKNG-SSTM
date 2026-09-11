const { test } = require('node:test'), assert = require('node:assert/strict');
const M = require('../v2/moments.js'), D = require('../v2/data.js'), Modules = require('../v2/modules.js');
const source = { pin: 1, cellId: 'cell08', label: 'Fixture' };
test('marks capture one instant without splitting recordings; repeat submit is idempotent', () => {
 let j = D.point(D.emptyJournal(), 1000); j = D.point(j, 2000); const before = structuredClone(j.cycles);
 j = M.record(j, { id: 'a', kind: 'tag', at: 2000, now: 3000, source, text: '#ИДЕЯ идея, #Test', offsetMinutes: 0 });
 assert.deepEqual(j.cycles, before); assert.equal(j.version, 2); D.validateJournal(j);
 assert.deepEqual(j.moments[0].tags, ['идея', 'test']); assert.equal(j.moments[0].at, 2000);
 assert.equal(M.intervalAt(j, 2000, 3000).pointId, j.cycles[0].points[1].id);
 assert.equal(M.record(j, { id: 'a' }).moments.length, 1);
 const canceled = M.remove(j, 'a', 4000); assert.equal(canceled.moments[0].deletedAt, 4000); assert.equal(j.moments[0].deletedAt, undefined);
 for (const text of ['', 'a'.repeat(41), Array.from({ length: 13 }, (_, i) => `t${i}`).join(' ')]) assert.throws(() => M.record(j, { kind: 'tag', at: 2000, now: 3000, source, text }));
 assert.throws(() => M.record(j, { kind: 'tag', at: 4000, now: 3000, source, text: 'future' }));
});
test('one state per press, custom words are retained and duplicate names are rejected', () => {
 let j = M.addOption(D.emptyJournal(), '  Поток  ', 'flow');
 assert.equal(j.moments.length, 0, 'Configuring a word creates no observation');
 assert.throws(() => M.addOption(j, 'поток')); assert.throws(() => M.addOption(j, 'Хорошо')); assert.throws(() => M.addOption(j, ''));
 j = M.record(j, { kind: 'state', stateId: 'flow', at: 1000, now: 2000, source });
 j = M.record(j, { kind: 'state', stateId: 'calm', at: 1001, now: 2001, source });
 assert.deepEqual(j.moments.map(m => m.state.label), ['Поток', 'Спокойно']); assert.equal(j.cycles.length, 0);
 assert.throws(() => M.record(j, { kind: 'state', stateId: 'missing', at: 1000, now: 2000, source }));
});
test('weeks collect observations and overlapping tagged intervals; half-open boundary and cancel work', () => {
 const monday = new Date(2026, 8, 7).getTime(), nextMonday = new Date(2026, 8, 14).getTime();
 let j = D.point(D.emptyJournal(), monday - 1000); j = D.point(j, monday + 1000, true);
 j = D.tagInterval(j, j.cycles[0].id, j.cycles[0].points[0].id, 'across');
 j = M.record(j, { kind: 'tag', text: 'first', at: monday, now: monday, source });
 j = M.record(j, { kind: 'state', stateId: 'calm', at: nextMonday, now: nextMonday, source });
 const w = M.week(j, monday, nextMonday); assert.equal(w.entries.length, 2); assert.deepEqual(w.tags.map(t => t[0]).sort(), ['across', 'first']);
 assert.equal(M.week(j, nextMonday, nextMonday).entries.length, 1);
 assert.equal(M.intervalAt(j, monday + 1000, nextMonday), null);
 assert.equal(M.week(M.remove(j, j.moments[0].id), monday).entries.length, 1);
});
test('journal version and local envelope protect old clients; exports validate complete data', () => {
 const journal = M.upgrade(D.emptyJournal()), backing = new Map(), store = D.storage({ getItem: k => backing.get(k), setItem: (k, v) => backing.set(k, v) }, 'fixture');
 store.setItem('sstm_v2_cycles', JSON.stringify(journal)); assert.equal(JSON.parse(backing.get(store.keyName)).version, 3);
 assert.notEqual(journal.version, 1, 'Earlier journal validators reject the new journal');
 const snap = { schemaVersion: 4, snapshotType: 'fullApp', dataset: 'sstm-v2', dataVersion: 2, moduleJournal: Modules.empty(), cycleJournal: journal, pinData: [0, 1, 2].map(pin => ({ pin, habitLabels: { cell01: 'Fixture' }, habitTypes: { cell01: 'tag' }, weekData: {} })) };
 D.validate(snap); D.validate(JSON.parse(JSON.stringify(snap)));
 for (const bad of [{ ...snap, cycleJournal: D.emptyJournal() }, { ...snap, dataVersion: 1 }, { ...snap, cycleJournal: { ...journal, stateOptions: null } }]) assert.throws(() => D.validate(bad));
 assert.equal(D.storage({ getItem: k => backing.get(k), setItem: (k, v) => backing.set(k, v) }, 'fixture').getItem('sstm_v2_cycles'), JSON.stringify(journal));
});
