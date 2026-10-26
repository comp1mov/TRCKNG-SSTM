// Invented data in a fresh browser profile. No real account is opened.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const base = process.env.SSTM_TEST_URL || 'http://127.0.0.1:5173/TRCKNG-SSTM/v2/';
const output = path.join(os.tmpdir(), 'sstm-v2-navigation'); fs.mkdirSync(output, { recursive:true });
(async () => {
  const browser = await chromium.launch({ channel:'msedge', headless:true });
  try {
    const context = await browser.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true, serviceWorkers:'block' });
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(base+'?mode=demo&lang=ru'); await page.waitForFunction(() => window.SstmReadability);
    await page.evaluate(() => {
      let j = SstmData.emptyJournal(), now = Date.now();
      j = SstmData.point(j, now - 30*3600000); j = SstmData.point(j, now - 24*3600000); j = SstmData.point(j, now - 22*3600000, true);
      j = SstmData.point(j, now - 2*3600000); j = SstmData.checkpoint(j, now - 3600000);
      TRCKNG_STORAGE.setItem('sstm_v2_cycles', JSON.stringify(j)); dispatchEvent(new Event('sstm-v2-loaded'));
    });
    assert.equal(await page.locator('#quickLog').isVisible(),true);
    const value = () => page.evaluate(() => weekData[currentWeekKey].cell01);
    const before = await value();
    await page.locator('#btn-cell01').tap();
    await page.waitForFunction(() => !document.querySelector('#quickUndo').disabled);
    assert.equal(await value(), before+1);
    assert.ok((await page.locator('#quickUndoContext').innerText()).includes('→'));
    await page.screenshot({path:path.join(output,'phone-undo.png')});
    await page.locator('#quickUndo').tap(); assert.equal(await value(),before);
    await page.locator('#btn-cell01').tap();
    assert.equal(await page.evaluate(() => {
      const expected = getUndoCounterChange(); switchPin(1);
      const before = JSON.stringify(weekData); const result = undoLastCounterChange(expected);
      switchPin(0); return result === false && before === JSON.stringify(JSON.parse(TRCKNG_STORAGE.getItem('trckng_sstm_data_pin1')));
    }),true,'A stale action cannot undo a different PIN');
    await page.locator('#quickUndo').tap(); assert.equal(await value(),before);
    await page.locator('#btn-cell01').tap();
    assert.equal(await page.evaluate(() => {
      const expected = getUndoCounterChange(), saved = weekData[currentWeekKey].cell01;
      try {
        weekData[currentWeekKey].cell01 = saved + 100;
        return getUndoCounterChange() === null && undoLastCounterChange(expected) === false && weekData[currentWeekKey].cell01 === saved + 100;
      } finally { weekData[currentWeekKey].cell01 = saved; }
    }),true,'A replaced total invalidates the visible undo without changing the replacement');
    await page.locator('#quickUndo').tap(); assert.equal(await value(),before);
    // Two rapid changes are undone individually, without losing the first one.
    await page.locator('#btn-cell01').tap(); await page.locator('#btn-cell01').tap();
    await page.locator('#quickUndo').tap(); assert.equal(await value(),before+1);
    await page.locator('#quickUndo').tap(); assert.equal(await value(),before);
    const journalBefore = await page.evaluate(() => JSON.stringify(buildCloudSnapshot().cycleJournal));
    await page.locator('#quickLog').tap();
    assert.equal(await page.locator('#surfaceMenu').isVisible(),false);
    assert.equal(await page.locator('#eventLog').isVisible(),true);
    assert.ok((await page.locator('#logRows').innerText()).includes('Отмена'));
    await page.screenshot({path:path.join(output,'phone-log.png')});
    const logPosition = await page.locator('#historyView').evaluate(node => { node.scrollTop = 240; return node.scrollTop; });
    await page.locator('#logTimelineTab').tap();
    await page.locator('#logTab').tap();
    assert.ok(Math.abs(await page.locator('#historyView').evaluate(node=>node.scrollTop)-logPosition)<2,'Tab changes retain the log reading position');
    await page.locator('#quickField').tap(); await page.locator('#quickLog').tap();
    assert.ok(Math.abs(await page.locator('#historyView').evaluate(node=>node.scrollTop)-logPosition)<2,'Returning from the field retains the log reading position');
    await page.locator('#logTimelineTab').tap();
    await page.locator('#calendarHours').selectOption('72');
    assert.equal(await page.locator('.calendar-record-row').count(),2);
    assert.equal(await page.locator('.calendar-part').count(),3);
    await page.getByRole('button',{name:'Предыдущее окно',exact:true}).tap();
    assert.equal(await page.locator('.calendar-record-row').count(),0);
    await page.locator('.calendar-nav').getByRole('button',{name:'СЕЙЧАС',exact:true}).tap();
    assert.equal(await page.locator('.calendar-record-row').count(),2);
    assert.equal(await page.evaluate(() => {
      const original = Date.now, range = document.querySelector('.calendar-nav strong').textContent;
      try {
        Date.now = () => original()+2*86400000; dispatchEvent(new Event('sstm-calendar-view'));
        return document.querySelector('.calendar-nav strong').textContent !== range && !document.querySelector('#calendarNowMarker').hidden;
      } finally { Date.now = original; dispatchEvent(new Event('sstm-calendar-view')); }
    }),true,'Now follows the new date after a suspended page resumes');
    await page.getByRole('button',{name:'Предыдущее окно',exact:true}).tap();
    assert.equal(await page.evaluate(() => {
      const original = Date.now, range = document.querySelector('.calendar-nav strong').textContent;
      try { Date.now = () => original()+2*86400000; dispatchEvent(new Event('sstm-calendar-view')); return document.querySelector('.calendar-nav strong').textContent === range; }
      finally { Date.now = original; dispatchEvent(new Event('sstm-calendar-view')); }
    }),true,'An intentionally selected historical window does not jump');
    await page.locator('.calendar-nav').getByRole('button',{name:'СЕЙЧАС',exact:true}).tap();
    await page.screenshot({path:path.join(output,'phone-timeline.png')});
    await page.locator('.calendar-part').first().tap();
    assert.equal(await page.locator('#cycleModal').isVisible(),true);
    await page.locator('#cycleModal .surface-panel-head button').last().tap();
    await page.locator('#logStatsTab').tap();
    assert.equal(await page.locator('#simpleStats').isVisible(),true);
    assert.equal(await page.locator('#historyMatrix').isVisible(),false,'Advanced matrix is collapsed');
    assert.equal(await page.locator('.history-display-controls').isVisible(),false);
    const expectedTotal = await page.evaluate(() => formatMatrixValue(buildHistoryProjection().rows.find(row=>row.id==='cell01'), weekData[historyTimelineWeekKey].cell01,true));
    await page.locator('#simpleStatsButton').selectOption('cell01');
    assert.equal(await page.locator('.simple-stat-row').count(),1);
    assert.equal(await page.locator('.simple-stat-row strong').innerText(),expectedTotal);
    await page.locator('#simpleStatsButton').selectOption('');
    await page.screenshot({path:path.join(output,'phone-stats.png')});
    await page.locator('#logAdvancedStats>summary').tap(); assert.equal(await page.locator('#historyMatrix').isVisible(),true);
    await page.locator('#logAdvancedStats>summary').tap();
    assert.equal(await page.evaluate(() => JSON.stringify(buildCloudSnapshot().cycleJournal)),journalBefore,'Browsing leaves original timestamps intact');
    const moduleWeek = await page.evaluate(() => {
      const monday = getWeekBoundsMs(currentWeekKey).startMs;
      const settings = {pin:0,cellId:'cell09',name:'Fixture work',rate:{amount:120,intervalMs:3600000,currency:'X'},display:{primary:'money',decimals:2,wholeHours:true}};
      let journal = SstmModules.configure(SstmModules.empty(),settings);
      journal = SstmModules.configure(journal,{...settings,cellId:'cell03',trackId:journal.tracks[0].id});
      journal = SstmModules.toggle(journal,0,'cell09',monday-3600000);
      journal = SstmModules.toggle(journal,0,'cell09',monday+3600000);
      habitTypes.cell09 = habitTypes.cell03 = 'modular';
      TRCKNG_STORAGE.setItem('sstm_v2_modules',JSON.stringify(journal));
      SstmSimpleStats.refresh(); return getWeekKey(new Date(monday-3600000));
    });
    await page.locator('#simpleStatsWeek').selectOption(moduleWeek);
    const moduleRow = page.locator('.simple-stat-row').filter({hasText:'Fixture work'});
    assert.equal(await moduleRow.count(),1,'Shared module bindings do not duplicate totals');
    assert.equal(await moduleRow.locator('strong').innerText(),'01:00:00','Time is clipped at the selected week boundary');
    await page.locator('#simpleStatsWeek').selectOption(await page.evaluate(()=>currentWeekKey));
    assert.equal(await moduleRow.locator('strong').innerText(),'01:00:00');
    for (const width of [320,390,768,1280]) {
      await page.setViewportSize({width,height:844});
      for (const tab of ['logTab','logTimelineTab','logStatsTab']) {
        await page.locator('#'+tab).click();
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        for(const id of ['quickField','quickLog','quickUndo',tab]) {
          const box=await page.locator('#'+id).boundingBox(); assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=844, id+' stays reachable');
        }
      }
    }
    await page.evaluate(()=>SstmI18n.setLanguage('en'));
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#logTimelineTab').innerText(),'TIMELINE');
    assert.equal(await page.locator('#quickUndo').innerText(),'↶ UNDO');
    assert.deepEqual(errors,[]);
    console.log('PASS: visible number undo, repeated undo, PIN guard, log/timeline navigation, simple statistics, read-only timestamps, 320/390/768/1280 layout, bilingual controls. '+output);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
