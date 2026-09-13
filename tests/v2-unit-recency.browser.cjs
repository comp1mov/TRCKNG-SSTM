const { chromium } = require('playwright'), assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true,channel:'msedge'});
 try {
  const ctx = await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await ctx.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  const page = await ctx.newPage(), errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo&lang=ru';
  await page.goto(url); await page.locator('#unitView').waitFor({state:'attached'});
  const now=Date.parse('2026-09-13T12:00:00Z'); await page.clock.setFixedTime(now);
  await page.evaluate(() => {
   habitTypes.cell01='unit'; habitLabels.cell01='Fixture'; unitSettings.cell01={step:1,total:false};
   weekData[currentWeekKey].cell01=4; counterChangeLog=[];counterLastUpdate.cell01=Date.now()-48*3600000;
   saveTypes();saveLabels();saveUnitSettings();saveWeekData();saveCounterChangeLog();saveCounterLastUpdate();renderHabits();
  });
  const edit=()=>page.evaluate(()=>openCellEditModal('cell01'));
  await edit();await page.locator('#unitView').selectOption('elapsed');await page.locator('#unitConfirmTap').check();await page.locator('#cellEditSave').click();
  assert.equal(await page.locator('#value-cell01').textContent(),'—');
  const before=await page.evaluate(()=>JSON.stringify([weekData,counterLastUpdate,counterChangeLog,unitSettings]));
  page.once('dialog',d=>d.dismiss());await page.locator('#btn-cell01').click();
  assert.equal(await page.evaluate(()=>JSON.stringify([weekData,counterLastUpdate,counterChangeLog,unitSettings])),before);
  page.once('dialog',d=>d.accept());await page.locator('#btn-cell01').click();
  assert.equal(await page.evaluate(()=>weekData[currentWeekKey].cell01),5);
  assert.equal(await page.evaluate(()=>unitSettings.cell01.lastMarkAt),now);
  await page.clock.setFixedTime(now+47*3600000+59*60000);await page.evaluate(()=>updateLiveDisplays());
  assert.match(await page.locator('#value-cell01').textContent(),/47:59/);
  await page.clock.setFixedTime(now+48*3600000);await page.evaluate(()=>updateLiveDisplays());
  assert.match(await page.locator('#value-cell01').textContent(),/2.*дня/);
  await page.evaluate(()=>decreaseMode=true);page.once('dialog',d=>d.accept());await page.locator('#btn-cell01').click();
  assert.equal(await page.evaluate(()=>unitSettings.cell01.lastMarkAt),now);
  await page.evaluate(()=>{decreaseMode=false;undoLastCounterChange();});
  page.once('dialog',d=>d.accept());await page.locator('#btn-cell01').click();
  assert.equal(await page.evaluate(()=>unitSettings.cell01.lastMarkAt),now+48*3600000);
  await page.evaluate(()=>undoLastCounterChange());assert.equal(await page.evaluate(()=>unitSettings.cell01.lastMarkAt),now);
  const snapshot=await page.evaluate(()=>buildCloudSnapshot());
  const other=await ctx.newPage();await other.goto(url);await other.locator('#unitView').waitFor({state:'attached'});await other.evaluate(s=>applyCloudSnapshot(s),snapshot);
  assert.deepEqual(await other.evaluate(()=>unitSettings.cell01),await page.evaluate(()=>unitSettings.cell01));
  await other.clock.setFixedTime(now);
  await other.evaluate(()=>{currentWeekKey=getWeekKey();undoLastCounterChange();});assert.equal(await other.evaluate(()=>unitSettings.cell01.lastMarkAt),null);
  await other.close();
  await page.evaluate(()=>{loadUnitSettings();loadCounterChangeLog();renderHabits();});
  assert.equal(await page.evaluate(()=>unitSettings.cell01.lastMarkAt),now);
  // A decrease at zero is a no-op, including timestamps and history.
  const noOp=await page.evaluate(()=>{
   unitSettings.cell01.confirmTap=false;weekData[currentWeekKey].cell01=0;decreaseMode=true;
   const before=JSON.stringify([counterLastUpdate,counterChangeLog,unitSettings]);handleUnitClick('cell01');decreaseMode=false;
   return before===JSON.stringify([counterLastUpdate,counterChangeLog,unitSettings]);
  });assert.equal(noOp,true);await page.evaluate(()=>saveUnitSettings());
  // Cancel preserves the saved view; a parked editor rejects changed settings.
  await edit();await page.locator('#unitView').selectOption('count');await page.locator('#cellEditCancel').click();assert.equal(await page.evaluate(()=>unitSettings.cell01.view),'elapsed');
  await edit();await page.evaluate(()=>{unitSettings.cell01.confirmTap=true;saveUnitSettings();});await page.locator('#cellEditSave').click();
  assert.equal(await page.locator('.surface-stale').isVisible(),true);await page.locator('#cellEditCancel').click();
  for (const width of [320,390,768,1280]) {
   await page.setViewportSize({width,height:900});await edit();await page.locator('#unitView').scrollIntoViewIfNeeded();
   const b=await page.locator('#unitView').boundingBox();assert.ok(b.width>0&&b.x>=0&&b.x+b.width<=width+1);
   await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),`unit-recency-${width}.png`)});
   await page.locator('#cellEditCancel').click();
  }
  await page.evaluate(()=>{previousWeekPreview=true;renderHabits();updateLiveDisplays();});assert.doesNotMatch(await page.locator('#value-cell01').textContent(),/дня|:/);
  assert.deepEqual(errors,[]);
  console.log('PASS: UNIT editor, confirmation/cancel, live 48-hour switch, decrease/undo, snapshot adoption, stale drafts and responsive layouts.');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
