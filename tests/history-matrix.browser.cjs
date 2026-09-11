// Run against dev-server.mjs. Requires Playwright; uses a fresh, isolated browser profile.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const output = process.env.TRCKNG_TEST_OUTPUT || path.join(require('node:os').tmpdir(), 'trckng-matrix-check');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.TRCKNG_BROWSER_CHANNEL || 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, serviceWorkers: 'block', timezoneId: 'Asia/Jerusalem' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // No account/cloud or third-party requests in this synthetic-data check.
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await page.goto(process.env.TRCKNG_TEST_URL || 'http://127.0.0.1:5173/TRCKNG-SSTM/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#habitsGrid .btn-habit');
    assert.ok((await page.locator('body').innerText()).includes('TRACK'));
    assert.deepEqual(errors, []);
    console.log('Dev server verified: app loads and tracking controls render.');
    const fixture = await page.evaluate(() => {
      const current = getWeekKey();
      const week = getPreviousWeekKey(current);
      const older = getPreviousWeekKey(week);
      const start = getWeekBoundsMs(week).startMs;
      const at = (days, hours) => { const date = new Date(start); date.setDate(date.getDate() + days); date.setHours(hours); return +date; };
      const labels = Object.fromEntries(HABITS.map(h => [h, '']));
      Object.assign(labels, { cell01: 'Count A', cell02: 'Time A', cell03: 'Value A' });
      const fields = {
        data: { [current]: {}, [week]: { cell01: 1, cell02: 720, cell03: 12 }, [older]: { cell01: 42, cell02: 500 } },
        labels, types: { cell01: 'unit', cell02: 'duration_min', cell03: 'value' },
        duration: { cell02: { accumulated: 0, isRunning: false } },
        duration_sessions: [{ id: 'session-a', habit: 'cell02', label: 'Earlier name', startTime: at(0, 23), endTime: at(1, 1), week, source: 'duration_min' }],
        counter_change_log: [
          { id: 'c1', habit: 'cell01', label: 'Count A', at: at(0, 10), week, previousValue: 0, nextValue: 2 },
          { id: 'c2', habit: 'cell01', label: 'Count A', at: at(1, 10), week, previousValue: 2, nextValue: 1 },
          { id: 'v1', habit: 'cell03', label: 'Value A', at: at(1, 12), week, previousValue: 10, nextValue: 12 }
        ]
      };
      Object.entries(fields).forEach(([key, value]) => localStorage.setItem(`trckng_sstm_${key}_pin0`, JSON.stringify(value)));
      return { week, older, correctedEnd: toDateTimeLocalValue(at(1, 2)) };
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.view-tab[data-view="history"]').click();
    await page.locator('#btnHistoryPrevWeek').click();
    assert.ok((await page.locator('#historyMeta').innerText()).includes(fixture.week));
    const cell = (habit, day) => page.locator(`[data-matrix-habit="${habit}"][data-matrix-day="${day}"]`);
    assert.equal(await cell('cell01', 0).innerText(), '2');
    assert.equal(await cell('cell01', 1).innerText(), '-1');
    assert.equal(await cell('cell02', 0).innerText(), '1:00:00');
    assert.equal(await cell('cell02', 1).innerText(), '1:00:00');
    await cell('cell02', 1).click();
    assert.ok((await page.locator('#historyMatrixDetail').innerText()).includes('Earlier name'));
    assert.ok((await page.locator('#historyDayMeta').innerText()).startsWith('TUE'));
    assert.equal(await page.locator('#historyDayDurationLayer .timeline-duration-segment').count(), 1);
    assert.equal(await page.locator('#historyDayCountLayer .timeline-count-marker').count(), 0);
    await page.locator('#historyWeekDurationLayer .timeline-duration-segment').click();
    assert.ok((await page.locator('#historyDayMeta').innerText()).startsWith('TUE'), 'Timeline selection retains the clipped day');
    await page.locator('#matrixCorrect').click();
    assert.equal(await page.locator('#correctionSessionList .correction-session').count(), 1);
    await page.locator('[data-correction-field="end"]').fill(fixture.correctedEnd);
    await page.locator('[data-correction-action="save"]').click();
    await page.locator('#correctionClose').click();
    assert.equal(await cell('cell02', 1).innerText(), '2:00:00');
    assert.equal(await cell('cell02', 'total').innerText(), '13:00:00');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('trckng_sstm_data_pin0')));
    assert.equal(saved[fixture.week].cell02, 780, 'Correction preserves 600 minutes outside the retained session');
    await page.locator('[data-history-filter="counts"]').click();
    assert.equal(await cell('cell02', 1).count(), 0);
    assert.equal(await cell('cell03', 1).innerText(), '2');
    await page.locator('[data-history-filter="all"]').click();
    await page.locator('#btnHistoryPrevWeek').click();
    assert.equal(await cell('cell01', 0).innerText(), '—');
    assert.equal(await cell('cell01', 'total').innerText(), '42');
    await page.locator('[data-history-display="table"]').click();
    await page.locator(`tr[data-history-week="${fixture.week}"] td:first-child`).click();
    assert.ok((await page.locator('#historyMeta').innerText()).includes(fixture.week));
    await page.locator('[data-history-display="matrix"]').click();
    await page.screenshot({ path: path.join(output, 'matrix-desktop.png'), fullPage: true });
    for (const viewport of [{ width: 360, height: 800 }, { width: 320, height: 740 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await cell('cell02', 1).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No page-wide horizontal overflow');
      assert.ok(await page.locator('#historyMatrix').isVisible());
      const scroll = page.locator('.history-matrix-scroll');
      assert.ok(await scroll.evaluate(el => el.scrollWidth > el.clientWidth));
      await scroll.evaluate(el => { el.scrollLeft = 400; });
      const sticky = await page.locator('.history-matrix-table tbody th').first().boundingBox();
      const frame = await scroll.boundingBox();
      assert.ok(Math.abs(sticky.x - frame.x) < 2, 'Row labels stay visible when scrolling');
      await page.locator('#matrixCorrect').click();
      await page.locator('#correctionClose').click();
      await page.screenshot({ path: path.join(output, `matrix-${viewport.width}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.locator('#pin1').click();
    assert.equal(await page.locator('#matrixCorrect').count(), 0, 'PIN switch clears old record focus');
    assert.deepEqual(errors, []);
    await context.close();

    // The new projection script must also be available after an offline PWA reload.
    const offlineContext = await browser.newContext({ serviceWorkers: 'allow' });
    const offlinePage = await offlineContext.newPage();
    await offlinePage.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await offlinePage.goto(process.env.TRCKNG_TEST_URL || 'http://127.0.0.1:5173/TRCKNG-SSTM/', { waitUntil: 'domcontentloaded' });
    await offlinePage.evaluate(async () => { await navigator.serviceWorker.ready; });
    await offlinePage.waitForFunction(() => navigator.serviceWorker.controller);
    await offlinePage.waitForFunction(async () => Boolean(await caches.match('/TRCKNG-SSTM/history-matrix.js')));
    await offlineContext.setOffline(true);
    await offlinePage.reload({ waitUntil: 'domcontentloaded' });
    await offlinePage.locator('.view-tab[data-view="history"]').click();
    assert.ok(await offlinePage.locator('.history-matrix-table').isVisible());
    await offlineContext.close();
    console.log('PASS: daily buckets, weekly fallback, shared focus, correction persistence, filters, table, PIN isolation, desktop/phone/landscape.');
    console.log('PASS: service worker caches the projection script and History Matrix works after an offline reload.');
    console.log(`Screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
