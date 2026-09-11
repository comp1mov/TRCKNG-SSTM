// New-account and language flows use an isolated browser and fabricated API replies.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = process.env.SSTM_TEST_BASE || 'http://127.0.0.1:5173/TRCKNG-SSTM/v2/';
async function until(test) { const end = Date.now() + 15000; while (!(await test())) { if (Date.now() > end) throw Error('Condition timed out'); await new Promise(r => setTimeout(r, 100)); } }
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    const errors = [], calls = [], user = { id: '00000000-0000-4000-8000-000000000063', email: 'test@example.invalid', aud: 'authenticated', role: 'authenticated' };
    const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url'), 'fixture'].join('.');
    let cloud = null, signups = 0;
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin === new URL(base).origin) return route.continue();
      calls.push([req.method(), url.pathname]);
      const json = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
      if (url.pathname === '/auth/v1/signup') { signups++; return json({ user, session: null }); }
      if (url.pathname === '/auth/v1/token') return json({ access_token: token, refresh_token: 'fixture-only', expires_in: 3600, token_type: 'bearer', user });
      if (url.pathname === '/auth/v1/user') return json(user);
      if (url.pathname === '/rest/v1/trckng_v2_snapshots') return json(req.headers().accept?.includes('vnd.pgrst.object') ? cloud : cloud ? [cloud] : []);
      if (url.pathname === '/rest/v1/rpc/commit_trckng_v2') {
        const payload = req.postDataJSON(); assert.equal(payload.expected_revision, cloud?.revision || 0);
        assert.equal(payload.source, undefined, 'Fresh accounts do not import a v1 snapshot');
        cloud = { app_state: payload.state, revision: (cloud?.revision || 0) + 1, updated_at: new Date().toISOString(), device_id: payload.device, write_id: payload.mutation_id };
        return json([cloud]);
      }
      return route.abort();
    });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '?mode=demo'); await page.locator('#btn-cell01').waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    await until(async () => await page.locator('#cycleCapture').innerText() === 'START');
    assert.deepEqual(calls, [], 'Demo requires no authentication');
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => [...document.fonts].some(face => face.family === 'Sstm Mono' && face.status === 'loaded')), true);
    const face = await page.locator('#value-cell01').evaluate(el => ({ size: parseFloat(getComputedStyle(el).fontSize), font: getComputedStyle(el).fontFamily, width: el.scrollWidth, box: el.clientWidth }));
    assert.ok(face.size >= 60 && face.size <= 90); assert.ok(face.font.includes('Sstm Mono')); assert.ok(face.width <= face.box + 1);
    const originalValue = await page.locator('#value-cell01').innerText();
    await page.locator('#surfaceMenuButton').click(); await page.locator('#surfaceLanguage').selectOption('ru');
    await until(async () => await page.locator('#cycleCapture').innerText() === 'НАЧАТЬ');
    assert.equal(await page.locator('#value-cell01').innerText(), originalValue);
    await page.locator('#surfaceLanguage').selectOption('en'); await page.locator('#surfaceMenuButton').click();
    await page.locator('#pin1').click(); await page.locator('#btn-cell08').click(); await page.locator('#momentWords').fill('МЕНЮ черновик');
    await page.locator('#surfaceMenuButton').click(); await page.locator('#surfaceLanguage').selectOption('ru'); await page.locator('#surfaceMenuButton').click();
    await page.locator('#btn-cell08').click(); assert.equal(await page.locator('#momentWords').inputValue(), 'МЕНЮ черновик');
    await page.locator('#tagCancel').click();
    await page.goto(base + '?mode=account&lang=en'); await page.locator('#accountEmail').waitFor();
    assert.ok(await page.locator('#accountSignUp').isVisible()); assert.equal(await page.locator('#accountAdvanced').isVisible(), false);
    await page.locator('#accountEmail').fill(user.email); await page.locator('#accountPassword').fill('fictional-password');
    await page.locator('#accountSignUp').click(); await until(() => signups === 1);
    await until(async () => /check your email/i.test(await page.locator('#accountStatus').innerText()));
    assert.equal(cloud, null, 'Email confirmation does not initialize private data');
    await page.locator('#accountPassword').fill('fictional-password'); await page.locator('#accountSignIn').click();
    await page.locator('#accountCreateField').waitFor();
    assert.equal(await page.locator('#migrationAdvanced').getAttribute('open'), null);
    await page.locator('#accountCreateField').click(); await until(() => cloud?.revision === 1);
    await page.locator('#cycleCapture').waitFor();
    assert.ok(cloud.app_state.pinData.every(pin => Object.values(pin.habitLabels).every(v => v === '')));
    assert.deepEqual(cloud.app_state.cycleJournal.cycles, []);
    assert.ok(!calls.some(([, url]) => url === '/rest/v1/trckng_snapshots'), 'Fresh setup does not read or write v1');
    await page.locator('#cycleCapture').click(); await until(() => cloud.app_state.cycleJournal.cycles.length === 1);
    const startedAt = cloud.app_state.cycleJournal.cycles[0].startedAt;
    await page.locator('#surfaceAccount').click();
    assert.ok(await page.locator('#accountSyncNow').isVisible());
    assert.equal(await page.locator('#accountAdvanced').getAttribute('open'), null);
    await page.locator('#accountBackToField').click();
    await page.locator('#btnViewLayout').click(); await page.locator('#surfaceAddCell').click();
    await page.locator('#cellEditInput').fill('МЕНЮ'); await page.locator('#cellEditSave').click();
    await page.locator('#btnViewTrack').click();
    assert.ok(await page.locator('.btn-label').filter({ hasText: /^МЕНЮ$/ }).count());
    await page.locator('#surfaceMenuButton').click(); await page.locator('#surfaceLanguage').selectOption('ru');
    await page.locator('#surfaceLanguage').selectOption('en'); await page.locator('#surfaceMenuButton').click();
    assert.ok(await page.locator('.btn-label').filter({ hasText: /^МЕНЮ$/ }).count());
    await until(() => cloud.app_state.pinData.some(pin => Object.values(pin.habitLabels).includes('МЕНЮ')));
    await page.reload(); await page.locator('#cycleCapture').waitFor();
    assert.equal(cloud.app_state.cycleJournal.cycles[0].startedAt, startedAt);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 844, height: 390 }, { width: 320, height: 700 }]) {
      await page.setViewportSize(viewport); await page.locator('#surfaceAccount').click();
      assert.ok(await page.locator('#accountBackToField').isVisible());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: path.join(require('node:os').tmpdir(), `sstm-060-account-${viewport.width}.png`) });
      await page.locator('#accountBackToField').click();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: anonymous demo, EN/RU without data changes, drafts, font/large numbers, signup confirmation, fresh account with no v1 access, recording sync/reload, protected user labels, account navigation and responsive layouts.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
