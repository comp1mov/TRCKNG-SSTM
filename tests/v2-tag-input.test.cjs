const { test } = require('node:test'), assert = require('node:assert/strict'), T = require('../v2/tag-input.js');
const journal = { moments: [
 { at: 1, tags: ['прогулка', 'проект'] }, { at: 2, tags: ['прогулка'] }, { at: 3, tags: ['скрытый'], deletedAt: 4 }
], cycles: [{ points: [{ id: 'p', at: 4 }], tags: { p: ['проба'] } }] };
test('prefix completion searches all word/interval tags, case folds, skips repeats and canceled words', () => {
 assert.deepEqual(T.suggest(journal, '#ПР'), ['прогулка', 'проба', 'проект']);
 assert.deepEqual(T.suggest(journal, '#прогулка #пр'), ['проба', 'проект']);
 assert.deepEqual(T.suggest(journal, 'ск'), []);
 assert.deepEqual(T.suggest(journal, 'несуществующий'), []);
});
test('completion replaces only the token under the caret, preserving adjacent words and separators', () => {
 assert.deepEqual(T.complete('#пр', 3, 'прогулка'), { text: '#прогулка ', caret: 10 });
 assert.deepEqual(T.complete('один, #проб, два', 9, 'проект'), { text: 'один, #проект, два', caret: 13 });
 assert.deepEqual(T.complete('', 0, 'проект'), { text: 'проект ', caret: 7 });
});
