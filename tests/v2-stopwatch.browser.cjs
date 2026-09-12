// Isolated invented history, with all external networking blocked.
const pw=require('playwright'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const engine=process.env.SSTM_BROWSER||'chromium', output=path.join(require('node:os').tmpdir(),'sstm-stopwatch',engine);fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await pw[engine].launch({headless:true,...(engine==='chromium'?{channel:'msedge'}:{})});
 try {
  const ctx=await browser.newContext({viewport:{width:1280,height:1000},timezoneId:'UTC',serviceWorkers:'block'});
  await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  const page=await ctx.newPage(), errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo&lang=en'); await page.locator('#stopwatchSettings').waitFor({state:'attached'});
  const fixed=new Date('2026-09-12T12:00:00Z'); await page.clock.setFixedTime(fixed);
  const edit=id=>page.evaluate(id=>openCellEditModal(id),id);
  const save=()=>page.locator('#cellEditSave').click();
  const capture=()=>page.evaluate(()=>JSON.stringify([habitTypes,weekData,durationStates,durationSessions,counterChangeLog]));
  for(const [id,type] of [['cell02','duration_min'],['cell04','duration_sec'],['cell09','duration_sec_count']]) {
   await page.evaluate(({id,type})=>{
    habitTypes[id]=type;durationStates[id]={isRunning:false,startTime:null,accumulated:65,lastSession:65};
    weekData[currentWeekKey][id]=type==='duration_min'?1:65;
    durationSessions.push({id:'fixture-'+id,habit:id,startTime:Date.now()-65000,endTime:Date.now(),week:currentWeekKey,source:type});
    saveTypes();saveDurationStates();saveWeekData();saveDurationSessions();renderHabits();
   },{id,type});
   const before=await capture();
   for(const [format,expected] of [['clock','00:01:05'],['minutes','1.08min'],['hours','0.018h'],['seconds','65s'],['clock','00:01:05']]) {
    await edit(id);
    assert.equal(await page.locator('#creationTypes [data-type=duration_min]').isVisible(),false);
    assert.equal(await page.locator('#creationTypes [data-type=duration_sec_count]').isVisible(),false);
    await page.locator('#creationTypes [data-type=duration_sec]').click();
    await page.locator('#stopwatchMode').selectOption('week');await page.locator('#stopwatchFormat').selectOption(format);await save();
    assert.equal(await capture(),before,'Changing a view never converts raw totals, changes source or records a session');
    assert.equal((await page.locator(`#value-${id}`).textContent()).replace(/\s/g,''),expected);
    assert.equal(await page.locator(`#breakdown-${id}`).textContent(),'THIS WEEK');
   }
  }
  // Cancel and parked drafts: neither writes settings nor starts/stops a timer.
  const saved=await page.evaluate(()=>TRCKNG_STORAGE.getItem(SstmStopwatch.key));
  await edit('cell02');await page.locator('#stopwatchFormat').selectOption('hours');await page.locator('.surface-brand').click();
  await page.locator('#surfaceDock button').click();assert.equal(await page.locator('#stopwatchFormat').inputValue(),'hours');
  await page.locator('#cellEditCancel').click();assert.equal(await page.evaluate(()=>TRCKNG_STORAGE.getItem(SstmStopwatch.key)),saved);
  await edit('cell02');assert.equal(await page.locator('#stopwatchFormat').inputValue(),'clock');await page.locator('#cellEditCancel').click();
  // A running minute-backed source keeps exact start/accumulation while switching.
  await page.locator('#btn-cell02').click();await page.clock.setFixedTime(new Date(fixed.getTime()+65000));
  const running=await capture();await edit('cell02');await page.locator('#stopwatchMode').selectOption('interval');await save();assert.equal(await capture(),running);
  await page.evaluate(()=>updateLiveDisplays());assert.equal(await page.locator('#value-cell02').textContent(),'00:01:05');
  await page.locator('#btn-cell02').click();assert.equal(await page.evaluate(()=>durationStates.cell02.lastSession),65);
  assert.equal(await page.evaluate(()=>durationStates.cell02.accumulated),130);
  // Full snapshot roundtrip into a new page represents reload/device adoption.
  const snapshot=await page.evaluate(()=>buildCloudSnapshot());assert.equal(snapshot.schemaVersion,5);assert.equal(snapshot.dataVersion,2);
  const other=await ctx.newPage();await other.goto('http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo&lang=en');await other.locator('#stopwatchSettings').waitFor({state:'attached'});
  await other.evaluate(s=>applyCloudSnapshot(s),snapshot);
  assert.deepEqual(await other.evaluate(()=>buildCloudSnapshot().stopwatchJournal),snapshot.stopwatchJournal);
  assert.equal(await other.locator('#value-cell02').textContent(),'00:01:05');await other.close();
  // A stale editor cannot replace a view received while the draft was parked.
  await edit('cell02');await page.locator('#stopwatchFormat').selectOption('hours');
  await page.evaluate(()=>TRCKNG_STOPWATCH.set(0,'cell02','duration_min',{mode:'week',format:'seconds'}));
  await save();assert.equal(await page.locator('.surface-stale').isVisible(),true);await page.locator('#cellEditCancel').click();
  // New generic controls use a seconds source, clock/interval defaults and normal tap.
  await page.locator('.field-add-slot').first().click();await page.locator('#cellEditInput').fill('Time fixture');
  await page.locator('[data-creation-group=time]').click();await page.locator('#creationTypes [data-type=duration_sec]').click();
  assert.equal(await page.locator('#stopwatchMode').inputValue(),'interval');assert.equal(await page.locator('#stopwatchFormat').inputValue(),'clock');await save();
  const added=await page.evaluate(()=>HABITS.find(h=>habitLabels[h]==='Time fixture'));
  assert.ok(added, await page.evaluate(()=>JSON.stringify({visible:document.querySelector('#cellEditModal').className,label:document.querySelector('#cellEditInput').value,errors:[...document.querySelectorAll('.cell-layout-error,.surface-stale')].map(n=>n.textContent),labels:habitLabels,editingHabit,pendingNewCell})));
  await page.locator(`#btn-${added}`).click();assert.equal(await page.evaluate(h=>durationStates[h].isRunning,added),true);await page.locator(`#btn-${added}`).click();
  // Sunday-to-Monday rollover keeps the logical current interval while splitting weekly totals.
  await page.clock.setFixedTime(new Date('2026-09-14T00:01:00Z'));
  await page.evaluate(()=>{
    const prior=getWeekKey(new Date('2026-09-13T23:59:00Z')), next=getWeekKey();
    durationStates.cell02={isRunning:true,startTime:Date.parse('2026-09-13T23:59:00Z'),accumulated:65};
    currentWeekKey=next;ensureWeekExists();rolloverDurationStatesForNewWeek(prior,next);
    TRCKNG_STOPWATCH.set(0,'cell02','duration_min',{mode:'interval',format:'clock'});renderHabits();
  });
  assert.equal(await page.locator('#value-cell02').textContent(),'00:02:00');
  assert.equal(await page.evaluate(()=>computeDurationTotalSeconds('cell02')),60);
  await page.locator('#btn-cell02').click();assert.equal(await page.evaluate(()=>durationStates.cell02.lastSession),120);
  assert.equal(await page.evaluate(()=>durationStates.cell02.accumulated),60);
  // Wide/narrow screens and language switching retain a readable preview and draft.
  for(const [width,height,lang] of [[1280,1000,'en'],[768,1024,'en'],[390,844,'ru'],[320,700,'en'],[844,390,'en']]) {
    await page.setViewportSize({width,height});await page.evaluate(l=>SstmI18n.setLanguage(l),lang);await edit('cell02');
    await page.locator('#stopwatchMode').selectOption('week');await page.locator('#stopwatchFormat').selectOption('hours');
    for(const selector of ['#stopwatchMode','#stopwatchFormat','#stopwatchPreview']) {
      await page.locator(selector).scrollIntoViewIfNeeded();const b=await page.locator(selector).boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width+1);assert.ok(b.height>=44);
    }
    await page.screenshot({path:path.join(output,`editor-${width}-${lang}.png`)});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.locator('#cellEditCancel').click();
  }
  await edit(added); await page.locator('#creationAdvanced summary').click();
  await page.locator('#cellEditReset').click(); await page.locator('#cellEditReset').click();
  assert.equal(await page.evaluate(id=>TRCKNG_STOPWATCH.read().views.some(v=>v.cellId===id&&v.pin===0),added),false,'Reset removes stale presentation from a reusable cell');
  assert.deepEqual(errors,[]);console.log('PASS: unified legacy views, precision, source identities, live capture, week rollover, defaults, draft/cancel/stale protection, snapshot adoption and five EN/RU layouts.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
