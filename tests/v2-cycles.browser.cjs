// Fresh isolated profile and fabricated demo records only.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const output = path.join(require('node:os').tmpdir(), 'sstm-v2-cycles-check'); fs.mkdirSync(output, { recursive: true });
(async () => {
 const browser = await chromium.launch({ headless: true, channel: 'msedge' });
 try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo&lang=ru'); await page.locator('#cycleCapture').waitFor();
  assert.equal(await page.locator('#cycleElapsed').innerText(), '00:00:00');
  await page.locator('#cycleCapture').click(); await page.locator('#cycleOpen').click();
  assert.equal(await page.locator('#cycleRows input:visible').count(), 0, 'History opens as a timeline, not a form');
  assert.match(await page.locator('#cycleWallClock').innerText(), /\d\d:\d\d:\d\d/);
  await page.getByLabel('Переименовать точку 1', { exact: true }).click();
  await page.getByLabel('Название точки 1', { exact: true }).fill('First point draft');
  await page.locator('#cycleModal .surface-panel-head button').first().click();
  await page.locator('#cycleCapture').click(); await page.locator('#surfaceDock button').click();
  assert.equal(await page.getByLabel('Название точки 1', { exact: true }).inputValue(), 'First point draft');
  await page.getByLabel('Переименовать отрезок 1', { exact: true }).click();
  await page.getByLabel('Название отрезка 1', { exact: true }).fill('Example interval');
  await page.getByRole('button', { name: 'СОХРАНИТЬ', exact: true }).click();
  assert.equal(await page.locator('#cycleRows input:visible').count(), 0);
  await page.locator('#cycleModal .surface-panel-head button').last().click();
  await page.locator('#pin1').click(); await page.locator('#btn-cell07').click();
  const journal = await page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')));
  assert.equal(journal.cycles.length, 1); assert.equal(journal.cycles[0].points.length, 3);
  assert.equal(journal.cycles[0].points[0].name, 'First point draft');
  assert.equal(journal.cycles[0].names[journal.cycles[0].points[0].id], 'Example interval');
  await page.locator('#cycleOpen').click(); await page.locator('#cycleEnd').click();
  assert.equal(await page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')).active), null);
  await page.locator('#cycleModal .surface-panel-head button').last().click();
  await page.locator('#btn-cell07').click();
  assert.equal(await page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')).cycles.length), 2);
  await page.locator('#btnViewHistory').click();
  assert.equal(await page.locator('[data-matrix-habit="cell07"]').count(), 0, 'Points are not misreported as zero counters');
  await page.locator('#historyCycles').click(); assert.equal(await page.locator('#cycleSelect option').count(), 2);
  assert.equal(await page.locator('#cycleArchive').getAttribute('open'), null, 'Recording selector does not interrupt viewing');
  // Show a long invented cycle and confirm one common hour axis.
  await page.evaluate(() => {
   let j = SstmData.emptyJournal(), t = Date.now() - 27 * 3600000;
   j = SstmData.point(j, t); j = SstmData.point(j, t + 7 * 3600000); j = SstmData.point(j, t + 20 * 3600000);
   TRCKNG_STORAGE.setItem('sstm_v2_cycles', JSON.stringify(j)); dispatchEvent(new Event('sstm-v2-loaded'));
  });
  await page.waitForFunction(() => document.querySelector('#cycleElapsed').textContent.startsWith('27:'));
  assert.match(await page.locator('#cycleComparison').textContent(), /0–30 ч/);
  await page.screenshot({ path: path.join(output, 'desktop-cycles.png'), fullPage: true });
  await page.locator('#cycleModal .surface-panel-head button').last().click(); await page.locator('#btnViewTrack').click();
  for (const width of [768, 390, 320]) {
   await page.setViewportSize({ width, height: 844 }); await page.locator('#cycleOpen').click();
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
   await page.screenshot({ path: path.join(output, `cycles-${width}.png`), fullPage: true });
   await page.locator('#cycleModal .surface-panel-head button').first().click();
   assert.equal(await page.locator('#cycleCapture').isVisible(), true);
  }
  assert.deepEqual(errors, []); console.log('PASS: cycle/field capture, optional names, minimized drafts, explicit end/new cycle, history, >24 hours and responsive panels.');
  console.log(`Synthetic screenshots: ${output}`);
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
