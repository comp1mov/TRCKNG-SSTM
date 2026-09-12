const { test } = require('node:test'), assert = require('node:assert/strict');
const D = require('../v2/data.js'), M = require('../v2/moments.js'), T = require('../v2/tag-input.js'), Modules = require('../v2/modules.js');
const source = { pin: 0, cellId: 'fixture', label: 'Example' };
function fixture() {
  let j = D.emptyJournal(); for (const at of [1000, 2000, 3000, 4000]) j = D.point(j, at, at === 4000);
  const c = j.cycles[0]; j = D.annotate(j, c.id, c.points[1].id, 'interval', 'Middle'); j = D.tagInterval(j, c.id, c.points[1].id, 'middle');
  return M.record(j, { id: 'word', kind: 'tag', at: 2500, now: 4500, source, text: 'kept' });
}
test('interval trash preserves all boundaries and adjacent durations; restore is exact', () => {
  const before = fixture(), original = structuredClone(before), c = before.cycles[0], p = c.points[1];
  const j = D.setDeleted(before, c.id, p.id, true, JSON.stringify(c), 5000);
  assert.equal(j.version, 3); assert.deepEqual(j.cycles[0].points, c.points); assert.deepEqual(j.cycles[0].names, c.names); assert.deepEqual(j.cycles[0].tags, c.tags);
  assert.equal(D.intervalDeleted(j.cycles[0], p.id), true); assert.equal(D.intervalDeleted(j.cycles[0], c.points[0].id), false);
  assert.equal(M.intervalAt(j, 2500), null); assert.equal(M.intervalAt(j, 3000).pointId, c.points[2].id);
  assert.equal(M.week(j, 2500).entries.some(e => e.kind === 'interval'), false); assert.equal(M.week(j, 2500).entries.some(e => e.id === 'word'), true);
  assert.deepEqual(T.suggest(j, 'm'), []); assert.equal(j.moments[0].deletedAt, undefined);
  assert.throws(() => D.changeTime(j, c.id, p.id, 2100), /восстанови/); assert.throws(() => D.changeTime(j, c.id, c.points[2].id, 3100), /восстанови/);
  assert.throws(() => D.tagInterval(j, c.id, p.id, 'other')); assert.throws(() => D.removeLastPoint(j, c.id), /восстанови/);
  assert.throws(() => D.setDeleted(j, c.id, p.id, false, JSON.stringify(c), 6000), /изменилась/);
  const restored = D.setDeleted(j, c.id, p.id, false, JSON.stringify(j.cycles[0]), 6000);
  assert.deepEqual(restored.cycles[0].points, c.points); assert.equal(M.intervalAt(restored, 2500).pointId, p.id); assert.equal(restored.active, null);
  assert.deepEqual(before, original, 'Original input not mutated');
});
test('live deletion stops atomically and restore cannot revive the timer or overlap a later recording', () => {
  let j = D.point(D.emptyJournal(), 1000); const c = j.cycles[0];
  assert.throws(() => D.setDeleted(j, c.id, c.points[0].id, true, JSON.stringify(c), 1000));
  const deleted = D.setDeleted(j, c.id, c.points[0].id, true, JSON.stringify(c), 2000);
  assert.equal(deleted.active, null); assert.equal(deleted.cycles[0].endedAt, 2000); assert.equal(deleted.cycles[0].points.length, 2);
  j = D.point(deleted, 2100); j = D.setDeleted(j, c.id, c.points[0].id, false, JSON.stringify(j.cycles[0]), 2200);
  assert.equal(j.cycles[0].endedAt, 2000); assert.equal(j.active, j.cycles[1].id); D.validateJournal(j);
  const running = j.cycles[1]; j = D.setDeleted(j, running.id, null, true, JSON.stringify(running), 2300);
  assert.equal(j.active, null); assert.equal(D.visibleCycles(j).length, 1);
  const restored = D.setDeleted(j, running.id, null, false, JSON.stringify(j.cycles[1]), 2400);
  assert.equal(restored.active, null); assert.equal(restored.cycles[1].endedAt, 2300);
});
test('whole-record trash retains interval trash, labels and independent observations', () => {
  const before = fixture(), c = before.cycles[0];
  let j = D.setDeleted(before, c.id, c.points[1].id, true, undefined, 5000);
  j = D.setDeleted(j, c.id, null, true, undefined, 6000);
  assert.equal(D.visibleCycles(j).length, 0); assert.equal(M.intervalAt(j, 1000), null); assert.equal(j.moments[0].deletedAt, undefined);
  assert.throws(() => D.setDeleted(j, c.id, c.points[1].id, false), /существует/);
  j = D.setDeleted(j, c.id, null, false, undefined, 7000);
  assert.equal(D.visibleCycles(j).length, 1); assert.ok(j.cycles[0].deletedIntervals[c.points[1].id]);
  for (const mutate of [x => x.version = 2, x => x.cycles[0].deletedAt = 3000, x => x.cycles[0].deletedIntervals.missing = 5000, x => x.cycles[0].deletedIntervals[c.points.at(-1).id] = 5000, x => x.cycles[0].deletedIntervals[c.points[1].id] = 1000]) {
    const bad = structuredClone(j); mutate(bad); assert.throws(() => D.validateJournal(bad));
  }
});
test('preset catalog, custom collisions, records and tombstones survive protected snapshot/storage roundtrip', () => {
  assert.equal(M.defaults.length, 64); assert.equal(new Set(M.groups.flatMap(g => g.states)).size, 64);
  let j = { ...M.upgrade(D.emptyJournal()), stateOptions: [{ id: 'custom-close', label: 'Близость' }] }; D.validateJournal(j);
  assert.equal(M.options(j).filter(o => o.label === 'Близость').length, 1);
  assert.equal(M.options(j).find(o => o.label === 'Близость').id, 'custom-close');
  j = M.record(j, { kind: 'state', stateId: 'sstm:state:inspired', at: 1000, now: 2000, source });
  assert.equal(j.version, 3); assert.throws(() => D.validateJournal({ ...j, version: 2 }));
  const back = new Map(), backing = { getItem: k => back.get(k), setItem: (k, v) => back.set(k, v) }, store = D.storage(backing, 'fixture');
  store.setItem('sstm_v2_cycles', JSON.stringify(j)); assert.equal(JSON.parse(back.get(store.keyName)).version, 4);
  store.removeItem('sstm_v2_cycles'); assert.equal(JSON.parse(back.get(store.keyName)).version, 4, 'Envelope never downgrades');
  const snap = { schemaVersion: 4, snapshotType: 'fullApp', dataset: 'sstm-v2', dataVersion: 2, moduleJournal: Modules.empty(), cycleJournal: j, pinData: [0, 1, 2].map(pin => ({ pin, habitLabels: { cell01: 'Example' }, habitTypes: { cell01: 'state' }, weekData: {} })) };
  assert.deepEqual(D.validate(JSON.parse(JSON.stringify(snap))), snap);
  const deleted = M.remove(j, j.moments[0].id, 3000); assert.equal(M.week(deleted, 1000).entries.length, 0);
  assert.equal(M.week(M.restore(deleted, j.moments[0].id), 1000).entries.length, 1);
});
