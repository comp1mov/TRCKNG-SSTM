// Synthetic demo only. All external requests are blocked.
const pw = require('playwright'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const engine = process.env.SSTM_BROWSER || 'chromium';
const output = path.join(require('node:os').tmpdir(), 'sstm-v2-emotions', engine); fs.mkdirSync(output, { recursive: true });
(async () => {
 const browser = await pw[engine].launch({ headless: true, ...(engine === 'chromium' ? { channel: 'msedge' } : {}) });
 try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: true, serviceWorkers: 'block' }), errors = [], external = [];
  await context.route('**/*', r => { if (new URL(r.request().url()).hostname === '127.0.0.1') return r.continue(); external.push(r.request().url()); return r.abort(); });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo&lang=en'); await page.locator('#surfaceMoments').waitFor({ state: 'attached' });
  const journal = () => page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')));
  await page.locator('#cycleCapture').click(); const initial = await journal();
  await page.locator('#cycleOpen').click(); assert.equal(await page.locator('#cycleOpen').getAttribute('aria-expanded'), 'true');
  await page.getByLabel('Rename interval 1', { exact: true }).click(); await page.getByLabel('Interval 1 name', { exact: true }).fill('Unsubmitted fixture');
  await page.locator('#cycleOpen').click(); assert.equal(await page.locator('#cycleModal').isVisible(), false); assert.equal(await page.locator('#cycleOpen').getAttribute('aria-expanded'), 'false');
  assert.deepEqual(await journal(), initial);
  await page.locator('#cycleOpen').focus(); await page.keyboard.press('Enter'); assert.equal(await page.getByLabel('Interval 1 name', { exact: true }).inputValue(), 'Unsubmitted fixture');
  await page.setViewportSize({ width: 390, height: 844 }); await page.locator('#cycleOpen').tap(); assert.equal(await page.locator('#cycleModal').isVisible(), false);
  await page.locator('#cycleOpen').tap(); await page.locator('#cycleModal .surface-panel-head button').last().tap(); assert.equal(await page.locator('#cycleOpen').getAttribute('aria-expanded'), 'false');
  assert.deepEqual(await journal(), initial, 'Closing/opening/typing does not mark a point or stop a recording');
  await page.locator('#surfaceMenuButton').click(); await page.locator('#surfaceMoments').click(); await page.locator('#momentAddState').click();
  const beforeBrowse = await journal();
  for (const [width, height, language = 'en'] of [[1280, 900], [768, 1024], [390, 844], [844, 390], [320, 700], [390, 844, 'ru'], [844, 390, 'ru']]) {
   await page.setViewportSize({ width, height });
   await page.evaluate(language => SstmI18n.setLanguage(language), language);
   for (const group of ['ease', 'energy', 'tension', 'low']) {
    await page.locator('#stateBrowse').click(); await page.locator(`[data-group=${group}]`).click();
    for (let part = 0; part < 2; part++) {
     if (part) await page.locator('#stateNext').click();
     assert.equal(await page.locator('#statePageLabel').innerText(), `${part + 1} / 2`);
     await page.locator('#stateWheel').scrollIntoViewIfNeeded();
     const boxes = await page.locator('.state-option').evaluateAll(ns => ns.map(n => { const b = n.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, h: b.height }; }));
     const head = await page.locator('#momentModal .surface-panel-head').boundingBox(), panel = await page.locator('#momentModal').boundingBox();
     assert.equal(boxes.length, 8);
     for (const b of boxes) assert.ok(b.x >= 0 && b.right <= width + 1 && b.h >= 44 && b.y >= head.y + head.height - 1 && b.bottom <= panel.y + panel.height + 1, `${group} page ${part + 1}, ${width}x${height}: ${JSON.stringify({ b, head, panel })}`);
     for (let i = 0; i < boxes.length; i++) for (let k = i + 1; k < boxes.length; k++) { const a = boxes[i], b = boxes[k]; assert.ok(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y, `No overlap: ${group}, ${width}`); }
    }
   }
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
   await page.screenshot({ path: path.join(output, `second-page-${width}x${height}-${language}.png`) });
  }
  assert.deepEqual(await journal(), beforeBrowse, 'All 64 choices can be browsed without saving anything');
  await page.locator('#stateSearch').fill('не знаю'); assert.ok(await page.locator('#stateSearchResults [data-state=unsure]').isVisible());
  await page.locator('#stateSearch').fill('СКУЧАЮ'); await page.locator('#stateSearchResults [data-state="sstm:state:longing"]').tap();
  let j = await journal(); assert.equal(j.version, 4); assert.equal(j.moments.at(-1).state.id, 'sstm:state:longing'); assert.deepEqual(j.cycles, initial.cycles);
  await page.locator('#surfaceMenuButton').click(); await page.locator('#surfaceMoments').click(); await page.locator('#momentAddState').click();
  await page.locator('#stateBrowse').click(); await page.locator('[data-group=ease]').click(); await page.locator('#stateNext').click(); await page.locator('#stateWheel').scrollIntoViewIfNeeded();
  const a = await page.locator('#stateOrigin').boundingBox(), b = await page.locator('[data-state="sstm:state:tender"]').boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 }); await page.mouse.up();
  assert.equal((await journal()).moments.at(-1).state.id, 'sstm:state:tender');
  const snap = await page.evaluate(() => buildCloudSnapshot()); await page.evaluate(s => { SstmData.validate(s); applyCloudSnapshot(s); }, snap); assert.deepEqual(await journal(), snap.cycleJournal);
  assert.deepEqual(errors, []); assert.deepEqual(external, []); console.log(`PASS ${engine}: interval toggle/cross/keyboard/touch preserve tracking and draft; all 64 choices fit five viewports; bilingual phrase search, page-two gesture capture and v4 export roundtrip. ${output}`);
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
