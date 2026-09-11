// Fabricated records in an isolated demo. All external requests are blocked.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const output = path.join(require('node:os').tmpdir(), 'sstm-intervals-check'); fs.mkdirSync(output, { recursive: true });
(async () => {
 const browser = await chromium.launch({ headless: true, channel: 'msedge' });
 try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'UTC', serviceWorkers: 'block' });
  await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo&lang=ru'); await page.locator('#cycleCapture').waitFor();
  const start = Math.floor((Date.now() - 2 * 3600000) / 1000) * 1000;
  const iso = t => new Date(t).toISOString().replace('.000Z', '');
  const seed = await page.evaluate(start => {
   let j = SstmData.point(SstmData.emptyJournal(), start); j = SstmData.point(j, start + 3600000); j = SstmData.point(j, start + 6600000);
   const c = j.cycles[0]; j = SstmData.annotate(j, c.id, c.points[0].id, 'interval', 'Work example');
   j = SstmData.annotate(j, c.id, c.points[1].id, 'interval', 'Walk example');
   j = SstmData.annotate(j, c.id, c.points[2].id, 'point', 'Marker kept in audit');
   j = SstmData.annotate(j, c.id, c.points[2].id, 'interval', 'Active example');
   TRCKNG_STORAGE.setItem('sstm_v2_cycles', JSON.stringify(j)); dispatchEvent(new Event('sstm-v2-loaded')); return j;
  }, start);
  await page.locator('#cycleOpen').click();
  assert.equal(await page.locator('#cycleRows input:visible').count(), 0);
  assert.equal(await page.locator('#cycleArchive').getAttribute('open'), null);
  assert.equal(await page.locator('#cycleRepair').getAttribute('open'), null);
  const live = await page.locator('[data-live-start]').innerText(), wall = await page.locator('#cycleWallClock').innerText();
  await page.waitForFunction(({ live, wall }) => document.querySelector('[data-live-start]').textContent !== live && document.querySelector('#cycleWallClock').textContent !== wall, { live, wall });
  await page.getByLabel('Исправить время точки 2', { exact: true }).click();
  const time = page.getByLabel('Время точки 2', { exact: true });
  await time.fill(iso(start));
  assert.equal(await page.getByRole('button', { name: 'ПРИМЕНИТЬ ВРЕМЯ' }).isDisabled(), true);
  await time.fill(iso(start + 4200000));
  assert.match(await page.locator('.cycle-time-preview').innerText(), /01:00:00 → 01:10:00/);
  assert.match(await page.locator('.cycle-time-preview').innerText(), /00:50:00 → 00:40:00/);
  await page.getByRole('button', { name: 'ПРИМЕНИТЬ ВРЕМЯ' }).click();
  const repaired = await page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')));
  assert.equal(repaired.cycles[0].points[1].at, start + 4200000); assert.equal(repaired.edits[0].before.at, start + 3600000);
  assert.deepEqual(repaired.cycles[0].points.map(p => p.id), seed.cycles[0].points.map(p => p.id));
  assert.equal(await page.locator('#cycleRows input:visible').count(), 0);
  await page.getByLabel('Изменить теги отрезка 2', { exact: true }).click();
  await page.getByLabel('Теги отрезка 2', { exact: true }).fill('#walk #OUTSIDE walk');
  await page.getByRole('button', { name: 'СОХРАНИТЬ', exact: true }).click();
  assert.equal(await page.getByLabel('Изменить теги отрезка 2', { exact: true }).innerText(), '#walk #outside');
  await page.locator('#cycleArchive > summary').click(); await page.locator('#cycleSearch').fill('#outside');
  assert.equal(await page.locator('#cycleSearchResults button').count(), 1);
  await page.locator('#cycleSearchResults button').click();
  assert.equal(await page.locator('#cycleArchive').getAttribute('open'), null);
  await page.getByLabel('Исправить время точки 2', { exact: true }).click(); await time.fill(iso(start + 4500000));
  // A second-device change must not be overwritten by a stale time editor.
  await page.evaluate(() => {
   const j = JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')); j.cycles[0].points[1].name = 'Other device example';
   TRCKNG_STORAGE.setItem('sstm_v2_cycles', JSON.stringify(j)); dispatchEvent(new Event('sstm-v2-loaded'));
  });
  assert.equal(await page.getByRole('button', { name: 'ПРИМЕНИТЬ ВРЕМЯ' }).isDisabled(), true);
  assert.equal(await time.inputValue(), iso(start + 4500000).replace(/\.000$/, ''));
  await page.getByRole('button', { name: 'СБРОСИТЬ ПРАВКУ' }).click();
  await page.locator('#cycleRepair > summary').click(); await page.locator('#cycleUndo').click();
  let journal = await page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')));
  assert.equal(journal.cycles[0].points.length, 2); assert.equal(journal.edits.at(-1).before.point.name, 'Marker kept in audit');
  assert.equal(journal.cycles[0].names[journal.cycles[0].points[1].id], 'Walk example');
  assert.deepEqual(journal.cycles[0].tags[journal.cycles[0].points[1].id], ['walk', 'outside']);
  await page.locator('#cycleEnd').click(); assert.match(await page.locator('#cycleTitle').innerText(), /СОХРАНЕНА/);
  await page.locator('#cycleUndo').click(); assert.match(await page.locator('#cycleTitle').innerText(), /ИДЁТ/);
  await page.locator('#cycleEnd').click();
  assert.equal(await page.locator('#cycleStopArea').isVisible(), false);
  await page.getByRole('button', { name: 'Закрыть окно', exact: true }).filter({ visible: true }).click();
  const stopped = await page.locator('#cycleElapsed').innerText(); assert.notEqual(stopped, '00:00:00');
  await page.locator('#cycleCapture').click(); await page.locator('#cycleOpen').click();
  journal = await page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')));
  assert.equal(journal.cycles.length, 2); assert.equal(journal.cycles[0].endedAt !== null, true);
  await page.locator('#cycleArchive > summary').click(); await page.locator('#cycleSelect').selectOption(journal.cycles[0].id);
  assert.equal(await page.locator('#cycleUndo').count(), 0, 'Old history cannot be reopened over a later recording');
  await page.locator('#cycleRepair').evaluate(el => el.open = false);
  for (const width of [1280, 768, 390, 320]) {
   await page.setViewportSize({ width, height: 900 });
   await page.locator('#cycleModal > div').evaluate(el => el.scrollTop = 0);
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
   const box = await page.locator('#cycleWallClock').boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width, 'Real clock remains visible');
   assert.equal(await page.locator('#cycleRows input:visible').count(), 0);
   await page.screenshot({ path: path.join(output, `intervals-${width}.png`), fullPage: true });
  }
  assert.deepEqual(errors, []); console.log('PASS: quiet timeline, live clock, time previews/bounds/stale rejection, tags/search, original-preserving undo/end/restart, responsive viewing.');
  console.log(`Synthetic screenshots: ${output}`);
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
