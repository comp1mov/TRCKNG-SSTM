const { test } = require('node:test'), assert = require('node:assert/strict');
const M = require('../v2/moments.js'), D = require('../v2/data.js'), C = require('../v2/state-catalog.js'), Modules = require('../v2/modules.js');
const source = { pin: 0, cellId: 'fixture', label: 'Example' };
test('64 unique translated choices, four paged groups and original quick IDs', () => {
 assert.equal(C.entries.length, 64); assert.equal(new Set(C.entries.map(o => o.id)).size, 64); assert.equal(new Set(C.entries.map(o => o.label)).size, 64);
 assert.deepEqual(C.legacyDefaults.map(o => o.id), ['good', 'calm', 'joy', 'energy', 'tired', 'worry', 'sad', 'unsure']);
 assert.deepEqual(C.groups.map(g => g.states.length), [16, 16, 16, 16]);
 const sandbox = { window: {} }; require('node:vm').runInNewContext(require('node:fs').readFileSync(require.resolve('../v2/translations.js'), 'utf8'), sandbox);
 const translated = new Map(sandbox.window.SstmTranslations.trim().split('\n').map(s => s.split('|')));
 for (const o of C.entries) assert.equal(translated.get(o.label), o.en, o.id);
});
test('everyday phrases and either language find choices without recording or renaming custom words', () => {
 const j = { ...M.upgrade(D.emptyJournal()), stateOptions: [{ id: 'mine', label: 'Нежность' }] }, before = JSON.stringify(j);
 for (const [query, id] of [['злюсь', 'angry'], ['СКУЧАЮ', 'longing'], ['не знаю', 'unsure'], ['looking forward', 'anticipation'], ['вовлеченность', 'engaged'], ['всё равно', 'apathetic']]) {
  assert.ok(M.search(j, query).some(o => o.id === (id === 'unsure' ? id : `sstm:state:${id}`)), query);
 }
 assert.equal(M.search(j, 'tender')[0].id, 'mine'); assert.equal(M.groupOptions(j, 'ease').find(o => o.label === 'Нежность').id, 'mine');
 assert.equal(M.options(j).filter(o => o.label === 'Нежность').length, 1); assert.equal(JSON.stringify(j), before);
 assert.deepEqual(M.search(j, 'no-such-fixture-word'), []);
});
test('new presets upgrade once; old choices, tags and trash cannot downgrade a v4 journal', () => {
 let j = M.record(D.emptyJournal(), { stateId: 'sstm:state:tender', kind: 'state', at: 1000, now: 1100, source }); assert.equal(j.version, 4);
 assert.deepEqual(j.moments[0].state, { id: 'sstm:state:tender', label: 'Нежность' }, 'Aliases are lookup data, not copied into observations');
 assert.throws(() => D.validateJournal({ ...j, version: 3 }));
 j = M.record(j, { stateId: 'calm', kind: 'state', at: 1200, now: 1300, source });
 j = M.record(j, { stateId: 'sstm:state:inspired', kind: 'state', at: 1400, now: 1500, source });
 j = M.record(j, { kind: 'tag', text: 'fixture', at: 1600, now: 1700, source });
 j = D.point(j, 2000); j = D.point(j, 3000, true); j = D.setDeleted(j, j.cycles[0].id, null, true, undefined, 4000);
 assert.equal(j.version, 4); D.validateJournal(j);
 const backing = new Map(), store = D.storage({ getItem: k => backing.get(k), setItem: (k, v) => backing.set(k, v) }, 'fixture');
 store.setItem('sstm_v2_cycles', JSON.stringify(j)); assert.equal(JSON.parse(backing.get(store.keyName)).version, 5);
 const snapshot = { schemaVersion: 4, snapshotType: 'fullApp', dataset: 'sstm-v2', dataVersion: 2, moduleJournal: Modules.empty(), cycleJournal: j, pinData: [0, 1, 2].map(pin => ({ pin, habitLabels: { cell01: 'Example' }, habitTypes: { cell01: 'state' }, weekData: {} })) };
 assert.deepEqual(D.validate(JSON.parse(JSON.stringify(snapshot))), snapshot);
 const old = require('node:child_process').execFileSync('git', ['show', '6ab42eb55519bdc018a0b8162565a04ddea89c2c:v2/data.js'], { encoding: 'utf8' });
 const sandbox = { module: { exports: {} }, require: name => name === './moments.js' ? M : Modules };
 require('node:vm').runInNewContext(old, sandbox);
 assert.throws(() => sandbox.module.exports.validate(snapshot), 'Released 0.7.0 refuses the new journal before overwriting it');
 assert.throws(() => sandbox.module.exports.storage({ getItem: k => backing.get(k) }, 'fixture').getItem('sstm_v2_cycles'), 'Old offline client refuses the new local envelope');
});
