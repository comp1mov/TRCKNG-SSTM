// Synthetic profiles only: navigation must not log out, capture, or discard drafts.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const output = path.join(require('node:os').tmpdir(), 'sstm-navigation-check'); fs.mkdirSync(output, { recursive: true });
const base = 'http://127.0.0.1:5173/TRCKNG-SSTM/';
(async () => {
 const browser = await chromium.launch({ headless: true, channel: 'msedge' });
 try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}v2/?mode=account&lang=ru`); await page.locator('#accountBackToField').waitFor();
  assert.equal(await page.locator('#accountBackToField').innerText(), '← К ПРИМЕРАМ');
  await page.locator('#accountBackToField').click(); await page.waitForURL(url => url.searchParams.get('mode') === 'demo' && url.searchParams.get('lang') === 'ru');
  await page.locator('#btn-cell01').click(); const count = await page.locator('#value-cell01').innerText();
  await page.locator('#btnViewLayout').click(); await page.locator('#surfaceAddCell').click();
  await page.locator('#cellEditInput').fill('Saved draft');
  await page.locator('#btnViewTrack').click();
  assert.equal(await page.locator('#trackView').isVisible(), true);
  assert.equal(await page.locator('#cellEditModal').isVisible(), false);
  await page.locator('#surfaceDock button').click();
  assert.equal(await page.locator('#cellEditInput').inputValue(), 'Saved draft');
  await page.keyboard.press('Escape'); await page.locator('#surfaceDock button').click();
  assert.equal(await page.locator('#cellEditInput').inputValue(), 'Saved draft');
  await page.locator('#cellEditCancel').click();
  await page.locator('#btnViewHistory').click(); await page.locator('.surface-brand').click();
  assert.equal(await page.locator('#trackView').isVisible(), true);
  assert.equal(await page.locator('#value-cell01').innerText(), count, 'Brand returns without reloading the demo or switching to v1');
  await page.locator('#cycleCapture').click(); await page.locator('#cycleOpen').click();
  const before = await page.locator('.cycle-record-duration[data-live-start]').innerText();
  await page.getByLabel('Переименовать точку 1', { exact: true }).click();
  await page.getByLabel('Название точки 1', { exact: true }).fill('Clock draft');
  await page.waitForFunction(before => document.querySelector('.cycle-record-duration[data-live-start]').textContent !== before, before);
  assert.equal(await page.getByLabel('Название точки 1', { exact: true }).inputValue(), 'Clock draft');
  await page.keyboard.press('Escape'); await page.locator('#pin1').click(); await page.locator('#surfaceDock button').click();
  assert.equal(await page.locator('.pin.active').getAttribute('data-pin'), '1', 'Global cycle panel does not switch PIN when restored');
  assert.equal(await page.getByLabel('Название точки 1', { exact: true }).inputValue(), 'Clock draft');
  await page.screenshot({ path: path.join(output, 'cycle-return-phone.png') });
  await page.evaluate(() => {
   const journal = JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles'));
   journal.cycles[0].points[0].name = 'Remote example';
   TRCKNG_STORAGE.setItem('sstm_v2_cycles', JSON.stringify(journal)); dispatchEvent(new Event('sstm-v2-loaded'));
  });
  await page.locator('.cycle-record').first().getByRole('button', { name: 'СОХРАНИТЬ', exact: true }).click();
  assert.equal(await page.locator('.cycle-name-conflict').isVisible(), true);
  await page.getByRole('button', { name: 'СОХРАНИТЬ МОЙ ТЕКСТ', exact: true }).click();
  assert.equal(await page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')).cycles[0].points[0].name), 'Clock draft');
  await page.getByLabel('Переименовать точку 1', { exact: true }).click();
  await page.getByLabel('Название точки 1', { exact: true }).fill('New draft');
  await page.evaluate(() => {
   const j = JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')); j.cycles[0].points[0].name = 'Saved remotely';
   TRCKNG_STORAGE.setItem('sstm_v2_cycles', JSON.stringify(j)); dispatchEvent(new Event('sstm-v2-loaded'));
  });
  await page.locator('.cycle-record').first().getByRole('button', { name: 'СОХРАНИТЬ', exact: true }).click();
  await page.getByRole('button', { name: 'ПРИНЯТЬ СОХРАНЁННОЕ', exact: true }).click();
  assert.equal(await page.getByLabel('Переименовать точку 1', { exact: true }).innerText(), 'Saved remotely');
  await page.goto(base); await page.locator('#btn-cell01').waitFor();
  for (const width of [1280, 390, 320]) {
   await page.setViewportSize({ width, height: 844 }); await page.locator('#btnViewHistory').click(); await page.locator('#btnAccount').click();
   await page.locator('#accountModal > div').evaluate(el => { el.scrollTop = el.scrollHeight; });
   const box = await page.locator('#accountBackToField').boundingBox();
   assert.ok(box.y >= 0 && box.y + box.height < 844, 'V1 account has a visible persistent return');
   await page.screenshot({ path: path.join(output, `v1-account-${width}.png`) });
   await page.locator('#accountBackToField').click();
   assert.equal(await page.locator('#accountModal').isVisible(), false); assert.equal(await page.locator('#trackView').isVisible(), true);
  }
  assert.deepEqual(errors, []); console.log('PASS: guest/demo return, panel tabs, Escape/durable draft, brand keeps v2, live interval display, global panel PIN, visible v1 account return on desktop/phone.');
  console.log(`Synthetic screenshots: ${output}`);
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
