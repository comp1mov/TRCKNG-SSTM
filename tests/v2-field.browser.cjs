// Synthetic data only. Exercises the real shared engine and pointer interactions.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = path.join(require('node:os').tmpdir(), 'sstm-v2-field-check');
fs.mkdirSync(output, { recursive: true });
const url = 'http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo&lang=ru';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, serviceWorkers: 'block' });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url); await page.locator('#surfaceAddCell').waitFor({ state: 'attached' });
    assert.equal(await page.locator('#cycleClock').isVisible(), true);
    await page.locator('#cycleCalendar').click();
    assert.equal(await page.locator('#dayStrip').isVisible(), true);
    assert.equal(await page.locator('#weekStrip').isVisible(), true);
    assert.equal(await page.locator('#dayPercent').isVisible(), false);
    await page.locator('#btnViewLayout').click();
    const before = await page.evaluate(() => JSON.stringify([HABITS, cellLayout, habitLabels]));
    await page.locator('#surfaceAddCell').click();
    await page.locator('#cellEditInput').fill('Cancelled module');
    await page.locator('#cellEditModal .surface-panel-head button').last().click();
    assert.equal(await page.evaluate(() => JSON.stringify([HABITS, cellLayout, habitLabels])), before, 'Cancel does not create a module or persist a placeholder');
    // Creation remains a draft across minimization/PIN switches and autosnapshot.
    await page.locator('#surfaceAddCell').click();
    await page.locator('#cellEditInput').fill('Additional counter');
    await page.locator('#unitStep').fill('2');
    await page.locator('#cellEditModal .surface-panel-head button').first().click();
    assert.equal(await page.evaluate(() => Object.keys(buildCloudSnapshot().pinData[0].cellLayout).length), 9);
    await page.locator('#pin1').click(); await page.locator('#surfaceDock button').click();
    assert.equal(await page.locator('.pin.active').getAttribute('data-pin'), '0');
    await page.locator('#cellEditSave').click();
    await page.waitForFunction(() => HABITS.length === 10);
    const id = await page.evaluate(() => HABITS.find(id => id.startsWith('cell-')));
    assert.ok(id);
    await page.locator('#btnViewTrack').click(); await page.locator(`#btn-${id}`).click();
    assert.equal(await page.locator(`#value-${id}`).innerText(), '2');
    await page.locator('#btnViewHistory').click();
    assert.ok(await page.locator(`[data-matrix-habit="${id}"]`).count() > 0, 'New modules enter History Matrix');
    await page.locator('#btnViewLayout').click();

    // Drag on another equal-sized cell swaps exactly those two cells.
    const from = await page.locator('#layout-cell01 .field-grip').boundingBox();
    const to = await page.locator('#layout-cell02 .field-grip').boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 }); await page.mouse.up();
    assert.deepEqual(await page.evaluate(() => [cellLayout.cell01.col, cellLayout.cell02.col]), [2, 1]);
    // Grow past the original five module columns while holding at the edge.
    const grip = await page.locator(`#layout-${id} .field-grip`).boundingBox();
    const viewport = await page.locator('#layoutView').boundingBox();
    await page.mouse.move(grip.x + 10, grip.y + 10); await page.mouse.down();
    await page.mouse.move(viewport.x + viewport.width - 8, grip.y + 10, { steps: 10 });
    await page.waitForTimeout(450); await page.mouse.up();
    const moved = await page.evaluate(id => ({ ...cellLayout[id] }), id);
    assert.ok(moved.col > 5, 'Field supports modules beyond original bounds');
    assert.equal(await page.locator('#cellEditModal').isVisible(), false, 'Dragging never opens the editor');
    assert.ok(await page.locator('#layoutView').evaluate(el => el.scrollWidth > el.clientWidth));
    // Repeated Save preserves free positions, and a size collision changes nothing.
    await page.locator(`#layout-${id} .layout-action`).nth(1).click();
    await page.locator('#cellEditInput').fill('Moved counter'); await page.locator('#cellEditSave').click();
    assert.deepEqual(await page.evaluate(id => cellLayout[id], id), moved);
    await page.locator('#surfaceHome').click();
    await page.locator('#layout-cell01 .layout-action').nth(1).click();
    const beforeResize = await page.evaluate(() => JSON.stringify([cellLayout, habitLabels]));
    await page.locator('#cellEditModal [data-layout-size="2x2"]').click(); await page.locator('#cellEditSave').click();
    assert.equal(await page.locator('.cell-layout-error').isVisible(), true);
    assert.equal(await page.evaluate(() => JSON.stringify([cellLayout, habitLabels])), beforeResize);
    await page.locator('#cellEditCancel').click();
    // Keyboard movement and Escape are also non-destructive.
    await page.locator(`#layout-${id} .field-grip`).focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(id => cellLayout[id].row, id), moved.row + 1);
    const grip2 = await page.locator(`#layout-${id} .field-grip`).boundingBox();
    const beforeCancel = await page.evaluate(() => JSON.stringify(cellLayout));
    await page.mouse.move(grip2.x + 10, grip2.y + 10); await page.mouse.down();
    await page.mouse.move(grip2.x - 64, grip2.y + 10, { steps: 4 }); await page.keyboard.press('Escape'); await page.mouse.up();
    assert.equal(await page.evaluate(() => JSON.stringify(cellLayout)), beforeCancel);
    assert.equal(await page.locator('#cellEditModal').isVisible(), false);
    // Clicking open grid space anchors a new draft at that exact location.
    await page.locator('#surfaceHome').click();
    const unit = await page.evaluate(() => Number(document.body.dataset.cellSize));
    await page.locator('#layoutGrid').click({ position: { x: 3.5 * unit, y: 3.5 * unit } });
    assert.deepEqual(await page.evaluate(() => [pendingNewCell.layout.row, pendingNewCell.layout.col]), [4, 4]);
    await page.locator('#cellEditCancel').click();

    // Snapshot apply while another PIN is current must retain all IDs/positions.
    const snapshot = await page.evaluate(() => buildCloudSnapshot());
    await page.locator('#pin1').click();
    await page.evaluate(snapshot => applyCloudSnapshot(snapshot), snapshot);
    assert.equal(await page.evaluate(() => HABITS.length), 10);
    assert.equal(await page.evaluate(id => weekData[getWeekKey()][id], id), 2);
    assert.equal(await page.evaluate(id => cellLayout[id].col, id), moved.col);
    // Current-PIN export/import also carries the additional control and timer runtime.
    const exported = await page.evaluate(() => buildCurrentPinExportSnapshot());
    await page.evaluate(exported => applyCurrentPinSnapshot(exported), exported);
    assert.equal(await page.evaluate(() => getCellsSnapshot().length), 10);
    await page.locator('#surfaceHome').click();
    await page.screenshot({ path: path.join(output, 'desktop-arrange.png') });

    // V1 rejects a v2 backup. Extended v1-only snapshots still round-trip.
    const legacy = await context.newPage();
    await legacy.goto(new URL('../', url).href); await legacy.locator('#btn-cell01').waitFor();
    const beforeLegacy = await legacy.evaluate(() => localStorage.getItem('trckng_sstm_labels_pin0'));
    await assert.rejects(legacy.evaluate(snapshot => applyCloudSnapshot(snapshot), snapshot), /Open this backup in v2/);
    assert.equal(await legacy.evaluate(() => localStorage.getItem('trckng_sstm_labels_pin0')), beforeLegacy);
    const legacyFixture = structuredClone(snapshot); delete legacyFixture.dataset; delete legacyFixture.dataVersion; delete legacyFixture.cycleJournal; delete legacyFixture.migration;
    await legacy.evaluate(snapshot => applyCloudSnapshot(snapshot), legacyFixture);
    const roundtrip = await legacy.evaluate(() => buildCloudSnapshot());
    assert.equal(roundtrip.pinData[0].cellLayout[id].col, moved.col);
    assert.equal(roundtrip.pinData[0].habitLabels[id], 'Moved counter');
    assert.equal(roundtrip.pinData[1].habitLabels[id], undefined, 'Extra identity stays in its source PIN');
    await legacy.close();

    const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    await touch.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    const phone = await touch.newPage(); phone.on('pageerror', error => errors.push(error.message));
    await phone.goto(url); await phone.locator('#surfaceAddCell').waitFor({ state: 'attached' });
    await phone.locator('#surfaceMenuButton').tap(); await phone.locator('#btnViewLayout').tap();
    const a = await phone.locator('#layout-cell01 .field-grip').boundingBox(), b = await phone.locator('#layout-cell02 .field-grip').boundingBox();
    const cdp = await touch.newCDPSession(phone);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x + 10, y: a.y + 10 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.x + 10, y: b.y + 10 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.deepEqual(await phone.evaluate(() => [cellLayout.cell01.col, cellLayout.cell02.col]), [2, 1]);
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await phone.screenshot({ path: path.join(output, 'phone-arrange.png') });
    await touch.close();
    assert.deepEqual(errors, []);
    console.log('PASS: restored strips; create/cancel/draft with >9 modules; count/history; pointer swap and edge growth; collision rejection; stable edit positions; keyboard/Escape; multi-PIN snapshot and export roundtrips; v1 compatibility; real touch drag.');
    console.log(`Synthetic screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
