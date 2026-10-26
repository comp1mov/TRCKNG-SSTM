// Synthetic accounts only. Exercises the deployed RPC contract, never real user data.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = path.join(require('node:os').tmpdir(), 'sstm-v2-account-log');
fs.mkdirSync(output, { recursive: true });
const base = process.env.SSTM_TEST_URL || 'http://127.0.0.1:5173/TRCKNG-SSTM/v2/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [], writes = [];
  const user = { id: '00000000-0000-4000-8000-000000000021', email: 'fixture@example.invalid', aud: 'authenticated', role: 'authenticated' };
  const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600, role: 'authenticated' })).toString('base64url'), 'fixture'].join('.');
  let cloud = null, dropReply = false, race = false;
  const routeAccount = async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === new URL(base).origin) return route.continue();
    const json = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
    if (url.pathname === '/auth/v1/token') return json({ access_token: token, refresh_token: 'fixture', expires_in: 3600, token_type: 'bearer', user });
    if (url.pathname === '/auth/v1/user') return json(user);
    if (url.pathname === '/auth/v1/logout') return json({});
    assert.ok(!url.pathname.includes('daily_backups') && !url.pathname.endsWith('/trckng_snapshots'), 'No legacy or daily-backup requests');
    if (url.pathname === '/rest/v1/trckng_v2_snapshots') {
      assert.ok(!url.searchParams.get('select').includes('device_name'), 'Works without unpublished database columns');
      return json(req.headers().accept?.includes('vnd.pgrst.object') ? cloud : cloud ? [cloud] : []);
    }
    if (url.pathname === '/rest/v1/rpc/commit_trckng_v2') {
      const payload = req.postDataJSON();
      assert.deepEqual(Object.keys(payload).sort(), ['device', 'expected_revision', 'mutation_id', 'state']);
      if (cloud?.write_id === payload.mutation_id) return json([cloud]);
      if (race) { race = false; cloud.revision++; }
      if ((cloud?.revision || 0) !== payload.expected_revision) return route.fulfill({ status:409, contentType:'application/json', body:'{"code":"40001","message":"Conflict"}' });
      cloud = { revision:(cloud?.revision||0)+1, app_state:payload.state, device_id:payload.device, updated_at:new Date().toISOString(), write_id:payload.mutation_id };
      writes.push(structuredClone(cloud));
      if (dropReply) { dropReply = false; return route.abort(); }
      return json([cloud]);
    }
    return route.abort();
  };
  try {
    const demoContext = await browser.newContext({ serviceWorkers:'block' }); await demoContext.route('**/*', routeAccount);
    const demo = await demoContext.newPage(); await demo.goto(base+'?mode=demo&lang=ru'); await demo.waitForFunction(() => window.SstmReadability);
    const snapshot = await demo.evaluate(() => buildCloudSnapshot());
    cloud = { revision:1, app_state:snapshot, device_id:'other-fixture-device', updated_at:new Date().toISOString(), write_id:'seed' };
    await demoContext.close();
    async function device(width) {
      const context = await browser.newContext({ viewport:{width,height:844}, isMobile:width<600, hasTouch:width<600, serviceWorkers:'block' });
      await context.route('**/*', routeAccount);
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      await page.goto(base+'?mode=account&lang=ru'); await page.waitForFunction(() => window.SstmReadability);
      await page.locator('#surfaceAccount').click(); await page.locator('#accountEmail').fill(user.email); await page.locator('#accountPassword').fill('fixture-password'); await page.locator('#accountSignIn').click();
      await page.waitForFunction(() => window.TRCKNG_ACCOUNT?.ready && window.SstmReadability);
      await page.waitForFunction(() => !document.querySelector('#accountLoad').disabled);
      if (await page.locator('#accountModal').isVisible()) await page.locator('#accountBackToField').click();
      return { context, page };
    }
    const laptop = await device(1280), phone = await device(390), p = phone.page;
    p.on('dialog', dialog => dialog.accept());
    await p.evaluate(() => { localStorage.setItem('sstm_v2_prompt_names','false'); document.querySelector('#surfacePromptNames').checked=false; document.querySelector('#surfacePromptNames').dispatchEvent(new Event('change')); });
    await phone.context.setOffline(true);
    await p.locator('#cycleCapture').click(); await p.waitForTimeout(20); await p.locator('#cycleCapture').click();
    const localBefore = await p.evaluate(() => buildCloudSnapshot());
    assert.ok(localBefore.cycleJournal.cycles.some(c=>c.checkpoints?.length), 'A point is saved inside the cycle');
    await laptop.page.evaluate(() => { markCloudDirty('fixture-other-device'); return TRCKNG_ACCOUNT.sync(); });
    await phone.context.setOffline(false); await p.evaluate(() => TRCKNG_ACCOUNT.sync());
    await p.waitForFunction(() => document.querySelector('#v2CopyChoice')?.classList.contains('has-conflict'));
    for (const id of ['accountUpload','accountLoad','v2Export','v2Import']) {
      assert.equal(await p.locator('#'+id).isVisible(), true);
      const box = await p.locator('#'+id).boundingBox(); assert.ok(box.y>=0 && box.y+box.height<844, id+' fits on the phone');
    }
    assert.equal(await p.locator('#migrationAdvanced').count(),0);
    assert.equal(await p.locator('#v2DailyBackupSelect').count(),0);
    assert.ok(await p.locator('.header').evaluate(e=>e.getBoundingClientRect().height)<65, 'Account hides the large header');
    await p.screenshot({path:path.join(output,'phone-conflict.png')});
    const downloadPromise = p.waitForEvent('download'); await p.locator('#v2Export').click(); const download = await downloadPromise;
    const exportFile = path.join(output,'fixture-v2.json'); await download.saveAs(exportFile);
    const exported = JSON.parse(fs.readFileSync(exportFile)); assert.deepEqual(exported.cycleJournal, localBefore.cycleJournal);
    race = true; await p.locator('#accountUpload').click(); await p.waitForFunction(()=>!document.querySelector('#accountUpload').disabled);
    assert.equal(await p.locator('#v2CopyChoice').evaluate(e=>e.classList.contains('has-conflict')),true,'Concurrent cloud change remains a conflict');
    await p.locator('#accountUpload').click(); await p.waitForFunction(()=>!document.querySelector('#v2CopyChoice').classList.contains('has-conflict'));
    assert.deepEqual(cloud.app_state.cycleJournal, localBefore.cycleJournal);
    await laptop.page.evaluate(()=>TRCKNG_ACCOUNT.sync());
    assert.deepEqual(await laptop.page.evaluate(()=>buildCloudSnapshot().cycleJournal),localBefore.cycleJournal,'Checkpoints reach another device');
    await p.locator('#accountBackToField').click();
    await p.locator('#surfaceMenuButton').click(); await p.screenshot({path:path.join(output,'phone-menu.png')});
    await p.locator('#btnViewHistory').click(); await p.locator('#eventLog').waitFor();
    assert.ok(await p.locator('.log-row').count()>3);
    assert.ok(await p.locator('.log-row button').count()===0);
    assert.equal(await p.locator('#logStatistics').isVisible(),false);
    assert.ok(await p.locator('.log-elapsed').allTextContents().then(v=>v.some(x=>x!=='—')));
    await p.screenshot({path:path.join(output,'phone-log.png')});
    await p.locator('#logStatsTab').click(); assert.equal(await p.locator('#simpleStats').isVisible(),true);
    assert.equal(await p.locator('#historyMatrix').isVisible(),false);
    await p.locator('#logAdvancedStats>summary').click(); assert.equal(await p.locator('#historyMatrix').isVisible(),true); await p.locator('#logTab').click();
    const journalBefore = await p.evaluate(()=>JSON.stringify(buildCloudSnapshot().cycleJournal));
    await p.locator('#logSearch').fill('never-matches'); assert.equal(await p.locator('.log-row').count(),0); await p.locator('#logSearch').fill('');
    assert.equal(await p.evaluate(()=>JSON.stringify(buildCloudSnapshot().cycleJournal)),journalBefore,'Reading and filtering never mutate records');
    for (const width of [320,390,768]) {
      await p.setViewportSize({width,height:844}); assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await p.locator('#surfaceAccount').click();
      for (const id of ['accountUpload','accountLoad']) { const box=await p.locator('#'+id).boundingBox(); assert.ok(box.x>=0&&box.x+box.width<=width&&box.y+box.height<844); }
      await p.locator('#accountBackToField').click();
    }
    await p.setViewportSize({width:390,height:844}); await p.locator('#surfaceAccount').click();
    const fixture = structuredClone(exported); fixture.pinNames[0]='Imported fixture';
    const chooser=p.waitForEvent('filechooser'); await p.locator('#v2Import').click(); await (await chooser).setFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
    await p.waitForFunction(()=>document.querySelector('#pin0').textContent==='Imported fixture');
    assert.notEqual(cloud.app_state.pinNames[0],'Imported fixture','Import does not overwrite cloud');
    await p.reload(); await p.waitForFunction(()=>window.SstmReadability&&window.TRCKNG_ACCOUNT?.ready);
    assert.equal(await p.locator('#pin0').textContent(),'Imported fixture','Imported copy survives reload without cloud adoption');
    if (!await p.locator('#accountModal').isVisible()) await p.locator('#surfaceAccount').click();
    await p.locator('#accountLoad').click(); await p.waitForFunction(()=>!document.querySelector('#v2CopyChoice').classList.contains('has-conflict'));
    assert.notEqual(await p.locator('#pin0').textContent(),'Imported fixture');
    assert.equal(await p.evaluate(()=>JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_recovery')).pinNames[0]),'Imported fixture');
    dropReply=true; const beforeWrites=writes.length;
    await p.evaluate(()=>{markCloudDirty('retry-fixture');return TRCKNG_ACCOUNT.sync();});
    await p.evaluate(()=>TRCKNG_ACCOUNT.sync());
    assert.equal(writes.length,beforeWrites+1,'Retry commits a mutation only once');
    assert.equal(await p.evaluate(()=>managedAccountDirty()),false);
    assert.deepEqual(errors,[]);
    console.log('PASS: mobile conflict choices, checked overwrite, second device, export/import/reload, idempotent retry, log/statistics, 320/390/768 geometry. '+output);
    await laptop.context.close(); await phone.context.close();
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
