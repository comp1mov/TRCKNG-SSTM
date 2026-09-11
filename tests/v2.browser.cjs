const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const output = process.env.TRCKNG_TEST_OUTPUT || path.join(require('node:os').tmpdir(), 'sstm-v2-check');
fs.mkdirSync(output, { recursive: true });
const url = process.env.TRCKNG_TEST_URL || 'http://127.0.0.1:5173/TRCKNG-SSTM/v2/points-lab.html';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('trckng_sstm_data_pin0', '{"fixture":"v1-sentinel"}'); });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.locator('.pad').waitFor();
    assert.equal(await page.locator('.pad').count(), 1);
    assert.deepEqual(errors, []);
    console.log('Dev server verified: v2 loads, one grid pad, three PINs, no runtime errors.');
    const read = () => page.evaluate(async () => (await SstmStore.transact(null)).world);
    const settled = () => page.waitForFunction(() => document.querySelector('#saveState').textContent === 'ЛОКАЛЬНО');
    await page.locator('.pad').click(); await settled();
    let world = await read(); const pointsId = world.modules[0].id, trackId = world.tracks[0].id, firstAt = world.events[0].at;
    await page.locator('.pad').click(); await settled();
    world = await read(); assert.equal(world.events.length, 2); assert.equal(world.cycles[0].startedAt, firstAt);
    await page.locator('#historyButton').click();
    await page.screenshot({ path: path.join(output, 'v2-history.png'), fullPage: true });
    await page.getByRole('button', { name: /^ОТРЕЗОК/ }).click();
    await page.locator('[name=name]').fill('Example interval');
    await page.locator('[data-minimize]').click();
    await page.locator('#windowTabs button').filter({ hasText: 'НАЗВАНИЕ ОТРЕЗКА' }).click();
    assert.equal(await page.locator('[name=name]').inputValue(), 'Example interval');
    await page.locator('button[type=submit]').click(); await settled();
    world = await read(); assert.equal(Object.values(world.intervalNotes)[0].name, 'Example interval');
    assert.equal(world.events.length, 2);
    await page.locator('#historyButton').click();
    await page.locator('[data-close]').click();
    await page.locator('#arrangeButton').click();
    await page.locator('.pad').click();
    await page.locator('[name=title]').fill('Draft title');
    await page.locator('[data-close]').click();
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('.pad').waitFor();
    world = await read(); assert.equal(world.cycles[0].startedAt, firstAt); assert.equal(world.events.length, 2);
    assert.equal(await page.locator('#panelHost').isVisible(), false);
    await page.locator('#arrangeButton').click(); await page.locator('.pad').click();
    assert.equal(await page.locator('[name=title]').inputValue(), 'Draft title');
    await page.locator('[name=column]').fill('4'); await page.locator('[name=row]').fill('3');
    await page.locator('button[type=submit]').click(); await settled();
    world = await read(); assert.equal(world.modules[0].title, 'Draft title'); assert.equal(world.modules[0].x, 3); assert.equal(world.events.length, 2);
    // A real drag should move a module and never capture a point or open settings.
    const pad = page.locator(`[data-module-id="${pointsId}"]`);
    const box = await pad.boundingBox();
    await page.mouse.move(box.x + 30, box.y + 30); await page.mouse.down(); await page.mouse.move(box.x + 94, box.y + 30, { steps: 6 }); await page.mouse.up(); await settled();
    world = await read(); assert.equal(world.modules[0].x, 4); assert.equal(world.events.length, 2);
    assert.equal(await page.locator('#panelHost').isVisible(), false);
    await pad.focus(); await page.keyboard.press('ArrowDown'); await settled();
    assert.equal((await read()).modules[0].y, 3);
    await page.locator('#arrangeButton').click();
    await page.locator('#addButton').click();
    await page.locator('[name=kind]').selectOption('count'); await page.locator('[name=title]').fill('Count A');
    await page.locator('button[type=submit]').click(); await settled();
    world = await read(); const countModule = world.modules.find(m => m.title === 'Count A');
    await page.locator(`[data-module-id="${countModule.id}"]`).click(); await settled();
    await page.locator('#pins button').nth(1).click();
    await page.locator('#addButton').click(); await page.locator('[name=trackId]').selectOption(countModule.trackId);
    await page.locator('[name=title]').fill('Same count'); await page.locator('button[type=submit]').click(); await settled();
    await page.locator('.pad').click(); await settled();
    world = await read(); assert.equal(world.tracks.find(t => t.id === countModule.trackId).value, 2);
    // Concurrent tabs append to one shared track transactionally.
    const other = await context.newPage(); await other.goto(url); await other.locator('.pad').waitFor();
    await Promise.all([
      page.evaluate(moduleId => SstmStore.transact({ type: 'capture', moduleId }), countModule.id),
      other.evaluate(moduleId => SstmStore.transact({ type: 'capture', moduleId }), countModule.id)
    ]);
    assert.equal((await read()).tracks.find(t => t.id === countModule.trackId).value, 4);
    await other.close();
    await page.locator('#menuButton').click(); await page.locator('[data-action=grow]').click(); await settled();
    assert.equal((await read()).pins[1].columns, 15);
    await page.locator('#fieldViewport').evaluate(el => { el.scrollLeft = 128; el.scrollTop = 128; });
    await page.locator('#menuButton').click(); await page.locator('[data-action=area]').click();
    await page.locator('[name=name]').fill('Saved area'); await page.locator('button[type=submit]').click(); await settled();
    assert.equal((await read()).views[0].name, 'Saved area');
    await page.locator('#pins button').first().click();
    await page.locator('#areaSelect').selectOption('home');
    await page.screenshot({ path: path.join(output, 'v2-desktop.png'), fullPage: true });
    for (const viewport of [{ width: 768, height: 1024 }, { width: 360, height: 800 }, { width: 320, height: 740 }]) {
      await page.setViewportSize(viewport); await page.locator('#historyButton').click();
      assert.equal(await page.locator('#fieldViewport').isVisible(), false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator('[data-minimize]').click();
      assert.equal(await page.locator('#fieldViewport').isVisible(), true);
      await page.screenshot({ path: path.join(output, `v2-${viewport.width}.png`), fullPage: true });
    }
    assert.equal(await page.evaluate(() => localStorage.getItem('trckng_sstm_data_pin0')), '{"fixture":"v1-sentinel"}');
    assert.deepEqual(errors, []);
    await context.close();
    const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const touchPage = await touchContext.newPage();
    touchPage.on('pageerror', e => errors.push(e.message));
    await touchPage.goto(url); await touchPage.locator('.pad').waitFor();
    await touchPage.locator('.pad').tap();
    await touchPage.waitForFunction(() => document.querySelector('#saveState').textContent === 'ЛОКАЛЬНО');
    await touchPage.locator('#arrangeButton').tap();
    const touchBox = await touchPage.locator('.pad').boundingBox();
    const cdp = await touchContext.newCDPSession(touchPage);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchBox.x + 30, y: touchBox.y + 30 }] });
    await touchPage.waitForTimeout(100); // Model a finger drag, not several taps in the same input frame.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchBox.x + 94, y: touchBox.y + 30 }] });
    await touchPage.waitForTimeout(100);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await touchPage.waitForFunction(() => document.querySelector('#saveState').textContent === 'ЛОКАЛЬНО');
    const touchWorld = await touchPage.evaluate(async () => (await SstmStore.transact(null)).world);
    assert.equal(touchWorld.modules[0].x, 1);
    assert.equal(touchWorld.events.length, 1, 'Touch arrangement does not capture extra points');
    await touchPage.locator('#fieldViewport').evaluate(el => { el.scrollLeft = 128; });
    await touchPage.waitForTimeout(350); // Finish the emulated gesture before the next independent tap.
    await touchPage.locator('#historyButton').tap();
    await touchPage.screenshot({ path: path.join(output, 'v2-touch-panel.png'), fullPage: true });
    assert.deepEqual(errors, []);
    await touchPage.locator('[data-minimize]').waitFor({ timeout: 3000 });
    await touchPage.locator('[data-minimize]').tap();
    await touchPage.waitForFunction(() => document.querySelector('#fieldViewport').scrollLeft === 128);
    await touchContext.close();
    // v1 and v2 caches coexist, and v2 reloads with its records offline.
    const offline = await browser.newContext({ serviceWorkers: 'allow' });
    const v1 = await offline.newPage();
    await v1.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await v1.goto(new URL('../', url).href); await v1.evaluate(async () => { await navigator.serviceWorker.ready; });
    const p = await offline.newPage();
    await p.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await p.goto(url); await p.locator('.pad').waitFor();
    await p.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.includes('/v2/'));
    await p.locator('.pad').click();
    await p.waitForFunction(() => document.querySelector('#saveState').textContent === 'ЛОКАЛЬНО');
    const cached = await p.evaluate(() => caches.keys());
    assert.ok(cached.some(key => key.startsWith('trckng-sstm-v1.')));
    assert.ok(cached.some(key => key.startsWith('trckng-sstm-v2-alpha-')));
    await offline.setOffline(true); await p.reload({ waitUntil: 'domcontentloaded' }); await p.locator('.pad').waitFor();
    assert.equal(await p.evaluate(async () => (await SstmStore.transact(null)).world.events.length), 1);
    await offline.close();
    console.log('PASS: points, naming, minimized/reloaded drafts, mouse/touch/keyboard movement, camera return, shared controls, concurrent tabs, grid growth, saved areas, tablet/phone, v1 isolation, offline reload.');
    console.log(`Screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
