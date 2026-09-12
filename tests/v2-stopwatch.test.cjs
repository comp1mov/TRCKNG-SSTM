const { test } = require('node:test'), assert = require('node:assert/strict');
const S = require('../v2/stopwatch.js'), D = require('../v2/data.js'), M = require('../v2/modules.js');
const now = Date.UTC(2026, 8, 12, 12);
test('formats read one precise duration without mutating legacy minute aggregates', () => {
  const input = { type: 'duration_min', stored: 1, state: { accumulated: 65, startTime: null, isRunning: false } };
  const before = structuredClone(input);
  assert.equal(S.total(input), 65);
  assert.equal(S.format(S.total(input), 'minutes').main, '1.08');
  assert.equal(S.format(S.total(input), 'hours').main, '0.018');
  assert.equal(S.format(S.total(input), 'seconds').main, '65');
  assert.equal(S.format(S.total(input), 'clock').main, '00:01:05');
  assert.deepEqual(input, before);
  assert.equal(S.total({type:'duration_min',stored:9}),540);
  assert.equal(S.total({type:'duration_min',stored:9,state:{accumulated:0}}),0,'A known zero is not replaced by an old aggregate');
});
test('interval and week total stay distinct across rollover, stopped logs and missing detail', () => {
  const state={isRunning:true,startTime:now-5000,sessionStartedAt:now-65000,accumulated:10};
  assert.equal(S.total({state,type:'duration_sec',now}),15);
  assert.equal(S.interval({state,now}),65);
  const sessions=[{habit:'a',startTime:now-65000,endTime:now},{habit:'b',startTime:now-999000,endTime:now}];
  assert.equal(S.interval({habit:'a',sessions,now}),65);
  assert.equal(S.interval({habit:'a',sessions,state:{lastSession:0},now}),0);
  assert.equal(S.interval({habit:'a',sessions:[],now}),null);
  assert.equal(S.format(null,'clock').main,'—');
  assert.equal(S.format(100*3600+65,'clock').main,'100:01:05');
});
test('classic presets recover whole minutes, short clocks and simultaneous total/interval context', () => {
  const args={type:'duration_min',stored:1,state:{accumulated:65,lastSession:40,isRunning:false},habit:'a',now};
  assert.deepEqual(S.presentation(args,{preset:'minutes'}),{main:'01',suffix:'min',breakdown:'THIS WEEK · 0h 1m 5s'});
  assert.equal(S.presentation(args,{preset:'seconds'}).main,'65');
  assert.deepEqual(S.presentation(args,{preset:'classic'}),{main:'00:40',suffix:'',breakdown:'THIS WEEK · 0h 1m 5s'});
  assert.equal(S.presentation(args,{preset:'clock'}).breakdown,'THIS WEEK · LAST 00:40');
  assert.equal(S.autoClock(3605),'1:00:05');
  assert.equal(S.presentation(args,{mode:'week',format:'minutes'}).main,'1.08','An explicit saved 0.9 format stays readable until a preset is chosen');
});
test('last completed interval survives starting another run and excludes that run’s weekly fragments', () => {
  const sessions=[{habit:'a',startTime:now-180000,endTime:now-65000},{habit:'a',startTime:now-60000,endTime:now-5000}];
  const args={state:{isRunning:true,startTime:now-5000,sessionStartedAt:now-60000,lastSession:0},sessions,habit:'a',now,type:'duration_sec'};
  assert.equal(S.last(args),115,'An old running zero falls back to a real preceding session');
  assert.equal(S.presentation(args,{preset:'last'}).breakdown,'LAST · CURRENT 01:00');
  assert.equal(S.presentation(args,{preset:'last'}).main,'01:55');
  assert.equal(S.last({...args,state:{...args.state,lastSession:3605,lastSessionIsSaved:true}}),3605);
  assert.equal(S.last({state:{lastSession:0,lastSessionIsSaved:true}}),0,'A recorded zero-length session is known');
  assert.equal(S.last({state:{isRunning:true,startTime:now-5000,lastSession:0},sessions:[],now}),null,'A first run has no fabricated previous session');
});
test('versioned views roundtrip and reject unsupported/downgraded formats before applying', () => {
  const j={version:1,views:[{pin:0,cellId:'a',mode:'week',format:'hours'}]};
  const snapshot={schemaVersion:5,snapshotType:'fullApp',dataset:'sstm-v2',dataVersion:2,cycleJournal:D.emptyJournal(),moduleJournal:M.empty(),stopwatchJournal:j,
    pinData:[0,1,2].map(pin=>({pin,habitLabels:{a:'Fixture'},habitTypes:{a:'duration_min'},weekData:{},durationSessions:[],counterChangeLog:[]}))};
  D.validate(JSON.parse(JSON.stringify(snapshot)));
  for(const change of [s=>s.schemaVersion=4,s=>delete s.stopwatchJournal,s=>s.stopwatchJournal.views[0].format='days',s=>s.stopwatchJournal.views.push({...s.stopwatchJournal.views[0]})]) {
    const bad=structuredClone(snapshot); change(bad); assert.throws(()=>D.validate(bad));
  }
  const map=new Map(), backing={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)}, storage=D.storage(backing,'fixture');
  storage.setItem(S.key,JSON.stringify(j)); assert.equal(JSON.parse(map.get(storage.keyName)).version,6);
  storage.setItem('sstm_v2_cycles',JSON.stringify(D.emptyJournal())); assert.equal(JSON.parse(map.get(storage.keyName)).version,6);
  assert.throws(()=>storage.transaction(()=>{storage.setItem(S.key,'bad');throw Error('cancel');}));
  assert.deepEqual(JSON.parse(storage.getItem(S.key)),j);
  const vm=require('node:vm'), old=require('node:child_process').execFileSync('git',['show','014442a8:v2/data.js'],{encoding:'utf8'}), context={module:{exports:{}},require:p=>require('../v2/'+p.replace('./',''))};
  vm.runInNewContext(old,context); assert.throws(()=>context.module.exports.validate(snapshot));
  assert.throws(()=>context.module.exports.storage(backing,'fixture').getItem(S.key));
  const presets=structuredClone(snapshot);presets.stopwatchJournal={version:2,views:[{pin:0,cellId:'a',preset:'last'}]};D.validate(presets);
  const priorCode=require('node:child_process').execFileSync('git',['show','03fc24f:v2/stopwatch.js'],{encoding:'utf8'}), prior={module:{exports:{}}};
  vm.runInNewContext(priorCode,prior);assert.throws(()=>prior.module.exports.validate(presets.stopwatchJournal));
  assert.throws(()=>S.validate({...presets.stopwatchJournal,version:1}));
  storage.setItem(S.key,JSON.stringify(presets.stopwatchJournal));assert.equal(JSON.parse(map.get(storage.keyName)).version,7);
  storage.setItem('sstm_v2_cycles',JSON.stringify(D.emptyJournal()));assert.equal(JSON.parse(map.get(storage.keyName)).version,7);
  const priorData={module:{exports:{}},SstmStopwatch:prior.module.exports,require:p=>require('../v2/'+p.replace('./',''))};
  vm.runInNewContext(require('node:child_process').execFileSync('git',['show','03fc24f:v2/data.js'],{encoding:'utf8'}),priorData);
  assert.throws(()=>priorData.module.exports.validate(presets));
  assert.throws(()=>priorData.module.exports.storage(backing,'fixture').getItem(S.key));
});
