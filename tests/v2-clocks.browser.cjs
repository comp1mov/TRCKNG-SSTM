// Synthetic wall time and local demo only. No real account or external request.
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const path = require('node:path'), fs = require('node:fs');
const output = path.join(require('node:os').tmpdir(), 'sstm-v2-clock-check'); fs.mkdirSync(output, { recursive: true });
(async () => {
 const browser = await chromium.launch({ headless: true, channel: 'msedge' });
 try {
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 }, timezoneId: 'UTC', serviceWorkers: 'block' });
  await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  await context.addInitScript(() => {
   const RealDate = Date; window.fixtureNow = RealDate.UTC(2026, 8, 11, 3, 15, 30);
   window.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [window.fixtureNow])); } static now() { return window.fixtureNow; } };
  });
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo&lang=ru'); await page.locator('.countdown-dial').waitFor();
  await page.evaluate(() => {
   habitTypes.cell09 = 'countdown'; habitLabels.cell09 = 'Позже'; timerSettings.cell09 = { targetDate: '2030-01-01', targetTime: '12:00', volume: 0 };
   saveTypes(); saveLabels(); saveTimerSettings(); renderHabits();
  });
  await page.waitForFunction(() => document.querySelectorAll('.countdown-dial').length === 2);
  const hands = () => page.locator('.clock-synced').evaluateAll(nodes => nodes.map(n => ['hour', 'minute', 'second'].map(k => parseFloat(n.style.getPropertyValue(`--clock-${k}`)))));
  const at = async time => { await page.evaluate(time => { fixtureNow = time; dispatchEvent(new Event('focus')); }, time); };
  assert.deepEqual(await hands(), [[97.75, 93, 180], [97.75, 93, 180]], 'Different deadlines share the same actual clock phase');
  await at(Date.UTC(2026, 8, 11, 3, 15, 30, 500));
  let values = await hands(); assert.equal(values[0][2], 183); assert.equal(values[0][1], 93.05);
  await at(Date.UTC(2026, 8, 11, 3, 16, 0)); assert.equal((await hands())[0][2], 0); assert.equal((await hands())[0][1], 96);
  const before = await page.evaluate(() => [durationSessions, counterChangeLog, timerSettings]);
  await page.locator('#pin1').click(); await at(Date.UTC(2026, 8, 11, 11, 48, 42)); await page.locator('#pin0').click();
  await page.waitForFunction(() => document.querySelector('.clock-synced')?.style.getPropertyValue('--clock-second') === '252deg');
  assert.deepEqual(await page.evaluate(() => [durationSessions, counterChangeLog, timerSettings]), before, 'Animation creates no tracking records');
  await page.locator('#btn-cell07').screenshot({ path: path.join(output, 'countdown-button.png') });
  await page.screenshot({ path: path.join(output, 'desktop.png') });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await at(Date.UTC(2026, 8, 11, 11, 48, 42, 750));
  assert.equal((await hands())[0][2], 252, 'Reduced motion uses whole-second updates');
  await page.setViewportSize({ width: 390, height: 844 }); await page.locator('#btn-cell07').scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: path.join(output, 'phone.png') });
  assert.equal(await page.locator('#btn-cell07').evaluate(n => getComputedStyle(n, '::after').display), 'none', 'No conflicting pseudo-element remains');
  // Expiry acknowledgment is still handled by the original timer engine.
  await page.evaluate(() => { timerSettings.cell07.targetDate = '2000-01-01'; timerStates.cell07 = {}; window.fixtureNotices = 0; sendCountdownNotification = () => fixtureNotices++; updateLiveDisplays(); });
  await page.locator('#btn-cell07').click(); await page.evaluate(() => updateLiveDisplays());
  assert.equal(await page.evaluate(() => fixtureNotices), 1);
  assert.equal(await page.locator('#btn-cell07').evaluate(n => n.classList.contains('pulsing')), false);
  assert.deepEqual(errors, []); console.log(`PASS: synchronized second/minute/hour hands, fractional sweep, minute rollover, PIN return without drift, no data writes, reduced motion, responsive face and expiry acknowledgment. Screenshots: ${output}`);
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
