// Fresh browser contexts and fabricated demo data only; no personal profile.
const pw = require('playwright'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const engine = process.env.SSTM_BROWSER || 'chromium';
const base = process.env.SSTM_TEST_BASE || 'http://127.0.0.1:5173/TRCKNG-SSTM/v2/';
const output = path.join(require('node:os').tmpdir(), 'sstm-mobile-field-check', engine);
fs.mkdirSync(output, { recursive: true });
async function until(check) { const end = Date.now() + 10000; while (!(await check())) { if (Date.now() > end) throw Error('Condition timed out'); await new Promise(r => setTimeout(r, 60)); } }
(async () => {
  const browser = await pw[engine].launch({ headless: true, ...(engine === 'chromium' ? { channel: 'msedge' } : {}) });
  try {
    for (const [width, height] of [[320, 640], [390, 700], [430, 820], [768, 1024], [844, 390], [1280, 900]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, serviceWorkers: 'block' });
      const errors = [];
      await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + '?mode=demo&lang=en');
      await page.waitForFunction(() => window.SstmReadability && document.querySelector('#surfacePanelToggle').hasAttribute('aria-controls'));
      await page.evaluate(() => document.fonts.ready);
      const compact = () => page.evaluate(() => document.body.classList.contains('surface-compact'));
      const initialCompact = width <= 600 || height <= 560;
      assert.equal(await compact(), initialCompact);
      if (!initialCompact) await page.locator('#surfacePanelToggle').tap();
      const geometry = await page.evaluate(() => ({
        header: document.querySelector('.header').getBoundingClientRect().height,
        field: document.querySelector('#trackView').getBoundingClientRect().height,
        footer: document.querySelector('.surface-footer').getBoundingClientRect().height,
        bottom: document.querySelector('.container').getBoundingClientRect().bottom,
        overflow: document.documentElement.scrollWidth > innerWidth
      }));
      assert.ok(geometry.header <= 180, JSON.stringify({ width, height, geometry }));
      assert.ok(Math.abs(geometry.field + geometry.header + geometry.footer - height) <= 2);
      assert.ok(geometry.bottom <= height + 1); assert.equal(geometry.overflow, false);
      const state = () => page.evaluate(() => JSON.stringify([HABITS, cellLayout, weekData, TRCKNG_STORAGE.getItem('sstm_v2_cycles')]));
      const before = await state();
      await page.locator('#surfacePanelToggle').tap();
      assert.equal(await page.locator('#btnViewLayout').isVisible(), true);
      await page.locator('#surfacePanelToggle').tap(); assert.equal(await state(), before, 'Folding does not record, move or resize modules');
      await page.locator('#surfaceMenuButton').tap();
      await page.touchscreen.tap(4, geometry.header + 20);
      assert.equal(await page.locator('#surfaceMenu').isVisible(), false);
      assert.equal(await state(), before, 'A tap outside the menu dismisses it without recording');
      await page.locator('#surfaceMenuButton').tap();
      const menu = await page.locator('#surfaceMenu').boundingBox();
      assert.ok(menu.y >= 0 && menu.y + menu.height <= height && menu.x >= 0 && menu.x + menu.width <= width);
      await page.locator('#surfaceLanguage').selectOption('ru');
      await until(async () => await page.locator('#surfacePanelToggle').getAttribute('aria-label') === 'Показать панели');
      await page.locator('#surfaceLanguage').selectOption('en');
      await page.locator('#btnViewLayout').tap(); assert.equal(await page.locator('#surfaceMenu').isVisible(), false);
      await page.locator('#surfaceAddCell').tap(); await page.locator('#cellEditInput').fill('Example module');
      await page.locator('#cellEditSave').tap();
      await page.locator('#surfaceMenuButton').tap(); await page.locator('#btnViewTrack').tap();
      await page.locator('#cycleCapture').tap();
      await page.locator('#cycleOpen').tap(); assert.ok(await page.locator('#cycleModal').isVisible());
      await page.locator('#cycleModal .surface-panel-head button').last().tap();
      const started = await state();
      await page.locator('#surfacePanelToggle').tap(); await page.locator('#surfacePanelToggle').tap();
      assert.equal(await state(), started, 'Folding does not split a running recording');
      // Three-digit values and their unit use the same main size as one digit.
      await page.evaluate(() => {
        ['cell01', 'cell02', 'cell03'].forEach((id, i) => {
          habitTypes[id] = 'value'; valueFormats[id] = 'raw'; weekData[currentWeekKey][id] = [1, 25, 190][i];
        }); renderHabits();
        const unit = document.createElement('span'); unit.className = 'btn-value-suffix'; unit.textContent = '★';
        document.querySelector('#value-cell03').append(unit); SstmReadability.fit();
      });
      await until(async () => await page.locator('#value-cell03').evaluate(n => Boolean(n.style.fontSize)));
      const sizes = await page.locator('#value-cell01,#value-cell02,#value-cell03').evaluateAll(nodes => nodes.map(n => parseFloat(getComputedStyle(n).fontSize)));
      assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `Consistent figures: ${sizes}`);
      assert.ok(sizes[0] >= 54, `Large default figures: ${sizes}`);
      const text = await page.locator('#value-cell03').textContent(); assert.equal(text, '190★');
      await page.screenshot({ path: path.join(output, `field-${width}x${height}.png`) });
      await page.reload(); await page.waitForFunction(() => window.SstmReadability);
      assert.equal(await compact(), true, 'Explicit compact preference survives reload');
      await page.locator('#surfacePanelToggle').tap();
      await page.reload(); await page.waitForFunction(() => window.SstmReadability);
      assert.equal(await compact(), false, 'Explicit expanded preference survives reload');
      assert.deepEqual(errors, []); await context.close();
    }
    console.log(`PASS ${engine}: compact/expanded layouts at six viewports, menu access, recording, creation, language, stable data, uniform suffix figures and reload preferences. Screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
