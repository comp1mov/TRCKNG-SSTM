const assert=require('node:assert/strict');
const M=require('../v2/signals-model.js'), N=require('../v2/medium.js');
for (const name of Object.keys(M.presets)) {
  const settings={...M.defaults('unit','fixture'),material:M.recipe(name)};
  assert.deepEqual(M.validate(JSON.parse(JSON.stringify(settings))),settings);
}
assert.deepEqual(M.defaults('unit','stable'),M.defaults('unit','stable'));
assert.notEqual(M.defaults('unit','new',0).preset,M.defaults('unit','new',.99).preset);
assert.throws(()=>M.validate({...M.defaults('unit'),version:2}));
assert.throws(()=>M.validate({...M.defaults('unit'),fadeMinutes:NaN}));
assert.equal(M.recency(1000,1000,15),1);assert.equal(M.recency(1000,901000,15),0);assert.equal(M.recency(null,1000,15),0);
assert.ok(M.recency(1000,451000,15)>.3&&M.recency(1000,451000,15)<.5);
for (const [pattern,period] of Object.entries(M.periods)) {
  assert.equal(M.pulse(pattern,0),M.pulse(pattern,1));
  assert.ok(M.pulse(pattern,.25)>=.54-1e-12);
  assert.ok(Math.abs(60000/(60000/period)-period)<1e-9);
}
assert.equal(M.pulse('box4444',.4),1);assert.equal(M.pulse('box4444',.9),.08);
assert.ok(M.pulse('beat',.45,.95)>M.pulse('beat',.45,.3));
const a=N.createNoise(19514), b=N.createNoise(19514), c=N.createNoise(17321);
assert.equal(a(1.3,3.1,5.9),b(1.3,3.1,5.9));assert.notEqual(a(1.3,3.1,5.9),c(1.3,3.1,5.9));
console.log('PASS: portable presets, stable defaults, validation, elapsed fade, pulse periods/envelopes and seeded noise.');
