const test = require('node:test'), assert = require('node:assert/strict'), D = require('../v2/data.js');
test('inner marks preserve boundaries; explicit split preserves timestamp and tags', () => {
 let j = D.point(D.emptyJournal(), 1000);
 const old = JSON.stringify(j), id = j.active;
 j = D.checkpoint(j, 2000, 'inside');
 assert.equal(j.cycles[0].points.length, 1);
 j = D.saveCheckpoint(j, id, 'inside', {name:'Stop',tags:'#road'});
 j = D.checkpoint(j, 3000, 'split');
 j = D.saveCheckpoint(j,id,'split',{name:'Arrived',tags:'#place',newInterval:true,intervalName:'Next'});
 assert.deepEqual(j.cycles[0].points.map(p=>p.at),[1000,3000]);
 assert.equal(j.cycles[0].checkpoints[0].name,'Stop');
 assert.deepEqual(j.cycles[0].checkpoints[1].tags,['place']);
 assert.throws(()=>D.saveCheckpoint(j,id,'split',{newInterval:true}));
 j=D.point(j,4000,true); D.validateJournal(JSON.parse(JSON.stringify(j)));
 assert.equal(JSON.parse(old).cycles[0].points.length,1);
 assert.throws(()=>D.checkpoint(j,5000));
});
test('checkpoint data forces a local envelope rejected by old clients',()=>{
 const values = new Map(), backing={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const storage=D.storage(backing,'synthetic'); let j=D.point(D.emptyJournal(),1000);j=D.checkpoint(j,2000);
 storage.setItem('sstm_v2_cycles',JSON.stringify(j));assert.equal(JSON.parse(values.get(storage.keyName)).version,8);
});
