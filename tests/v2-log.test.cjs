const test=require('node:test'), assert=require('node:assert/strict'), log=require('../v2/log-model.js');
test('log combines exact timestamps across sources, respects cycle boundaries and preserves source data',()=>{
  const snapshot={pinNames:['A','B'],cycleJournal:{cycles:[{id:'c',startedAt:1000,endedAt:10000,points:[{id:'a',at:1000,name:''},{id:'b',at:10000,name:''}],names:{},checkpoints:[{id:'p',at:5000,name:'Thought',tags:['tag']}]}],moments:[{id:'m',at:7000,kind:'state',state:{label:'Calm'},source:{pin:1,cellId:'cell1'},tags:[]}]},pinData:[{pin:0,habitLabels:{cell1:'Timer'},counterChangeLog:[{id:'x',at:3000,habit:'cell2',previousValue:1,nextValue:3,undoneAt:8000}],durationSessions:[{id:'s',habit:'cell1',startTime:2000,endTime:4000}],durationStates:{cell1:{isRunning:true,startTime:11000}}}],moduleJournal:{tracks:[]}};
  const before=JSON.stringify(snapshot), rows=log.entries(snapshot,12000);
  assert.equal(JSON.stringify(snapshot),before);
  assert.deepEqual(rows.map(x=>x.at),[11000,10000,8000,7000,5000,4000,3000,2000,1000]);
  assert.equal(rows[0].elapsed,null); assert.equal(rows[1].elapsed,9000);
  assert.equal(rows.find(x=>x.kind==='value').delta,2);
  assert.equal(rows.find(x=>x.kind==='point').text,'Thought');
  assert.equal(log.clock(90061000),'25:01:01');
});
test('deleted recordings, intervals and observations are excluded without synthesizing old aggregates',()=>{
  const c={id:'c',startedAt:1000,endedAt:null,points:[{id:'a',at:1000,name:''},{id:'b',at:6000,name:''}],names:{},checkpoints:[{id:'p',at:5000,name:'Removed',tags:[]}],deletedIntervals:{a:8000}};
  const s={cycleJournal:{cycles:[c],moments:[{deletedAt:8000}]},pinData:[{pin:0,weekData:{week:{cell1:99}}}]};
  assert.deepEqual(log.entries(s,9000).map(x=>x.pointId),['b']); c.deletedAt=9000;
  assert.deepEqual(log.entries(s,9000),[]);
});
test('promoting a point to a stage produces one log row with its current note and tags',()=>{
  const c={id:'c',startedAt:1000,endedAt:null,points:[{id:'a',at:1000,name:''},{id:'b',at:6000,name:'Original'}],names:{b:'Next stage'},checkpoints:[{id:'p',at:6000,name:'Edited thought',tags:['tag']}]};
  const rows=log.entries({cycleJournal:{cycles:[c]}},9000);
  assert.equal(rows.length,2); assert.equal(rows[0].kind,'interval'); assert.equal(rows[0].pointId,'p');
  assert.equal(rows[0].text,'Edited thought'); assert.deepEqual(rows[0].tags,['tag']); assert.equal(rows[0].stage,'Next stage');
});
