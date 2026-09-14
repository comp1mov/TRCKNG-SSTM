const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({channel:'msedge', headless:true});
 try {
  const context = await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  const page = await context.newPage(), errors=[]; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo&lang=ru');
  await page.waitForFunction(() => window.SstmRecordings);
  await page.evaluate(() => {
   let j = SstmData.emptyJournal(); const now=Date.now();
   j=SstmData.point(j,now-30*3600000); j=SstmData.point(j,now-24*3600000); j=SstmData.point(j,now-22*3600000,true);
   j=SstmData.point(j,now-2*3600000);
   TRCKNG_STORAGE.setItem('sstm_v2_cycles',JSON.stringify(j)); dispatchEvent(new Event('sstm-v2-loaded'));
  });
  const before=await page.evaluate(()=>TRCKNG_STORAGE.getItem('sstm_v2_cycles'));
  await page.locator('#surfaceMenuButton').click();
  await page.locator('#surfaceCalendar').click();
  await page.locator('#calendarHours').selectOption('72');
  assert.equal(await page.locator('.calendar-record-row').count(),2);
  assert.equal(await page.locator('.calendar-part').count(),3);
  assert.equal(await page.locator('#cycleCapture').isVisible(),true);
  await page.locator('#calendarHours').focus(); await page.waitForTimeout(1100);
  assert.equal(await page.locator('#calendarHours').evaluate(n=>n===document.activeElement),true);
  await page.locator('.calendar-part').first().click();
  assert.equal(await page.locator('#cycleModal').evaluate(n=>n.classList.contains('visible')),true);
  await page.locator('#cycleModal .surface-panel-head button').first().click();
  await page.getByRole('button',{name:'Предыдущее окно',exact:true}).click();
  assert.equal(await page.locator('.calendar-record-row').count(),0);
  await page.locator('.calendar-nav').getByRole('button',{name:'СЕЙЧАС',exact:true}).click();
  assert.equal(await page.locator('.calendar-record-row').count(),2);
  for(const width of [320,390,768,1280]) {
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  assert.equal(await page.evaluate(()=>TRCKNG_STORAGE.getItem('sstm_v2_cycles')),before);
  await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'sstm-calendar.png')});
  assert.deepEqual(errors,[]); console.log('PASS: calendar navigation, archive detail, focus, responsive layout, read-only journal');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
