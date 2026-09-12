// Isolated demo context only; external requests blocked and all data invented.
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const output = path.join(require('node:os').tmpdir(), 'sstm-v2-modules-check'); fs.mkdirSync(output, { recursive: true });
(async () => {
 const browser = await chromium.launch({ headless: true, channel: 'msedge' });
 try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, serviceWorkers: 'block' });
  await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo&lang=ru'); await page.locator('#surfaceScenarios').waitFor({ state: 'attached' });
  const journal = () => page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_modules')));
  const close = id => page.locator(`#${id} .surface-panel-head button`).last().click();
  const scenario = async () => { await page.locator('#surfaceMenuButton').click(); await page.locator('#surfaceScenarios').click(); };
  await scenario(); await page.locator('#scenarioHelpTab').click(); assert.match(await page.locator('#scenarioHelp').innerText(), /НАЖАТИЕ → ДЕЙСТВИЕ/);
  await page.locator('#scenarioListTab').click(); await page.screenshot({ path: path.join(output, 'scenarios-desktop.png') });
  const before = await page.evaluate(() => JSON.stringify([HABITS, habitTypes, cellLayout]));
  await page.locator('[data-recipe="work-pay"] button').click(); await page.locator('#cellEditCancel').click();
  assert.equal(await page.evaluate(() => JSON.stringify([HABITS, habitTypes, cellLayout])), before);
  await scenario(); await page.locator('[data-recipe="work-pay"] button').click();
  await page.locator('#moduleAmount').fill('0'); await page.locator('#cellEditSave').click();
  assert.equal(await page.evaluate(() => JSON.stringify([HABITS, habitTypes, cellLayout])), before, 'Invalid preset changes nothing');
  await page.locator('#moduleAmount').fill('120'); await page.locator('#cellEditInput').fill('Работа · пример');
  assert.equal(await page.locator('#moduleIntervalUnit').count(), 0, 'New settings use hourly rate only');
  await page.screenshot({ path: path.join(output, 'builder-desktop.png') });
  await page.locator('#cellEditSave').click(); await page.locator('#btnViewTrack').click();
  const id = await page.evaluate(() => HABITS.find(h => habitTypes[h] === 'modular'));
  const control = page.locator(`#btn-${id}`); await control.scrollIntoViewIfNeeded();
  await page.waitForFunction(id => document.querySelector(`#btn-${id} .module-main`)?.textContent === '0.0000', id);
  assert.equal(await control.locator('.module-currency').innerText(), 'USD');
  await control.click(); await page.waitForTimeout(1300);
  assert.equal(await control.evaluate(n => n.classList.contains('running')), true);
  assert.ok(parseFloat(await control.locator('.module-main').innerText()) > 0);
  await page.locator('#btnViewLayout').click(); await page.locator(`#layout-${id} .layout-action`).nth(1).click();
  assert.equal(await page.locator('#moduleAmount').isDisabled(), true);
  await page.locator('#creationGroups [data-creation-group=time]').click();
  await page.locator('#cellEditModal [data-type=points]').click(); await page.locator('#cellEditSave').click();
  assert.match(await page.locator('.cell-layout-error').innerText(), /Останови/); await page.locator('#cellEditCancel').click();
  // Another PIN controls the same source, but has its own display settings.
  await page.locator('#pin1').click(); await scenario(); await page.locator('[data-recipe="work-pay"] button').click();
  const track = (await journal()).tracks[0].id;
  await page.locator('#moduleTrack').selectOption(track); await page.locator('#modulePrimary').selectOption('time');
  await page.locator('#cellEditInput').fill('Часы той же работы'); await page.locator('#cellEditSave').click();
  await page.locator('#btnViewTrack').click();
  const alias = await page.evaluate(() => HABITS.find(h => habitTypes[h] === 'modular'));
  await page.locator(`#btn-${alias}`).scrollIntoViewIfNeeded(); await page.locator(`#btn-${alias}`).click();
  let j = await journal(); assert.equal(j.tracks.length, 1); assert.equal(j.tracks[0].sessions.length, 1); assert.equal(j.tracks[0].running, null);
  assert.equal(j.bindings.length, 2, JSON.stringify(j.bindings)); assert.equal(j.bindings[1].pin, 1); assert.equal(j.bindings[1].display.primary, 'time');
  await page.locator('#btnViewLayout').click(); await page.locator(`#layout-${alias} .layout-action`).nth(1).click();
  await page.locator('#moduleAmount').fill('240'); await page.locator('#cellEditSave').click();
  j = await journal(); assert.equal(j.tracks[0].rate.amount, 240); assert.equal(j.tracks[0].sessions[0].rate.amount, 120);
  // A stale editor cannot overwrite a newer timer state.
  await page.locator(`#layout-${alias} .layout-action`).nth(1).click();
  await page.evaluate(alias => { let j = JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_modules')); j = SstmModules.toggle(j, 1, alias); TRCKNG_STORAGE.setItem('sstm_v2_modules', JSON.stringify(j)); }, alias);
  await page.locator('#cellEditSave').click(); assert.match(await page.locator('.cell-layout-error').innerText(), /изменился/);
  await page.locator('#cellEditCancel').click(); await page.locator('#btnViewTrack').click();
  await page.locator('#btnViewHistory').click(); await page.locator('#historyWork').click();
  await page.locator('#workHistorySummary button').click(); assert.equal((await journal()).tracks[0].running, null);
  assert.equal(await page.locator('.work-history-row').count(), 2);
  await close('workHistoryModal'); await page.locator('#btnViewTrack').click();
  const snap = await page.evaluate(() => buildCloudSnapshot()); assert.equal(snap.dataVersion, 2);
  await page.evaluate(s => applyCloudSnapshot(s), snap); assert.deepEqual(await journal(), snap.moduleJournal);
  // Useful test display: a previous completed hour and a live second-rate increment.
  await page.evaluate(() => {
   let j = JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_modules')), t = j.tracks[0];
   t.sessions = [{ id: crypto.randomUUID(), start: Date.now() - 9000000, end: Date.now() - 3600000, rate: t.rate, source: { pin: 0, cellId: j.bindings[0].cellId } }];
   j = SstmModules.toggle(j, 1, j.bindings[1].cellId); TRCKNG_STORAGE.setItem('sstm_v2_modules', JSON.stringify(j)); dispatchEvent(new Event('sstm-v2-loaded'));
  });
  await page.locator('#pin0').click(); await control.scrollIntoViewIfNeeded();
  await page.waitForFunction(id => document.querySelector(`#btn-${id} .module-hours`)?.textContent === '1 ч', id);
  await page.screenshot({ path: path.join(output, 'work-desktop.png') });
  await control.screenshot({ path: path.join(output, 'work-button.png') });
  for (const width of [768, 390, 320]) {
   await page.setViewportSize({ width, height: 850 }); await control.scrollIntoViewIfNeeded();
   await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
   if (await page.locator('body').evaluate(n => n.classList.contains('surface-compact'))) await page.locator('#surfacePanelToggle').click();
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
   await page.screenshot({ path: path.join(output, `work-${width}.png`) });
   await page.locator('#btnViewLayout').click(); await page.locator(`#layout-${id} .layout-action`).nth(1).click();
   await page.locator('#moduleSettings').scrollIntoViewIfNeeded();
   assert.equal(await page.locator('#moduleSettings').evaluate(n => n.scrollWidth <= n.clientWidth + 1), true);
   await page.screenshot({ path: path.join(output, `builder-${width}.png`) });
   await close('cellEditModal'); await page.locator('#btnViewTrack').click();
  }
  // Both dense and wide modules keep values/labels/currency inside the face.
  for (const size of [96, 128, 192]) for (const columns of [1, 2]) {
   await page.evaluate(({ id, size, columns }) => {
    document.body.dataset.cellSize = String(size); document.body.style.setProperty('--module-size', `${size}px`);
    cellLayout[id].colSpan = columns; renderHabits();
   }, { id, size, columns });
   await control.scrollIntoViewIfNeeded(); await page.waitForTimeout(80);
   const bad = await control.evaluate(node => {
    const face = node.getBoundingClientRect();
    return [...node.querySelectorAll('.module-head,.module-main,.module-details,.module-meter,.btn-label')].filter(n => { const b = n.getBoundingClientRect(); return b.right > face.right + 1 || b.bottom > face.bottom + 1 || b.left < face.left - 1; }).map(n => n.className);
   });
   assert.deepEqual(bad, [], `No overflow at ${size}px × ${columns}`);
   assert.equal(await control.locator('.module-main').evaluate(n => n.scrollWidth <= n.clientWidth + 1), true);
  }
  // An old custom interval remains mathematically exact when changing its display.
  await page.evaluate(() => {
   let j = JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_modules')), t = j.tracks[0];
   t.running = null; t.sessions = []; t.rate = { amount: 7, intervalMs: 90000, currency: '₪' };
   TRCKNG_STORAGE.setItem('sstm_v2_modules', JSON.stringify(j)); dispatchEvent(new Event('sstm-v2-loaded'));
  });
  await page.locator('#btnViewLayout').click(); await page.locator(`#layout-${id} .layout-action`).nth(1).click();
  assert.equal(await page.locator('#moduleAmount').inputValue(), '280');
  await page.locator('#modulePrimary').selectOption('time'); await page.locator('#cellEditSave').click();
  assert.deepEqual((await journal()).tracks[0].rate, { amount: 7, intervalMs: 90000, currency: '₪' });
  await page.locator('#btnViewTrack').click(); assert.equal(await control.locator('.module-currency').innerText(), '₪');
  assert.deepEqual(errors, []); console.log(`PASS: scenario drafts, settings, live money, shared source across PINs, historical rates, stale edit rejection, stop/history, snapshot roundtrip, responsive screens. Screenshots: ${output}`);
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
