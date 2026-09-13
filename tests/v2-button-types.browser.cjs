// All thirteen v1 types, using hand-written demo fixtures and blocked networking.
const { chromium } = require('playwright'), assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ headless: true, channel: 'msedge' });
 try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, serviceWorkers: 'block' });
  await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo&lang=ru'); await page.locator('#surfaceScenarios').waitFor({ state: 'attached' });
  const click = id => page.locator(`#btn-${id}`).click();
  const edit = async id => {
   await page.locator('#btnViewLayout').click(); await page.locator(`#layout-${id} .layout-action`).nth(1).click();
   // The editor deliberately focuses its name after opening. Wait before filling another field.
   await page.waitForFunction(() => document.activeElement === document.getElementById('cellEditInput'));
  };
  const save = async () => { await page.locator('#cellEditSave').click(); await page.locator('#btnViewTrack').click(); };
  const value = id => page.evaluate(id => weekData[getWeekKey()][id] || 0, id);
  await edit('cell01'); await page.locator('#unitStep').fill('3'); await save();
  let before = await value('cell01'); await click('cell01'); assert.equal(await value('cell01'), before + 3);
  await page.locator('#btnDecrease').click(); await click('cell01'); assert.equal(await value('cell01'), before); await page.locator('#btnDecrease').click();
  await click('cell03'); await page.locator('#valueModalInput').fill('1.25'); await page.locator('#valueModalSave').click(); assert.equal(await value('cell03'), 1.25);
  await edit('cell06'); assert.equal(await page.locator('#timerVolume').inputValue(), '0');
  await page.evaluate(() => { window.fixturePreviewVolume = null; playNotificationSound = (sound, volume) => { fixturePreviewVolume = volume; }; });
  await page.locator('#timerSoundTest').click(); assert.equal(await page.evaluate(() => fixturePreviewVolume), 0);
  await page.locator('#timerDuration').fill('25'); await save();
  assert.equal(await page.evaluate(() => timerStates.cell06.remaining), 1500000);
  await click('cell06'); assert.equal(await page.evaluate(() => timerStates.cell06.isRunning), true);
  await page.evaluate(() => { timerStates.cell06.startTime -= 1500100; updateLiveDisplays(); });
  assert.equal(await page.evaluate(() => timerStates.cell06.iterations), 1); await click('cell06');
  assert.equal(await page.evaluate(() => timerStates.cell06.remaining), 1500000);
  await edit('cell06'); assert.equal(await page.locator('#timerVolume').inputValue(), '0'); await page.locator('#timerDuration').fill('0');
  const preserved = await page.evaluate(() => JSON.stringify([habitLabels, timerSettings, weekData]));
  await page.locator('#cellEditSave').click(); assert.equal(await page.evaluate(() => JSON.stringify([habitLabels, timerSettings, weekData])), preserved); await page.locator('#cellEditCancel').click();
  await page.locator('#btnViewTrack').click();
  // Start/stop each span type; all record exactly one independent interval.
  async function span(id) {
   await page.evaluate(id => { durationStates[id] = { accumulated: 0, isRunning: false, startTime: null }; saveDurationStates(); renderHabits(); }, id);
   const n = await page.evaluate(() => durationSessions.length); await click(id);
   assert.equal(await page.evaluate(id => durationStates[id].isRunning, id), true);
   await page.evaluate(id => { durationStates[id].startTime -= 65000; }, id); await click(id);
   assert.equal(await page.evaluate(() => durationSessions.length), n + 1);
   assert.ok(await page.evaluate(id => durationStates[id].accumulated >= 65 && durationStates[id].accumulated < 68, id));
  }
  for (const id of ['cell02', 'cell04', 'cell05']) await span(id);
  await edit('cell07'); assert.equal(await page.locator('#countdownVolume').inputValue(), '0'); await save();
  await page.evaluate(() => { timerSettings.cell07.targetDate = '2000-01-01'; timerStates.cell07 = {}; window.fixtureNotices = 0; sendCountdownNotification = () => fixtureNotices++; updateLiveDisplays(); });
  assert.equal(await page.evaluate(() => fixtureNotices), 1); await click('cell07');
  await page.evaluate(() => { renderHabits(); updateLiveDisplays(); updateLiveDisplays(); });
  assert.equal(await page.evaluate(() => fixtureNotices), 1); assert.equal(await page.locator('#btn-cell07').evaluate(n => n.classList.contains('pulsing')), false);
  await edit('cell08'); await page.locator('#ledBpm').fill('123'); await save(); await click('cell08');
  assert.equal(await page.evaluate(() => ledStates.cell08.isActive), true); assert.equal(await page.evaluate(() => ledSettings.cell08.bpm), 123);
  await click('cell08'); assert.equal(await page.evaluate(() => ledStates.cell08.isActive), false);
  // Existing math source/operations, then a rejected self-reference leaves everything intact.
  assert.equal(await page.evaluate(() => computeMathValue('cell09')), (await value('cell01')) * 2);
  await edit('cell09');
  await page.locator('#mathSourceA').selectOption('cell09');
  const mathBefore = await page.evaluate(() => JSON.stringify([habitLabels, mathSettings, weekData]));
  await page.locator('#cellEditSave').click(); assert.equal(await page.evaluate(() => JSON.stringify([habitLabels, mathSettings, weekData])), mathBefore);
  assert.match(await page.locator('.cell-layout-error').innerText(), /себя/); await page.locator('#cellEditCancel').click();
  await page.locator('#pin1').click(); await page.locator('#btnViewTrack').click();
  before = await value('cell01'); await click('cell01'); assert.equal(await value('cell01'), before - 5);
  before = await value('cell02'); await click('cell02'); assert.equal(await value('cell02'), before + 5);
  await span('cell04');
  await click('cell03'); await page.locator('#currencyModalInput').fill('25'); await page.locator('#currencyModalSave').click();
  await edit('cell03'); await save(); assert.equal(await page.evaluate(() => currencySettings.cell03.amount), 25);
  await click('cell03'); await page.locator('#currencyModalInput').fill('0'); await page.locator('#currencyModalSave').click();
  await click('cell03'); assert.equal(await page.locator('#currencyModalInput').inputValue(), '0'); await page.locator('#currencyModalCancel').click();
  await page.locator('#pin0').click(); assert.equal(await page.evaluate(() => timerSettings.cell06.volume), 0);
  assert.deepEqual(errors, []); console.log('PASS: UNIT, VALUE, DURATION SEC, MIN, SLEEP, SEC COUNT, TIMER settings/start/stop/expiry, COUNTDOWN acknowledgment, INCOME, BUDGET, MATH, LED BPM, CURRENCY input/settings; PIN roundtrips.');
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
