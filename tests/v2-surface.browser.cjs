// Isolated synthetic accounts only. Never read the user's exports or browser profile.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const output = path.join(require('node:os').tmpdir(), 'sstm-v2-surface-check');
fs.mkdirSync(output, { recursive: true });
const url = 'http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=account&lang=ru';
const kinds = ['unit', 'value', 'duration_sec', 'duration_min', 'sleep', 'duration_sec_count', 'timer', 'countdown', 'money_income', 'money_budget', 'math', 'led_pulse', 'currency'];

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    const errors = [], writes = [];
    const user = { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid', aud: 'authenticated', role: 'authenticated' };
    const token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url'), 'fixture'].join('.');
    let cloud, source, sourceBaseline, dropNextReply = false, holdReply = null;
    const routeAccount = async route => {
      const request = route.request(), target = new URL(request.url());
      if (target.hostname === '127.0.0.1') return route.continue();
      const json = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
      if (target.pathname === '/auth/v1/token') return json({ access_token: token, refresh_token: 'fixture-only', expires_in: 3600, token_type: 'bearer', user });
      if (target.pathname === '/auth/v1/user') return json(user);
      if (target.pathname === '/auth/v1/logout') return json({});
      if (target.pathname === '/rest/v1/trckng_snapshots') {
        assert.equal(request.method(), 'GET', 'V2 must never write to v1');
        return json(source ? [source] : []);
      }
      if (target.pathname === '/rest/v1/trckng_v2_snapshots') return json(request.headers().accept?.includes('vnd.pgrst.object') ? cloud : cloud ? [cloud] : []);
      if (target.pathname === '/rest/v1/rpc/commit_trckng_v2') {
        const payload = request.postDataJSON();
        if (cloud?.write_id === payload.mutation_id) return json([cloud]);
        if ((cloud?.revision || 0) !== payload.expected_revision) return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: '40001', message: 'V2 revision conflict' }) });
        cloud = { user_id: user.id, revision: (cloud?.revision || 0) + 1, app_state: payload.state, source_state: cloud?.source_state || payload.source,
          source_updated_at: cloud?.source_updated_at || payload.source_at, write_id: payload.mutation_id, device_id: payload.device, updated_at: new Date().toISOString() };
        writes.push(structuredClone(cloud));
        if (dropNextReply) { dropNextReply = false; return route.abort(); }
        if (holdReply) { const hold = holdReply; holdReply = null; hold.arrived(); await hold.wait; }
        return json([cloud]);
      }
      return route.abort();
    };
    await context.route('**/*', routeAccount);
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    const field = async () => { if (!await page.locator('#btnViewTrack').isVisible()) await page.locator('#surfaceMenuButton').click(); await page.locator('#btnViewTrack').click(); };
    await page.addInitScript(() => { if (!localStorage.getItem('trckng_sstm_labels_pin0')) localStorage.setItem('trckng_sstm_labels_pin0', '{"cell01":"V1 sentinel"}'); });
    await page.goto(url); await page.locator('#habitsGrid .btn-habit').first().waitFor({ state: 'attached' });
    assert.equal(await page.locator('#addButton').count(), 0);
    assert.equal(await page.locator('#surfaceWelcome').isVisible(), true);
    assert.equal(await page.locator('#dayPercent').isVisible(), false);
    assert.equal(await page.locator('.pin').count(), 3);
    cloud = await page.evaluate(({ kinds, user }) => {
      const week = getWeekKey(), slots = Array.from({ length: 9 }, (_, i) => `cell${String(i + 1).padStart(2, '0')}`);
      const pinData = [0, 1, 2].map(pin => {
        const types = Object.fromEntries(slots.map((slot, i) => [slot, kinds[(pin * 9 + i) % kinds.length]]));
        return { pin, habitLabels: Object.fromEntries(slots.map((slot, i) => [slot, pin === 2 && i === 8 ? '' : `Module ${pin + 1}.${i + 1}`])),
          habitTypes: types, habitColors: Object.fromEntries(slots.map((slot, i) => [slot, ['#d1f55a', '#c898ef', '#65bdc6'][i % 3]])),
          weekData: { [week]: Object.fromEntries(slots.map(slot => [slot, 7])) }, unitSettings: { cell01: { step: 3, total: false } },
          moneySettings: { cell01: { step: 2, startAmount: 100, currency: '$' }, cell09: { step: 5, currency: '$' } },
          timerSettings: { cell07: { duration: 20, format: 'mm:ss', sound: 'none', volume: 0 }, cell08: { targetDate: '2030-01-01', targetTime: '12:00' } },
          mathSettings: { cell02: { a: 'cell01', bMode: 'number', bNum: 2, op: 'mul', formatFrom: 'raw' } },
          currencyCache: {}, currencySettings: { cell04: { from: 'USD', to: 'EUR', amount: 2 } },
          durationSessions: [], counterChangeLog: [] };
      });
      return { user_id: user.id, updated_at: new Date().toISOString(), device_id: 'fixture-device', app_state: {
        schemaVersion: 4, snapshotType: 'fullApp', version: '1.34.0', pinNames: ['FIELD A', 'FIELD B', 'FIELD C'], currentPin: 0,
        pinData, currencyCache: { USD_EUR: { rate: 0.9, timestamp: Date.now() } }
      } };
    }, { kinds, user });
    source = structuredClone(cloud); sourceBaseline = JSON.stringify(source); cloud = null;
    await page.locator('#surfaceSignIn').click();
    await page.waitForFunction(() => !document.querySelector('#accountSignIn').disabled);
    await page.locator('#accountEmail').fill(user.email); await page.locator('#accountPassword').fill('fixture-password');
    await page.locator('#accountSignIn').click();
    await page.locator('#migrationGate').waitFor();
    await page.locator('#surfaceAccount').click();
    assert.equal(await page.locator('#accountBackToField').innerText(), '← СОЗДАТЬ ПОЛЕ');
    await page.locator('#accountBackToField').click();
    assert.equal(await page.locator('#migrationGate').isVisible(), true);
    assert.equal(writes.length, 0, 'Login does not create or upload default v2 data');
    await page.locator('#migrationAdvanced summary').click();
    await page.locator('#migrationPreview').click(); await page.locator('#migrationApply').waitFor();
    assert.equal(writes.length, 0, 'Preview does not write anything');
    await page.locator('#migrationApply').click();
    await page.waitForFunction(() => document.querySelector('#pin0')?.textContent === 'FIELD A');
    assert.equal(writes.length, 1, 'The confirmed migration creates v2 once');
    assert.equal(JSON.stringify(source), sourceBaseline, 'V1 cloud data is byte-unchanged');
    assert.deepEqual(cloud.app_state.pinData, source.app_state.pinData);
    assert.deepEqual(cloud.source_state, source.app_state);
    await page.locator('#cycleCapture').click(); await page.locator('#cycleCapture').click();
    assert.equal(await page.locator('#surfaceWelcome').isVisible(), false);
    assert.equal(await page.locator('#habitsGrid .btn-habit').count(), 9);
    assert.equal(await page.locator('#btn-cell01 .btn-value').innerText(), '7');
    await page.locator('#btn-cell01').click();
    assert.equal(await page.locator('#btn-cell01 .btn-value').innerText(), '10');
    await page.waitForFunction(() => document.querySelector('#btnCloudSync').dataset.syncState === 'ready', { timeout: 10000 });
    assert.ok(writes.length > 0, 'The real engine queues changes to the same account');
    assert.equal(writes.at(-1).app_state.snapshotType, 'fullApp');
    assert.equal(writes.at(-1).app_state.pinData.length, 3);
    await page.locator('#btn-cell03').click();
    assert.equal(await page.locator('#btn-cell03').evaluate(el => el.classList.contains('running')), true);
    await page.locator('#surfaceAccount').click(); await page.locator('#accountModal').getByRole('button', { name: 'Свернуть окно', exact: true }).click();
    assert.equal(await page.locator('#btn-cell03').evaluate(el => el.classList.contains('running')), true, 'Minimizing leaves a duration running');
    await page.locator('#surfaceDock button').click(); await page.locator('#accountBackToField').click();
    assert.equal(await page.locator('#trackView').isVisible(), true);
    assert.equal(await page.evaluate(() => Boolean(TRCKNG_ACCOUNT.ready)), true, 'Returning to the field does not sign out');
    await page.locator('#btn-cell03').click();
    await page.evaluate(() => openCellEditModal('cell03'));
    await page.locator('#stopwatchMode').selectOption('week'); await page.locator('#stopwatchFormat').selectOption('hours'); await page.locator('#cellEditSave').click();
    await page.locator('#pin1').click();
    const types = await page.locator('#habitsGrid .btn-habit').evaluateAll(nodes => nodes.map(n => n.dataset.type));
    for (const kind of ['money_budget', 'math', 'led_pulse', 'currency']) assert.ok(types.includes(kind));
    await page.locator('#btn-cell01').click();
    await page.waitForFunction(() => document.querySelector('#btn-cell02 .btn-value').textContent.trim() === '10', null, { timeout: 3000 });
    assert.equal(await page.locator('#btn-cell02 .btn-value').innerText(), '10', 'Math keeps its original same-PIN references');
    await page.locator('#pin2').click(); await page.locator('#btn-cell09').click();
    await page.locator('#cellEditModal.visible').waitFor();
    assert.equal(await page.locator('#cellEditModal .type-btn[data-type]').count(), 17);
    await page.locator('#cellEditInput').fill('New counter');
    await page.locator('#cellEditModal [data-type=unit]').click();
    await page.locator('#unitStep').fill('2'); await page.locator('#cellEditSave').click();
    await page.locator('#btnViewTrack').click();
    assert.ok((await page.locator('#btn-cell09').innerText()).includes('New counter'));
    await page.locator('#pin0').click();
    // A minimized editor must keep its source PIN and draft.
    await page.locator('#btnViewLayout').click(); await page.locator('#layout-cell01 .layout-action').nth(1).click();
    await page.locator('#cellEditInput').fill('Renamed A');
    await page.locator('#cellEditModal .surface-panel-head button').first().click();
    await page.locator('#pin1').click();
    await page.locator('#surfaceDock button').click();
    assert.equal(await page.locator('#cellEditInput').inputValue(), 'Renamed A');
    assert.equal(await page.locator('.pin.active').getAttribute('data-pin'), '0');
    await page.locator('#cellEditSave').click();
    await page.locator('#btnViewTrack').click();
    assert.equal(await page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('trckng_sstm_labels_pin0')).cell01), 'Renamed A');
    assert.equal(await page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('trckng_sstm_labels_pin1')).cell01), 'Module 2.1');
    assert.equal(await page.evaluate(() => localStorage.getItem('trckng_sstm_labels_pin0')), '{"cell01":"V1 sentinel"}');
    // Extra controls use exactly the same account path, including their free position.
    await page.locator('#btnViewLayout').click(); await page.locator('#surfaceAddCell').click();
    await page.locator('#cellEditInput').fill('Account extra'); await page.locator('#unitStep').fill('2');
    await page.locator('#cellEditSave').click();
    const extraId = await page.evaluate(() => HABITS.find(id => id.startsWith('cell-')));
    await page.locator(`#layout-${extraId} .field-grip`).focus();
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    await page.locator('#btnViewTrack').click(); await page.locator(`#btn-${extraId}`).click();
    await page.waitForFunction(() => document.querySelector('#btnCloudSync').dataset.syncState === 'ready', null, { timeout: 10000 });
    assert.equal(cloud.app_state.pinData[0].habitLabels[extraId], 'Account extra');
    assert.equal(cloud.app_state.pinData[0].cellLayout[extraId].col, 6);
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
    await page.locator('#btnViewHistory').click(); await page.locator('#historyMatrix').waitFor();
    await page.screenshot({ path: path.join(output, 'history.png'), fullPage: true });
    await page.locator('#btnViewTrack').click();
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 850 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator('#surfaceAccount').click();
      assert.equal(await page.locator('#trackView').isVisible(), false);
      await page.locator('#accountModal > div').evaluate(el => { el.scrollTop = el.scrollHeight; });
      const backBox = await page.locator('#accountBackToField').boundingBox();
      assert.ok(backBox.y >= 0 && backBox.y + backBox.height < 850, 'Account return stays visible without scrolling back');
      await page.screenshot({ path: path.join(output, `panel-${width}.png`), fullPage: true });
      await page.locator('#accountBackToField').click();
      assert.equal(await page.locator('#trackView').isVisible(), true);
      await page.locator('#surfaceAccount').click(); await field();
      assert.equal(await page.locator('#accountModal').isVisible(), false, 'The field tab dismisses the account overlay');
      await page.screenshot({ path: path.join(output, `field-${width}.png`), fullPage: true });
    }
    assert.deepEqual(errors, []);
    await page.setViewportSize({ width: 1280, height: 900 });
    const duplicate = await context.newPage(); await duplicate.goto(url);
    await duplicate.locator('#surfaceLoadError').waitFor();
    assert.match(await duplicate.locator('#surfaceLoadError').innerText(), /другой вкладке/);
    assert.equal(await duplicate.locator('#habitsGrid').count(), 0, 'A second local writer never starts'); await duplicate.close();
    // A second independent device receives the same controls and updates the first.
    const repairedFirstTime = await page.evaluate(async () => {
      let j = JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')), c = j.cycles[0], p = c.points[0];
      j = SstmData.changeTime(j, c.id, p.id, p.at - 60000); j = SstmData.tagInterval(j, c.id, p.id, 'fixture shared');
      j = SstmData.setDeleted(j, c.id, p.id, true, undefined);
      j = SstmMoments.record(j, { kind: 'state', stateId: 'sstm:state:tender', at: Date.now(), source: { pin: 0, cellId: 'fixture-state', label: 'Example state' } });
      TRCKNG_STORAGE.setItem('sstm_v2_cycles', JSON.stringify(j)); markCloudDirty('fixture interval repair');
      dispatchEvent(new Event('sstm-v2-loaded')); await TRCKNG_ACCOUNT.sync(); return p.at - 60000;
    });
    // A modular source/control commits together and travels with the same account.
    await page.locator('#pin2').click(); await page.locator('#surfaceMenuButton').click(); await page.locator('#surfaceScenarios').click();
    await page.locator('[data-recipe="work-pay"] button').click(); await page.locator('#cellEditInput').fill('Synced work fixture');
    await page.locator('#cellEditSave').click(); await field();
    const workId = await page.evaluate(() => HABITS.find(id => habitTypes[id] === 'modular'));
    await page.locator(`#btn-${workId}`).click(); await page.evaluate(() => TRCKNG_ACCOUNT.sync());
    assert.equal(cloud.app_state.dataVersion, 2); assert.ok(cloud.app_state.moduleJournal.tracks[0].running);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem(TRCKNG_STORAGE.keyName)).version), 6);
    // Timestamped words and custom state choices share the checked account envelope.
    await page.locator('#surfaceMenuButton').click(); await page.locator('#surfaceScenarios').click(); await page.locator('[data-recipe="tag"] button').click();
    await page.locator('#cellEditSave').click(); await field();
    const tagId = await page.evaluate(() => HABITS.find(id => habitTypes[id] === 'tag'));
    await page.locator(`#btn-${tagId}`).click(); await page.locator('#momentWords').fill('#fixturemoment'); await page.locator('#momentWords').press('Enter');
    await page.locator('#surfaceMenuButton').click(); await page.locator('#surfaceScenarios').click(); await page.locator('[data-recipe="state"] button').click();
    await page.locator('#cellEditSave').click(); await field();
    const stateId = await page.evaluate(() => HABITS.find(id => habitTypes[id] === 'state'));
    await page.locator(`#btn-${stateId}`).click(); await page.locator('#stateCustom summary').click(); await page.locator('#stateNewLabel').fill('Fixture flow'); await page.locator('#stateAddForm button').click();
    await page.getByRole('button', { name: 'Fixture flow', exact: true }).click(); await page.evaluate(() => TRCKNG_ACCOUNT.sync());
    assert.equal(cloud.app_state.cycleJournal.version, 4); assert.equal(cloud.app_state.cycleJournal.moments.length, 3);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem(TRCKNG_STORAGE.keyName)).version), 6);
    await page.locator('#pin0').click();
    const device = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', isMobile: true, hasTouch: true });
    await device.route('**/*', routeAccount);
    const phone = await device.newPage(); phone.on('pageerror', e => errors.push(e.message));
    await phone.goto(url); await phone.locator('#surfaceAccount').tap();
    await phone.waitForFunction(() => !document.querySelector('#accountSignIn').disabled);
    await phone.locator('#accountEmail').fill(user.email); await phone.locator('#accountPassword').fill('fixture-password'); await phone.locator('#accountSignIn').tap();
    await phone.waitForFunction(() => document.querySelector('#pin0')?.textContent === 'FIELD A');
    if (await phone.locator('#accountModal').isVisible()) await phone.locator('#accountBackToField').tap();
    await phone.locator('#pin2').tap(); await phone.locator(`#btn-${workId}`).tap();
    assert.equal(await phone.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')).stateOptions[0].label), 'Fixture flow');
    assert.equal(await phone.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')).moments.length), 3);
    await phone.locator(`#btn-${stateId}`).tap(); await phone.locator('[data-state="calm"]').tap();
    assert.equal(await phone.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_modules')).tracks[0].sessions.length), 1);
    await phone.locator('#pin0').tap();
    assert.deepEqual(await phone.evaluate(() => buildCloudSnapshot().stopwatchJournal.views.find(v => v.pin === 0 && v.cellId === 'cell03')), {pin:0,cellId:'cell03',mode:'week',format:'hours'});
    await phone.evaluate(() => openCellEditModal('cell03')); await phone.locator('#stopwatchFormat').selectOption('clock'); await phone.locator('#cellEditSave').click();
    assert.equal(await phone.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')).cycles[0].points.length), 2, 'Points share the v2 account sync');
    const syncedJournal = await phone.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')));
    assert.ok(syncedJournal.cycles[0].deletedIntervals[syncedJournal.cycles[0].points[0].id], 'Interval trash travels to the second device');
    assert.equal(syncedJournal.moments[0].state.id, 'sstm:state:tender');
    assert.equal(syncedJournal.cycles[0].startedAt, repairedFirstTime); assert.equal(syncedJournal.edits[0].before.at, repairedFirstTime + 60000);
    assert.deepEqual(syncedJournal.cycles[0].tags[syncedJournal.cycles[0].points[0].id], ['fixture', 'shared']);
    assert.equal(await phone.locator('#habitsGrid .btn-habit').count(), 10);
    assert.equal(await phone.evaluate(id => cellLayout[id].col, extraId), 6);
    await phone.locator(`#btn-${extraId}`).tap();
    assert.equal(await phone.locator(`#value-${extraId}`).innerText(), '4');
    assert.ok((await phone.locator('#btn-cell01').innerText()).includes('Renamed A'));
    await phone.locator('#btn-cell01').tap();
    await phone.waitForFunction(() => document.querySelector('#btnCloudSync').dataset.syncState === 'ready', null, { timeout: 10000 });
    await page.evaluate(() => triggerCloudSync('test-device-return', { force: true }));
    await page.locator('#pin0').click();
    assert.equal(await page.locator('#btn-cell01 .btn-value').innerText(), '13');
    assert.equal(await page.evaluate(() => buildCloudSnapshot().stopwatchJournal.views.find(v => v.pin === 0 && v.cellId === 'cell03').format), 'clock');
    assert.equal(await page.locator(`#value-${extraId}`).innerText(), '4');
    assert.equal(await page.evaluate(id => cellLayout[id].col, extraId), 6);
    assert.equal(await page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_modules')).tracks[0].running), null, 'Stopping on another device retains one completed interval');
    assert.equal(await page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')).moments.length), 4, 'Phone state choice returns to the first device');
    await phone.screenshot({ path: path.join(output, 'fresh-phone.png'), fullPage: true });
    await page.locator('#btn-cell01').click(); await page.locator('#btn-cell01').click();
    await phone.locator('#btn-cell01').tap(); await phone.evaluate(() => TRCKNG_ACCOUNT.sync());
    const remote = JSON.stringify(cloud);
    await page.evaluate(() => TRCKNG_ACCOUNT.sync());
    assert.equal(await page.locator('#btnCloudSync').getAttribute('data-sync-state'), 'conflict');
    assert.equal(JSON.stringify(cloud), remote, 'Conflicting local edits do not overwrite remote data');
    page.once('dialog', dialog => dialog.accept()); await page.evaluate(() => TRCKNG_ACCOUNT.load());
    assert.equal(await page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_recovery')).pinData[0].weekData[getWeekKey()].cell01), 19, 'Conflict recovery retains the local records');
    source.app_state.pinNames[0] = 'LATER V1'; source.updated_at = new Date(Date.now() + 10000).toISOString();
    await page.evaluate(() => TRCKNG_ACCOUNT.sync());
    assert.equal(await page.locator('#pin0').innerText(), 'FIELD A', 'Later v1 edits do not flow into the independent v2 copy');
    await device.close();
    dropNextReply = true;
    await page.locator('#cycleCapture').click(); await page.evaluate(() => TRCKNG_ACCOUNT.sync());
    assert.ok(await page.evaluate(() => TRCKNG_STORAGE.getItem('sstm_v2_pending')), 'An unacknowledged write remains durable');
    const afterLostReply = cloud.app_state.cycleJournal.cycles[0].points.length, lostRevision = cloud.revision;
    await page.locator('#cycleCapture').click(); await page.evaluate(() => TRCKNG_ACCOUNT.sync());
    assert.equal(cloud.app_state.cycleJournal.cycles[0].points.length, afterLostReply + 1);
    assert.equal(cloud.revision, lostRevision + 1, 'Retry did not add another revision; only the later edit did');
    let releaseReply, signalArrival;
    const arrived = new Promise(resolve => { signalArrival = resolve; });
    holdReply = { arrived: signalArrival, wait: new Promise(resolve => { releaseReply = resolve; }) };
    await page.locator('#cycleCapture').click(); await page.evaluate(() => { window.fixturePendingSync = TRCKNG_ACCOUNT.sync(); });
    await arrived;
    await page.locator('#cycleCapture').click(); releaseReply(); await page.evaluate(() => window.fixturePendingSync);
    assert.equal(await page.evaluate(() => managedAccountDirty()), true, 'Edits made during upload stay pending');
    await page.evaluate(() => TRCKNG_ACCOUNT.sync());
    assert.equal(cloud.app_state.cycleJournal.cycles[0].points.length, afterLostReply + 3);
    await page.locator('#btnViewLayout').click(); await page.locator('#layout-cell01 .layout-action').nth(1).click();
    await page.locator('#unitStep').fill('99');
    await page.evaluate(() => {
      const settings = JSON.parse(TRCKNG_STORAGE.getItem('trckng_sstm_unit_settings_pin0'));
      settings.cell01.step = 4; TRCKNG_STORAGE.setItem('trckng_sstm_unit_settings_pin0', JSON.stringify(settings));
    });
    await page.locator('#cellEditSave').click();
    assert.equal(await page.locator('.surface-stale').isVisible(), true);
    assert.equal(await page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('trckng_sstm_unit_settings_pin0')).cell01.step), 4, 'A stale form cannot replace the latest saved setting');
    await page.locator('#cellEditCancel').click();
    // Exercise user-facing backup and restore controls, not just model helpers.
    const downloadJson = async (click, name) => {
      const downloading = page.waitForEvent('download', { timeout: 5000 }); await click();
      const download = await downloading, destination = path.join(output, name); await download.saveAs(destination);
      return { path: destination, value: JSON.parse(fs.readFileSync(destination, 'utf8')) };
    };
    await page.locator('#surfaceAccount').click();
    if (!(await page.locator('#accountAdvanced').evaluate(el => el.open))) await page.locator('#accountAdvanced summary').click();
    const originalCopy = await downloadJson(() => page.locator('#v2SourceBackup').click(), 'source-fixture.json');
    assert.deepEqual(originalCopy.value, JSON.parse(sourceBaseline).app_state, 'Source backup remains the original despite subsequent v1 edits');
    await page.locator('#accountBackToField').click();
    await page.locator('#surfaceMenuButton').click();
    const exported = await downloadJson(() => page.locator('#btnExport').click(), 'v2-fixture.json');
    assert.equal(exported.value.dataset, 'sstm-v2'); assert.equal(exported.value.pinData.length, 3);
    assert.equal(exported.value.schemaVersion, 5); assert.equal(exported.value.stopwatchJournal.views.find(v => v.pin === 0 && v.cellId === 'cell03').format, 'clock');
    assert.equal(exported.value.dataVersion, 2); assert.equal(exported.value.moduleJournal.tracks[0].sessions.length, 1);
    assert.equal(exported.value.cycleJournal.moments.length, 4); assert.equal(exported.value.cycleJournal.stateOptions[0].label, 'Fixture flow');
    assert.equal(exported.value.cycleJournal.cycles[0].points.length, afterLostReply + 3);
    assert.equal(exported.value.cycleJournal.edits[0].before.at, repairedFirstTime + 60000, 'Export includes original observations');
    const restored = structuredClone(exported.value); restored.pinData[2].habitLabels.cell09 = 'Restored fixture';
    const importPath = path.join(output, 'restore-fixture.json'); fs.writeFileSync(importPath, JSON.stringify(restored));
    if (!await page.locator('#btnImport').isVisible()) await page.locator('#surfaceMenuButton').click();
    const choosing = page.waitForEvent('filechooser'); await page.locator('#btnImport').click();
    page.once('dialog', dialog => dialog.accept()); await (await choosing).setFiles(importPath);
    await page.waitForFunction(() => JSON.parse(TRCKNG_STORAGE.getItem('trckng_sstm_labels_pin2')).cell09 === 'Restored fixture');
    await page.locator('#surfaceAccount').click();
    const recoveryCopy = await downloadJson(() => page.getByRole('button', { name: 'СКАЧАТЬ КОПИЮ ДО ВОССТАНОВЛЕНИЯ', exact: true }).click(), 'recovery-fixture.json');
    assert.equal(recoveryCopy.value.pinData[2].habitLabels.cell09, 'New counter');
    assert.deepEqual(recoveryCopy.value.cycleJournal, exported.value.cycleJournal, 'Restore retains previous cycle records in recovery');
    await page.locator('#accountBackToField').click();
    await page.evaluate(() => TRCKNG_ACCOUNT.sync());
    const savedBeforeLogout = await page.evaluate(() => localStorage.getItem('trckng_sstm_data_pin0'));
    await page.goto(url.replace('?mode=account&lang=ru', '')); await page.locator('#surfaceMenuButton').waitFor(); await field(); await page.locator('#btn-cell01').waitFor();
    assert.equal(await page.locator('body').getAttribute('data-mode'), 'account', 'A returning signed-in visitor resumes their own account');
    await page.locator('#surfaceAccount').click(); await page.locator('#accountSignOut').click();
    await page.waitForURL('**mode=demo'); await page.locator('#btn-cell01').waitFor();
    assert.equal(await page.locator('#pin0').innerText(), 'EXAMPLES', 'A bare URL uses English by default');
    assert.equal(await page.evaluate(() => localStorage.getItem('trckng_sstm_data_pin0')), savedBeforeLogout, 'Logout/demo preserves private records');
    assert.deepEqual(errors, []);
    await context.close();
    const offline = await browser.newContext({ serviceWorkers: 'allow' });
    let networkOff = false;
    await offline.route('**/*', route => networkOff && new URL(route.request().url()).hostname !== '127.0.0.1' ? route.abort() : routeAccount(route));
    const local = await offline.newPage(); local.on('pageerror', e => errors.push(e.message));
    await local.goto(url); await local.locator('#accountModal.visible').waitFor();
    await local.waitForFunction(() => !document.querySelector('#accountSignIn').disabled);
    await local.locator('#accountEmail').fill(user.email); await local.locator('#accountPassword').fill('fixture-password'); await local.locator('#accountSignIn').click();
    await local.waitForFunction(() => document.querySelector('#pin0')?.textContent === 'FIELD A');
    if (await local.locator('#accountModal').isVisible()) await local.locator('#accountBackToField').click();
    await local.locator('#pin0').click();
    await local.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.includes('/v2/'), null, { timeout: 5000 }).catch(async error => {
      console.log(await local.evaluate(async () => ({ loadError: document.querySelector('#surfaceLoadError')?.textContent, workers: (await navigator.serviceWorker.getRegistrations()).map(r => ({ scope: r.scope, active: r.active?.state, installing: r.installing?.state })) })));
      throw error;
    });
    await local.locator('#btn-cell01').click();
    const before = await local.locator('#btn-cell01 .btn-value').innerText();
    networkOff = true; await offline.setOffline(true); await local.reload(); await local.locator('#btn-cell01 .btn-value').waitFor();
    assert.equal(await local.locator('#btn-cell01 .btn-value').innerText(), before);
    assert.equal(await local.locator(`#value-${extraId}`).innerText(), '4');
    assert.equal(await local.evaluate(id => cellLayout[id].col, extraId), 6);
    assert.equal(await local.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_modules')).tracks[0].sessions.length), 1, 'Module history survives offline reload');
    assert.equal(await local.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')).moments.length), 4, 'Words and states survive offline reload');
    assert.ok(await local.evaluate(() => { const c = JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')).cycles[0]; return c.deletedIntervals[c.points[0].id]; }), 'Trash survives offline reload');
    await local.locator('#pin2').click(); await local.locator(`#btn-${tagId}`).click(); await local.locator('#momentWords').fill('#offlineword'); await local.locator('#momentWords').press('Enter');
    await local.reload(); await local.locator('#cycleCapture').waitFor();
    assert.deepEqual(await local.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')).moments.at(-1).tags), ['offlineword']);
    await local.locator('#pin2').click(); await local.locator(`#btn-${tagId}`).click(); await local.locator('#momentWords').fill('offline draft');
    const wordDraftAt = await local.evaluate(id => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_tag_drafts'))[`2/${id}`].at, tagId);
    await local.reload(); await local.locator('#cycleCapture').waitFor(); await local.locator('#pin2').click(); await local.locator(`#btn-${tagId}`).click();
    assert.equal(await local.locator('#momentWords').inputValue(), 'offline draft', 'Account word draft survives offline reload');
    assert.equal(await local.evaluate(id => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_tag_drafts'))[`2/${id}`].at, tagId), wordDraftAt);
    await local.locator('#tagCancel').click();
    await local.locator('#pin0').click();
    await local.waitForFunction(() => /ОФЛАЙН|ИЗМЕНЕНИЯ ОЖИДАЮТ/.test(document.querySelector('#surfaceStatus')?.textContent), null, { timeout: 10000 });
    await local.locator('#cycleCapture').click();
    await local.locator('#cycleOpen').click();
    await local.locator('.cycle-gap button').click();
    await local.getByLabel('Изменить теги отрезка 1', { exact: true }).click();
    await local.getByLabel('Теги отрезка 1', { exact: true }).fill('offline example');
    await local.getByRole('button', { name: 'СОХРАНИТЬ', exact: true }).click();
    await local.locator('#cycleRepair > summary').click(); await local.locator('#cycleUndo').click();
    await local.getByLabel('Переименовать отрезок 1', { exact: true }).click();
    await local.getByLabel('Название отрезка 1', { exact: true }).fill('Offline draft');
    const journalBefore = await local.evaluate(() => TRCKNG_STORAGE.getItem('sstm_v2_cycles'));
    await local.reload(); await local.locator('#cycleCapture').waitFor();
    assert.equal(await local.evaluate(() => TRCKNG_STORAGE.getItem('sstm_v2_cycles')), journalBefore, 'Offline points survive reload');
    await local.locator('#cycleOpen').click(); await local.getByLabel('Переименовать отрезок 1', { exact: true }).click();
    assert.equal(await local.getByLabel('Название отрезка 1', { exact: true }).inputValue(), 'Offline draft', 'Quiet editor can recover an offline draft after reload');
    assert.deepEqual(await local.evaluate(() => { const c = JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')).cycles[0]; return c.tags[c.points[0].id]; }), ['offline', 'example']);
    await offline.close();
    assert.deepEqual(errors, []);
    console.log('PASS: checked v1 copy with immutable source; independent account store, 17 palette choices; work and timestamped words/states/custom menu across devices; journal sync/export/restore/offline; cycle points, tab lock, conflict/recovery, v1 independence, responsive field, logout isolation.');
    console.log(`Synthetic screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
