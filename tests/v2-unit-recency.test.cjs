const assert = require('node:assert/strict');
const { display, lastMark } = require('../v2/unit-recency.js');
const at = 1700000000000, hour = 3600000;
assert.deepEqual(display(null, at, 'ru'), { main: '—', suffix: '', label: 'НЕТ ОТМЕТКИ' });
assert.equal(display(at, at - 1000).main, '0:00');
assert.equal(display(at, at + 24 * hour, 'ru').main, '24:00');
assert.equal(display(at, at + 48 * hour - 1000, 'ru').main, '47:59');
assert.deepEqual(display(at, at + 48 * hour, 'ru'), { main: '2', suffix: 'дня', label: 'НАЗАД' });
for (const [days, suffix] of [[5,'дней'],[11,'дней'],[21,'день'],[22,'дня'],[112,'дней']]) assert.equal(display(at, at + days * 24 * hour, 'ru').suffix, suffix);
const log = [
 { habit: 'a', source: 'unit', at, previousValue: 0, nextValue: 1 },
 { habit: 'a', source: 'unit', at: at+1, previousValue: 1, nextValue: 0 },
 { habit: 'a', source: 'unit', at: at+2, previousValue: 0, nextValue: 1, undoneAt: at+3 },
 { habit: 'b', source: 'unit', at: at+4, previousValue: 0, nextValue: 1 },
 { habit: 'a', source: 'value', at: at+5, previousValue: 0, nextValue: 8 }
];
assert.equal(lastMark({}, log, 'a'), at);
assert.equal(lastMark({lastMarkAt: null}, log, 'a'), null);
assert.equal(lastMark({lastMarkAt: at}, [], 'a'), at, 'Saved baseline survives journal truncation');
assert.equal(lastMark({}, [], 'a'), null, 'Do not invent a mark from an old update timestamp');
console.log('PASS: 24/48-hour boundaries, full days, RU pluralization, corrections, undo, unknown history and retained baseline.');
