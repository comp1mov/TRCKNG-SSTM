// Only invented sentinel content. This test never uses a real profile or exports.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = path.join(require('node:os').tmpdir(), 'sstm-v2-demo-check');
fs.mkdirSync(output, { recursive: true });
const base = 'http://127.0.0.1:5173/TRCKNG-SSTM/v2/';
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    const external = [], errors = [];
    await context.route('**/*', route => {
      if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
      external.push(route.request().url()); return route.abort();
    });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('trckng_sstm_labels_pin0', JSON.stringify({ cell01: 'PRIVATE SENTINEL' }));
      localStorage.setItem('trckng_sstm_data_pin0', JSON.stringify({ fixture: { cell01: 9876 } }));
      localStorage.setItem('trckng_sstm_pin_names', JSON.stringify({ 0: 'PRIVATE FIELD' }));
      localStorage.setItem('sb-vsabgctziegbtbpqyurb-auth-token', JSON.stringify({ access_token: 'TEST-SESSION-NOT-REAL', refresh_token: 'TEST-REFRESH' }));
      window.privateBaseline = JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
      const original = navigator.geolocation.getCurrentPosition;
      window.geolocationReads = 0;
      navigator.geolocation.getCurrentPosition = function (...args) { window.geolocationReads++; return original.apply(this, args); };
    });
    await page.goto(`${base}?mode=demo`); await page.locator('#btn-cell01').waitFor();
    const baseline = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]))));
    assert.equal(baseline, await page.evaluate(() => window.privateBaseline), 'Demo initialization must not touch personal storage');
    assert.equal(await page.locator('body').getAttribute('data-mode'), 'demo');
    assert.equal(await page.locator('#pin0').innerText(), 'ПРИМЕРЫ');
    assert.ok(!(await page.locator('body').innerText()).includes('PRIVATE'));
    const start = Number(await page.locator('#value-cell01').innerText());
    await page.locator('#btn-cell01').click();
    assert.equal(Number(await page.locator('#value-cell01').innerText()), start + 1);
    await page.waitForFunction(value => Number(document.querySelector('#value-cell09').textContent) === value * 2, start + 1);
    assert.equal(await page.locator('#btn-cell02').evaluate(el => el.classList.contains('running')), true);
    await page.locator('#btn-cell02').click();
    assert.equal(await page.locator('#btn-cell02').evaluate(el => el.classList.contains('running')), false);
    await page.locator('#btnViewHistory').click();
    assert.ok(await page.locator('#historyMatrix [data-matrix-habit]').count() > 0);
    await page.screenshot({ path: path.join(output, 'history.png'), fullPage: true });
    await page.locator('#btnHistoryPrevWeek').click();
    assert.ok(await page.locator('#historyMatrix [data-matrix-habit]').count() > 0);
    await page.locator('#btnViewTrack').click(); await page.locator('#pin1').click();
    assert.equal(await page.locator('#btn-cell03').getAttribute('data-type'), 'currency');
    await page.locator('#btn-cell01').click();
    assert.equal(await page.locator('#value-cell01').innerText(), '115¤');
    await page.locator('#pin2').click(); await page.locator('#btn-cell01').click();
    await page.locator('#cellEditInput').fill('Test button'); await page.locator('#cellEditSave').click();
    await page.locator('#btnViewTrack').click();
    assert.ok((await page.locator('#btn-cell01').innerText()).includes('Test button'));
    await page.locator('#surfaceMenuButton').click(); await page.locator('#surfaceCalendar').click();
    assert.equal(await page.locator('#dayPercent').isVisible(), true);
    await page.locator('#pin0').click();
    assert.equal(await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])))), baseline, 'Demo interactions must not write any personal/auth/preferences key');
    assert.equal(await page.evaluate(() => window.geolocationReads), 0);
    assert.deepEqual(external, [], 'Explicit demo performs no Auth, cloud, FX or geolocation request');
    await page.locator('#surfaceDemoReset').click(); await page.locator('#btn-cell01').waitFor();
    assert.equal(Number(await page.locator('#value-cell01').innerText()), start);
    assert.equal(await page.locator('#dayPercent').isVisible(), false);
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator('#btnViewLayout').click(); await page.locator('#layout-cell01 .layout-action').nth(1).click();
      await page.screenshot({ path: path.join(output, `editor-${width}.png`), fullPage: true });
      await page.locator('#cellEditCancel').click(); await page.locator('#btnViewTrack').click();
      await page.screenshot({ path: path.join(output, `field-${width}.png`), fullPage: true });
    }
    assert.deepEqual(errors, []);
    await context.close();
    // A first visitor on the ordinary URL also gets examples, without a private engine write.
    const visitor = await browser.newContext({ serviceWorkers: 'block' });
    await visitor.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    const fresh = await visitor.newPage(); fresh.on('pageerror', e => errors.push(e.message));
    await fresh.goto(base); await fresh.locator('#btn-cell01').waitFor();
    assert.equal(await fresh.locator('body').getAttribute('data-mode'), 'demo');
    assert.equal(await fresh.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('trckng_sstm_')).length), 0);
    await fresh.locator('#surfaceAccount').click(); await fresh.locator('#accountModal.visible').waitFor();
    assert.equal(await fresh.locator('body').getAttribute('data-mode'), 'account');
    assert.equal(await fresh.locator('#trackView').isVisible(), false, 'Account selection does not briefly show cached cells before sign-in');
    await visitor.close();
    assert.deepEqual(errors, []);
    console.log('PASS: explicit and first-visit demo; editable types/formula/timer/history/settings; reset; zero personal/auth storage changes and zero external demo requests; account entry and phone/tablet layouts.');
    console.log(`Synthetic screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
