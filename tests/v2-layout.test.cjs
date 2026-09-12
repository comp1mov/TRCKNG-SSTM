const { test } = require('node:test'), assert = require('node:assert/strict');
const L = require('../v2/layout.js');
const cell = (id, row, col, rowSpan = 1, colSpan = 1) => ({ id, label: id, layout: { row, col, rowSpan, colSpan, order: 0, visible: true } });
function check(cells, id, target, limit = 200) {
  const before = JSON.stringify(cells), plan = L.plan(cells, id, target, limit); assert.ok(plan); assert.equal(JSON.stringify(cells), before);
  const next = cells.filter(c => c.id !== id).map(c => ({ ...c, layout: plan[c.id] || c.layout })).concat({ id, layout: target });
  for (const c of next) { assert.ok(c.layout.col + c.layout.colSpan - 1 <= limit); assert.ok(c.layout.row + c.layout.rowSpan - 1 <= limit); }
  for (const c of cells.filter(c => c.id !== id)) if (plan[c.id]) { assert.equal(plan[c.id].colSpan, c.layout.colSpan); assert.equal(plan[c.id].rowSpan, c.layout.rowSpan); }
  for (let i = 0; i < next.length; i++) for (let k = i + 1; k < next.length; k++) if (next[i].layout.visible !== false && next[k].layout.visible !== false) assert.equal(L.overlaps(next[i].layout, next[k].layout), false);
  return plan;
}
test('2x2 insertion pushes a cascade one grid step, keeping other rows and sizes', () => {
  const cells = [cell('a',1,2),cell('b',1,3),cell('c',2,2),cell('d',2,3),cell('far',5,1)];
  const plan = check(cells,'new',cell('new',1,1,2,2).layout);
  assert.equal(plan.a.col,3); assert.equal(plan.b.col,4); assert.equal(plan.c.col,3); assert.equal(plan.d.col,4); assert.equal(plan.far,undefined);
});
test('mixed-size resize, edge fallback, hidden cells, no-space and invalid coordinates', () => {
  check([cell('a',1,1),cell('b',1,2,2,2),cell('c',3,2)],'a',cell('a',1,1,2,2).layout);
  const edge = check([cell('a',1,4),cell('b',2,4)],'new',cell('new',1,3,2,2).layout,4); assert.ok(Object.values(edge).some(l=>l.row===3));
  const hidden = cell('hidden',1,1); hidden.layout.visible=false;
  assert.deepEqual(Object.keys(check([hidden],'new',cell('new',1,1).layout)),['new']);
  assert.equal(L.plan([cell('a',1,1,2,2)],'new',cell('new',1,1).layout,2),null);
  assert.equal(L.plan([],'new',{...cell('new',1,1).layout,row:0}),null);
  assert.equal(L.plan([],'new',{...cell('new',1,1).layout,col:1.5}),null);
});
test('dense fields preserve every neighbour through many insertion positions', () => {
  const cells = Array.from({length:81},(_,i)=>cell(`c${i}`,Math.floor(i/9)+1,i%9+1));
  for (let row=1;row<=9;row++) for(let col=1;col<=9;col++) check(cells,`c${(row-1)*9+col-1}`,cell('x',row,col,2,2).layout);
});
