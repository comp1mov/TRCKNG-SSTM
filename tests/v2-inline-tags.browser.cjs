// Reusable cross-engine check. Every browser uses a fresh profile and invented demo.
const pw = require('playwright'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const engine = process.env.SSTM_BROWSER || 'chromium';
const output = path.join(require('node:os').tmpdir(), 'sstm-v2-inline-check', engine); fs.mkdirSync(output, { recursive: true });
(async () => {
 const browser = await pw[engine].launch({ headless: true, ...(engine === 'chromium' ? { channel: 'msedge' } : {}) });
 try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', hasTouch: true });
  const external = [], errors = [];
  await context.route('**/*', r => { if (new URL(r.request().url()).hostname === '127.0.0.1') return r.continue(); external.push(r.request().url()); return r.abort(); });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo'); await page.locator('#historyMoments').waitFor({ state: 'attached' });
  const journal = () => page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')));
  const open = async () => { await page.locator('#pin1').click(); await page.locator('#btn-cell08 .tag-trigger').click(); };
  await open(); assert.equal(await page.locator('#momentModal').isVisible(), false);
  assert.equal(await page.locator('#btn-cell08 #momentWords').count(), 1, 'Editor is inside the field module');
  assert.equal(await page.locator('#btn-cell08 button input').count(), 0, 'Inputs are not nested in a button');
  const originalAt = await page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_tag_drafts'))['1/cell08'].at);
  await page.locator('#momentWords').fill('ПРО');
  assert.equal(await page.locator('#tagSuggestions [role=option]').first().innerText(), '#прогулка');
  const count = (await journal()).moments.length;
  await page.locator('#momentWords').press('ArrowDown'); await page.locator('#momentWords').press('Enter');
  assert.equal(await page.locator('#momentWords').inputValue(), 'прогулка '); assert.equal((await journal()).moments.length, count, 'Completing a word does not submit');
  await page.locator('#momentWords').press('Enter'); assert.deepEqual((await journal()).moments.at(-1).tags, ['прогулка']);
  assert.equal((await journal()).moments.at(-1).at, originalAt);
  await open(); await page.locator('#momentWords').fill('пример #ид');
  await page.getByRole('option', { name: '#идея', exact: true }).click();
  assert.equal(await page.locator('#momentWords').inputValue(), 'пример #идея ');
  await page.locator('#momentWords').press('Escape'); assert.equal(await page.locator('#momentWords').isVisible(), false);
  await page.locator('#pin0').click(); await open();
  assert.equal(await page.locator('#momentWords').inputValue(), 'пример #идея ', 'Draft survives leaving the field; demo reload intentionally resets');
  await page.locator('#tagCancel').click();
  // Another hashtag control has its own draft and source.
  await open(); await page.locator('#momentWords').fill('первый'); await page.locator('#pin0').click();
  await page.evaluate(() => { habitTypes.cell09 = 'tag'; habitLabels.cell09 = 'Другой тег'; saveTypes(); saveLabels(); renderHabits(); });
  await page.locator('#btn-cell09 .tag-trigger').click(); assert.equal(await page.locator('#momentWords').inputValue(), '');
  await page.locator('#momentWords').fill('второй'); await page.locator('#momentWords').press('Escape');
  await open(); assert.equal(await page.locator('#momentWords').inputValue(), 'первый'); await page.locator('#tagCancel').click();
  // Desktop and both orientations, including the smallest module size.
  for (const [width, height] of [[1280, 900], [1024, 768], [768, 1024], [390, 844], [844, 390], [320, 700]]) {
   await page.setViewportSize({ width, height }); await open();
   await page.locator('#momentWords').fill('пр');
   await page.locator('#tagSuggestions').waitFor();
   const bounds = await page.locator('#tagSuggestions').boundingBox();
   assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y >= 0 && bounds.y + bounds.height <= height + 1, `Suggestions fit ${width}x${height}`);
   const extent = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth, wide: [...document.querySelectorAll('body *')].filter(n => { const b = n.getBoundingClientRect(); return b.width && b.right > innerWidth + 1; }).slice(-8).map(n => ({ id: n.id, cls: n.className, right: n.getBoundingClientRect().right })) }));
   assert.ok(extent.scroll <= extent.viewport, `${width}x${height}: ${JSON.stringify(extent)}`);
   await page.screenshot({ path: path.join(output, `inline-${width}x${height}.png`) });
   await page.getByRole('option', { name: '#прогулка', exact: true }).tap(); await page.locator('#tagSave').tap();
   await page.locator('#btn-cell09').tap(); await page.locator('#stateWheel').scrollIntoViewIfNeeded();
   assert.equal(await page.locator('#momentModal').isVisible(), true, `State panel visible at ${width}x${height}`);
   if (height < 520) await page.screenshot({ path: path.join(output, 'state-landscape.png') });
   const choices = await page.locator('.state-option').evaluateAll(ns => ns.map(n => { const b = n.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, height: b.height }; }));
   for (let i = 0; i < choices.length; i++) for (let k = i + 1; k < choices.length; k++) assert.ok(choices[i].right <= choices[k].left || choices[k].right <= choices[i].left || choices[i].bottom <= choices[k].top || choices[k].bottom <= choices[i].top);
   assert.ok(choices.every(b => b.height >= 44)); await page.locator('[data-state=calm]').tap();
   assert.equal((await journal()).moments.at(-1).state.id, 'calm');
  }
  // Keyboard selection and pointer release are also usable on desktop.
  await page.setViewportSize({ width: 1280, height: 900 }); await page.locator('#btn-cell09').click();
  await page.locator('[data-state=good]').focus(); await page.keyboard.press('Enter'); assert.equal((await journal()).moments.at(-1).state.id, 'good');
  await page.locator('#btn-cell09').click();
  const origin = await page.locator('#stateOrigin').boundingBox(), word = await page.locator('[data-state=joy]').boundingBox();
  await page.mouse.move(origin.x + origin.width / 2, origin.y + origin.height / 2); await page.mouse.down(); await page.mouse.move(word.x + word.width / 2, word.y + word.height / 2, { steps: 10 }); await page.mouse.up();
  assert.equal((await journal()).moments.at(-1).state.id, 'joy');
  assert.deepEqual(errors, []); assert.deepEqual(external, []); console.log(`PASS ${engine}: inline prefix input, keyboard/touch completion, per-control drafts, timestamp/source, 6 viewport sizes/orientations, radial touch/keyboard/drag, private demo isolation. ${output}`);
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
