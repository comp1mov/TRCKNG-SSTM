// Invented demo only; no personal profile or external requests.
const { chromium } = require('playwright'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const output = path.join(require('node:os').tmpdir(), 'sstm-v2-moments-check'); fs.mkdirSync(output, { recursive: true });
(async () => {
 const browser = await chromium.launch({ headless: true, channel: 'msedge' });
 try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, serviceWorkers: 'block' });
  const external = []; await context.route('**/*', r => { if (new URL(r.request().url()).hostname === '127.0.0.1') return r.continue(); external.push(r.request().url()); return r.abort(); });
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo'); await page.locator('#historyMoments').waitFor({ state: 'attached' });
  const j = () => page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')));
  const close = id => page.locator(`#${id} .surface-panel-head button`).last().click();
  const initial = await j(); await page.locator('#pin1').click();
  await page.locator('#btn-cell08').click(); const at = await page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_tag_drafts'))['1/cell08'].at);
  await page.locator('#tagSave').click(); assert.match(await page.locator('#tagInlineError').innerText(), /слово/);
  assert.equal((await j()).moments.length, initial.moments.length);
  await page.locator('#momentWords').fill('#Пример пример, #слово');
  await page.locator('#momentWords').press('Escape'); await page.locator('#btn-cell09').click();
  assert.equal(await page.locator('#momentStateForm').isVisible(), true, 'A word draft does not replace the state menu');
  await page.locator('#momentCancel').click();
  await page.locator('#pin0').click(); await page.locator('#pin1').click(); await page.locator('#btn-cell08').click();
  assert.equal(await page.locator('#momentWords').inputValue(), '#Пример пример, #слово');
  await page.locator('#momentWords').press('Enter'); let saved = await j();
  assert.deepEqual(saved.moments.at(-1).tags, ['пример', 'слово']); assert.equal(saved.moments.at(-1).at, at); assert.deepEqual(saved.cycles, initial.cycles);
  await page.locator('#momentUndo').click(); assert.ok((await j()).moments.at(-1).deletedAt);
  await page.locator('#btn-cell08').click(); await page.locator('#momentWords').fill('#живое'); await page.locator('#momentWords').press('Enter');
  await page.locator('#btn-cell09').click(); assert.equal(await page.locator('.state-option').count(), 8);
  await page.locator('[data-state="joy"]').click(); assert.equal(await page.locator('#momentModal').isVisible(), false);
  assert.equal((await j()).moments.at(-1).state.label, 'Радостно');
  await page.locator('#btn-cell09').click(); await page.locator('#stateCustom summary').click(); await page.locator('#stateNewLabel').fill('Поток');
  const beforeCustom = (await j()).moments.length; await page.locator('#stateAddForm button').click(); assert.equal((await j()).moments.length, beforeCustom);
  await page.getByRole('button', { name: 'Поток', exact: true }).click(); assert.equal((await j()).moments.at(-1).state.label, 'Поток');
  await page.locator('#btn-cell09').click();
  const origin = await page.locator('#stateOrigin').boundingBox(), option = await page.locator('[data-state=calm]').boundingBox();
  await page.mouse.move(origin.x + origin.width / 2, origin.y + origin.height / 2); await page.mouse.down();
  await page.mouse.move(option.x + option.width / 2, option.y + option.height / 2, { steps: 12 }); await page.mouse.up();
  assert.equal((await j()).moments.at(-1).state.id, 'calm');
  await page.locator('#btnViewHistory').click(); await page.locator('#historyMoments').click(); await page.locator('[data-tag=живое]').click();
  assert.equal(await page.locator('.moment-row').count(), 1); assert.match(await page.locator('.moment-row').innerText(), /живое/);
  await page.screenshot({ path: path.join(output, 'week-desktop.png') }); await close('momentHistoryModal'); await page.locator('#btnViewTrack').click();
  // Real snapshot path contains the custom menu and observations, with no v1 writes.
  const snap = await page.evaluate(() => buildCloudSnapshot()); assert.equal(snap.dataVersion, 2); assert.equal(snap.cycleJournal.version, 2);
  await page.evaluate(snap => { SstmData.validate(snap); applyCloudSnapshot(snap); }, snap); assert.deepEqual(await j(), snap.cycleJournal);
  await page.locator('#pin1').click(); await page.locator('#btn-cell09').click();
  for (const width of [1280, 768, 390, 320]) {
   await page.setViewportSize({ width, height: 900 }); await page.locator('#stateWheel').scrollIntoViewIfNeeded();
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
   assert.equal(await page.locator('#stateWheel').evaluate(n => n.scrollWidth <= n.clientWidth + 1), true);
   const options = await page.locator('.state-option').evaluateAll(nodes => nodes.map(n => { const b = n.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, height: b.height }; }));
   for (let i = 0; i < options.length; i++) for (let k = i + 1; k < options.length; k++) assert.ok(options[i].right <= options[k].x || options[k].right <= options[i].x || options[i].bottom <= options[k].y || options[k].bottom <= options[i].y, `No overlapping touch targets at ${width}`);
   assert.ok(options.every(o => o.height >= 44)); await page.screenshot({ path: path.join(output, `states-${width}.png`) });
  }
  // Touch uses the same center-to-word selection, releasing elsewhere cancels.
  await page.setViewportSize({ width: 390, height: 900 }); await page.locator('#stateWheel').scrollIntoViewIfNeeded();
  const touchOrigin = await page.locator('#stateOrigin').boundingBox(), touchChoice = await page.locator('[data-state=worry]').boundingBox();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchOrigin.x + touchOrigin.width / 2, y: touchOrigin.y + touchOrigin.height / 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchChoice.x + touchChoice.width / 2, y: touchChoice.y + touchChoice.height / 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal((await j()).moments.at(-1).state.id, 'worry');
  const beforeCanceled = (await j()).moments.length;
  await page.locator('#btn-cell09').click(); await page.locator('#stateWheel').scrollIntoViewIfNeeded();
  const cancelOrigin = await page.locator('#stateOrigin').boundingBox();
  await page.mouse.move(cancelOrigin.x + cancelOrigin.width / 2, cancelOrigin.y + cancelOrigin.height / 2); await page.mouse.down(); await page.mouse.move(5, 5); await page.mouse.up();
  assert.equal((await j()).moments.length, beforeCanceled); await page.locator('#momentCancel').click();
  // Week tags share interval classification without changing time totals.
  await page.locator('#cycleCapture').click(); await page.locator('#btn-cell08').click(); await page.locator('#momentWords').fill('inside'); await page.locator('#momentWords').press('Enter');
  await page.locator('#cycleOpen').click(); await page.waitForFunction(() => document.querySelector('.cycle-moments')?.textContent.includes('#inside'));
  assert.equal((await j()).cycles[0].points.length, 1); await close('cycleModal');
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  console.log(`PASS: timestamped words, validation/cancel/undo, durable draft, single state/press, custom option, drag selection, week tags/filter, full snapshot, responsive touch targets, private demo isolation. Screenshots: ${output}`);
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
