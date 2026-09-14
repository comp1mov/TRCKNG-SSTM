// Synthetic demo only; no account or external service is contacted.
const {chromium}=require('playwright'), assert=require('node:assert/strict'), path=require('node:path'), os=require('node:os');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const ctx=await browser.newContext({viewport:{width:1280,height:1000},serviceWorkers:'block'});
  await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  const page=await ctx.newPage(), errors=[]; page.on('pageerror',e=>errors.push(e.stack));
  const url='http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo&lang=ru';
  await page.goto(url);await page.locator('#signalSettings').waitFor({state:'attached'});
  const edit=async id=>{await page.evaluate(id=>openCellEditModal(id),id);await page.waitForFunction(()=>document.activeElement===document.getElementById('cellEditInput'));};
  const save=()=>page.locator('#cellEditSave').click();
  const cancel=()=>page.locator('#cellEditCancel').click();
  const stored=()=>page.evaluate(()=>JSON.stringify(cellFlags));
  const records=()=>page.evaluate(()=>JSON.stringify([weekData,durationStates,durationSessions,counterChangeLog]));
  const openMaterial=async()=>{if(!await page.locator('#signalSettings').evaluate(n=>n.open))await page.locator('#signalSettings>summary').click();};
  const before=await records();
  await edit('cell01');await openMaterial();await page.locator('#signalPreset').selectOption('flow');await page.locator('#signalFade').fill('20');
  await page.locator('#cellEditColor').fill('#d9895c');await save();
  assert.equal(await records(),before);
  assert.equal(await page.evaluate(()=>cellFlags.cell01.light.preset),'flow');
  assert.equal(await page.evaluate(()=>habitColors.cell01),'#d9895c');
  let saved=await stored();
  await edit('cell01');await openMaterial();await page.locator('#signalRandom').click();await cancel();assert.equal(await stored(),saved);
  // Invalid appearance cannot partially save any record, label or color.
  await edit('cell01');await openMaterial();await page.locator('#signalFade').fill('-1');await save();
  assert.equal(await stored(),saved);assert.ok(await page.locator('.cell-layout-error').isVisible());await cancel();
  // Changed cloud flags invalidate a draft, instead of overwriting the other device.
  await edit('cell01');await page.evaluate(()=>{cellFlags.cell01.light.fadeMinutes=33;saveCellFlags();});await save();
  assert.equal(await page.locator('.surface-stale').isVisible(),true);await cancel();
  await edit('cell08');await page.locator('#signalPulsePattern').selectOption('wave44');await page.locator('#signalPulseUnit').selectOption('ms');await openMaterial();
  assert.equal(await page.locator('#signalPulseMs').inputValue(),'8000');assert.equal(await page.locator('#ledBpm').inputValue(),'7.5');
  await save();await page.locator('#btn-cell08').click();
  const origin=await page.evaluate(()=>ledStates.cell08.startedAt);assert.ok(origin>0);
  assert.equal(await page.locator('#value-cell08').textContent(),'8000');
  await page.evaluate(()=>renderHabits());assert.equal(await page.evaluate(()=>ledStates.cell08.startedAt),origin);
  await edit('cell08');await page.locator('#signalPulsePattern').selectOption('beat');await page.locator('#signalPulseMs').fill('1500');await save();
  assert.equal(await page.evaluate(()=>ledSettings.cell08.bpm),40);
  // Snapshot round-trip into a second isolated page retains settings and timing.
  const snapshot=await page.evaluate(()=>buildCloudSnapshot());
  const second=await ctx.newPage();await second.goto(url);await second.locator('#signalSettings').waitFor({state:'attached'});
  await second.evaluate(s=>applyCloudSnapshot(s),snapshot);
  assert.deepEqual(await second.evaluate(()=>cellFlags),await page.evaluate(()=>cellFlags));
  assert.equal(await second.evaluate(()=>ledStates.cell08.startedAt),origin);await second.close();
  // Live unit light follows a positive mark; decreasing and undoing a decrement do not relight it.
  await page.evaluate(()=>{unitSettings.cell01={step:1,lastMarkAt:Date.now()-99*60000};saveUnitSettings();renderHabits();});
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('btn-cell01')).getPropertyValue('--sl-light').trim()==='0');
  await page.locator('#btn-cell01').click();
  await page.waitForFunction(()=>Number(getComputedStyle(document.getElementById('btn-cell01')).getPropertyValue('--sl-light'))>.95);
  await page.evaluate(()=>{unitSettings.cell01.lastMarkAt=Date.now()-99*60000;saveUnitSettings();decreaseMode=true;handleUnitClick('cell01');decreaseMode=false;undoLastCounterChange();});
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('btn-cell01')).getPropertyValue('--sl-light').trim()==='0');
  // Unsupported future materials survive editing the label unchanged.
  await page.evaluate(()=>{cellFlags.cell01.light.version=9;saveCellFlags();renderHabits();});saved=await stored();
  await edit('cell01');await openMaterial();assert.ok(await page.locator('#signalCompatibility').isVisible());await save();assert.equal(await stored(),saved);
  // Create once, retain the material while the draft is parked and after saving.
  await page.evaluate(()=>openNewCellModal(8,1));await page.waitForFunction(()=>document.activeElement===document.getElementById('cellEditInput'));
  await page.locator('#cellEditInput').fill('Fixture новый 00');await openMaterial();
  const chosen=await page.locator('#signalPreset').inputValue();const id=await page.evaluate(()=>pendingNewCell.id);await save();
  assert.equal(await page.evaluate(id=>cellFlags[id].light.preset,id),chosen);
  await page.evaluate(()=>renderHabits());await edit(id);assert.equal(await page.locator('#signalPreset').inputValue(),chosen);await cancel();
  // RU/EN and mobile editor geometry; user text is not translated.
  for (const lang of ['ru','en']) {
   await page.evaluate(lang=>SstmI18n.setLanguage(lang),lang);
   for (const width of [320,390,768,1280]) {
    await page.setViewportSize({width,height:950});await edit('cell08');await openMaterial();
    await page.locator('#signalPreview').scrollIntoViewIfNeeded();
    const rect=await page.locator('#signalPreview').boundingBox();assert.ok(rect.width>0&&rect.x>=0&&rect.x+rect.width<=width+1);
    const overflow=await page.locator('#cellEditModal>div').evaluate(n=>n.scrollWidth>n.clientWidth+1);assert.equal(overflow,false);
    if(width===390)await page.screenshot({path:path.join(os.tmpdir(),`sstm-medium-app-${lang}-390.png`)});
    await cancel();
   }
   assert.equal(await page.evaluate(id=>habitLabels[id],id),'Fixture новый 00');
  }
  await page.evaluate(()=>Promise.all([document.fonts.load('400 16px "SSTM Digits"','0123456789'),document.fonts.load('500 16px "SSTM Text"','Sleep Сон')]));
  assert.equal(await page.evaluate(()=>document.fonts.check('400 16px "SSTM Digits"','0')&&document.fonts.check('500 16px "SSTM Text"','Сон')),true);
  await page.evaluate(()=>{renderHabits();renderHabits();renderHabits();});await page.waitForTimeout(100);
  assert.equal(await page.locator('.signal-pad').count(),await page.locator('.signal-pad>.sl-medium').count()+1); // one unsupported material
  assert.deepEqual(errors,[]);
  console.log('PASS: material/color save & cancel, atomic validation, stale drafts, BPM/ms, shared pulse origin, snapshot round-trip, positive-mark light, future-version preservation, stable new-button recipe, RU/EN and 320–1280 px layouts.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
