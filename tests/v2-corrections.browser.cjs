// Only fabricated demo data; external requests blocked, no personal browser profile.
const pw = require('playwright'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const engine = process.env.SSTM_BROWSER || 'chromium';
const output = path.join(require('node:os').tmpdir(), 'sstm-v2-corrections', engine); fs.mkdirSync(output, { recursive: true });
(async () => {
 const browser = await pw[engine].launch({ headless: true, ...(engine === 'chromium' ? { channel: 'msedge' } : {}) });
 try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: true, serviceWorkers: 'block' }), errors = [], external = [];
  await context.route('**/*', r => { if (new URL(r.request().url()).hostname === '127.0.0.1') return r.continue(); external.push(r.request().url()); return r.abort(); });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo&lang=en'); await page.locator('#surfaceMoments').waitFor({ state: 'attached' });
  const journal = () => page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')));
  const close = id => page.locator(`#${id} .surface-panel-head button`).last().click();
  const show = async () => { await page.locator('#surfaceMenuButton').click(); await page.locator('#surfaceMoments').click(); assert.equal(await page.locator('#surfaceMenu').isVisible(), false); };
  const drag = async selector => {
   await page.locator('#stateWheel').scrollIntoViewIfNeeded(); const a = await page.locator('#stateOrigin').boundingBox(), b = await page.locator(selector).boundingBox();
   await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 }); await page.mouse.up();
  };
  await show(); await page.locator('#momentAddState').click(); const initial = (await journal()).moments.length;
  await page.locator('#stateBrowse').click(); await drag('[data-group=energy]'); assert.equal((await journal()).moments.length, initial, 'Choosing a group does not record');
  await page.locator('#momentTags').fill('#example #studio'); await drag('[data-state="sstm:state:inspired"]');
  let j = await journal(); assert.equal(j.version, 3); assert.equal(j.moments.length, initial + 2); assert.equal(j.moments.at(-2).state.id, 'sstm:state:inspired'); assert.deepEqual(j.moments.at(-1).tags, ['example', 'studio']); assert.equal(j.moments.at(-2).at, j.moments.at(-1).at);
  await page.locator('#momentUndo').click(); j = await journal(); assert.ok(j.moments.at(-1).deletedAt && j.moments.at(-2).deletedAt, 'Undo removes the whole state + tags capture');
  await show(); await page.locator('#momentAddState').click(); await page.locator('#stateSearch').fill('overw'); assert.equal(await page.locator('#stateSearchResults button').innerText(), 'Overwhelmed');
  await page.locator('#stateSearchResults button').click(); assert.equal((await journal()).moments.at(-1).state.id, 'sstm:state:overwhelmed');
  await show(); await page.locator('#momentHistorySearch').fill('overw'); assert.equal(await page.locator('.moment-row').count(), 1);
  await page.locator('.moment-row-action').click(); assert.equal(await page.locator('.moment-row').count(), 0);
  await page.locator('#momentTrashToggle').click(); assert.equal(await page.locator('.moment-row').count(), 1); await page.locator('.moment-row-action').click(); assert.equal(await page.locator('.moment-row').count(), 0);
  await page.locator('#momentTrashToggle').click(); assert.equal(await page.locator('.moment-row').count(), 1);
  await page.locator('#momentHistorySearch').fill(''); await page.locator('#momentAddTag').click(); assert.equal(await page.locator('#momentStateForm').isVisible(), false);
  await page.locator('#momentTags').fill('#notebook'); const draftAt = await page.evaluate(() => JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_capture_drafts'))['0/moment-tag'].at);
  await close('momentModal'); await show(); await page.locator('#momentAddTag').click(); assert.equal(await page.locator('#momentTags').inputValue(), '#notebook', 'A closed panel preserves its typed draft');
  await page.locator('#momentTagsSave').click(); assert.deepEqual((await journal()).moments.at(-1).tags, ['notebook']); assert.equal((await journal()).moments.at(-1).at, draftAt);
  await show(); await page.screenshot({ path: path.join(output, 'notebook-desktop.png') }); await close('momentHistoryModal');
  // Presets, translated search, custom words and two-stage drag fit phone/tablet orientations.
  for (const [width, height] of [[1280, 900], [768, 1024], [390, 844], [844, 390], [320, 700]]) {
   await page.setViewportSize({ width, height }); await show(); await page.locator('#momentAddState').click(); await page.locator('#stateBrowse').click();
   await page.locator('[data-group=tension]').click(); await page.locator('#stateWheel').scrollIntoViewIfNeeded();
   const bounds = await page.locator('.state-option').evaluateAll(ns => ns.map(n => { const b = n.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, height: b.height }; }));
   const head = await page.locator('#momentModal .surface-panel-head').boundingBox(), panel = await page.locator('#momentModal').boundingBox();
   for (const b of bounds) assert.ok(b.y >= head.y + head.height - 1 && b.bottom <= panel.y + panel.height + 1, `Wheel unobscured by header/footer ${width}x${height}: ${JSON.stringify({ b, head, panel })}`);
   for (const b of bounds) assert.ok(b.x >= 0 && b.right <= width + 1 && b.height >= 44, `Target fits ${width}`);
   for (let i = 0; i < bounds.length; i++) for (let k = i + 1; k < bounds.length; k++) { const a = bounds[i], b = bounds[k]; assert.ok(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y, `No overlap ${width}`); }
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
   await page.screenshot({ path: path.join(output, `states-${width}x${height}.png`) });
   await page.locator('[data-state="sstm:state:angry"]').tap(); assert.equal((await journal()).moments.at(-1).state.id, 'sstm:state:angry');
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  const seeded = await page.evaluate(() => {
   const start = Date.now() - 3600000; let j = SstmData.emptyJournal(); for (const offset of [0, 600000, 1200000, 1800000]) j = SstmData.point(j, start + offset, offset === 1800000);
   const c = j.cycles[0]; j = SstmData.annotate(j, c.id, c.points[1].id, 'interval', 'Fixture middle'); j = SstmData.tagInterval(j, c.id, c.points[1].id, 'middle');
   j = SstmMoments.record(j, { kind: 'tag', text: 'keep', at: start + 900000, source: { pin: 0, cellId: 'example', label: 'Example' } });
   TRCKNG_STORAGE.setItem('sstm_v2_cycles', JSON.stringify(j)); dispatchEvent(new Event('sstm-v2-loaded')); return j;
  });
  await page.locator('#cycleOpen').click(); await page.getByLabel('Delete interval 2', { exact: true }).click();
  assert.match(await page.locator('#cycleDeleteReview').innerText(), /gap will remain/);
  await page.locator('#cycleDeleteReview button').last().click(); assert.equal((await journal()).version, 2, 'Cancel is read-only');
  await page.getByLabel('Delete interval 2', { exact: true }).click(); await page.locator('#cycleDeleteReview button').first().click(); j = await journal();
  assert.deepEqual(j.cycles[0].points, seeded.cycles[0].points); assert.equal(await page.locator('.cycle-gap').count(), 1); assert.equal(await page.locator('#cycleStrip .cycle-segment').count(), 2); assert.equal(j.moments[0].deletedAt, undefined);
  await page.locator('#cycleDeleteRecord').click(); await page.evaluate(() => { const j = JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')); j.cycles[0].points[0].name = 'Changed elsewhere'; TRCKNG_STORAGE.setItem('sstm_v2_cycles', JSON.stringify(j)); });
  await page.locator('#cycleDeleteReview button').first().click(); assert.match(await page.locator('#cycleDeleteReview [role=alert]').innerText(), /changed|изменилась/); assert.equal((await journal()).cycles[0].deletedAt, undefined);
  await page.locator('#cycleDeleteReview button').last().click(); await close('cycleModal'); await page.locator('#cycleOpen').click();
  await page.locator('#cycleDeleteRecord').click(); await page.locator('#cycleDeleteReview button').first().click(); assert.ok((await journal()).cycles[0].deletedAt); assert.equal(await page.locator('#cycleElapsed').innerText(), '00:00:00');
  await page.locator('#cycleTrash summary').click(); await page.locator('#cycleTrashRows button').click(); j = await journal(); assert.equal(j.cycles[0].deletedAt, undefined); assert.ok(j.cycles[0].deletedIntervals[seeded.cycles[0].points[1].id]);
  await page.locator('.cycle-gap button').click(); assert.equal(await page.locator('.cycle-gap').count(), 0);
  await close('cycleModal'); await page.locator('#cycleCapture').click(); await page.locator('#cycleOpen').click();
  await page.getByLabel('Delete interval 1', { exact: true }).click(); assert.match(await page.locator('#cycleDeleteReview').innerText(), /STOP AND DELETE/);
  await page.locator('#cycleDeleteReview button').first().click(); j = await journal(); assert.equal(j.active, null); assert.ok(j.cycles[1].endedAt);
  await page.locator('.cycle-gap button').click(); assert.equal((await journal()).active, null, 'Restore does not run the clock');
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: path.join(output, 'recording-phone.png') });
  const snap = await page.evaluate(() => buildCloudSnapshot()); assert.equal(snap.cycleJournal.version, 3); assert.equal(snap.dataVersion, 2);
  await page.evaluate(s => { SstmData.validate(s); applyCloudSnapshot(s); }, snap); assert.deepEqual(await journal(), snap.cycleJournal);
  assert.deepEqual(errors, []); assert.deepEqual(external, []); console.log(`PASS ${engine}: group gesture/search, combined marks/undo, notebook/trash, 5 viewports, gap deletion/whole recording/live stop/restore/stale rejection, v3 snapshot roundtrip. ${output}`);
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
