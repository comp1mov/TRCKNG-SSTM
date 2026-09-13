// Exercise the deployed v1 worker upgrade in an isolated profile with invented data.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const v2Cache = fs.readFileSync(path.join(root, 'v2/service-worker.js'), 'utf8').match(/const CACHE = '([^']+)'/)[1];
const oldRef = '2622fa391a0e3b528025026d5f74181943a733dd';
const oldFiles = new Map();
let published = false;
async function until(check) {
  const deadline = Date.now() + 30000;
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error('Release worker did not finish updating');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/TRCKNG-SSTM\//, '');
  if (name.endsWith('/') || !name) name += 'index.html';
  if (name === '__upgrade-test.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>Isolated release check</title>'); return; }
  const file = path.resolve(root, name);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  try {
    let data;
    if (published) data = fs.readFileSync(file);
    else {
      if (!oldFiles.has(name)) oldFiles.set(name, execFileSync('git', ['show', `${oldRef}:${name}`], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 8e6 }));
      data = oldFiles.get(name);
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(name)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
  } catch (_) { if (published) console.error('Release asset missing:', name); res.writeHead(404); res.end('Not found'); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/TRCKNG-SSTM/`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    const external = [], errors = [];
    await context.route('**/*', route => {
      if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
      external.push(route.request().url()); return route.abort();
    });
    const old = await context.newPage();
    await old.goto(base + '__upgrade-test.html');
    await old.evaluate(async () => {
      localStorage.setItem('trckng_sstm_data_pin0', '{"fixture":"release-sentinel"}');
      await navigator.serviceWorker.register('./service-worker.js');
      await navigator.serviceWorker.ready;
    });
    await old.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await until(() => old.evaluate(async () => (await navigator.serviceWorker.getRegistration('./'))?.active?.state === 'activated'));
    assert.ok((await old.evaluate(() => caches.keys())).includes('trckng-sstm-v1.33.23'));
    published = true;
    // Open v2 while the old root worker is still controlling the origin.
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + 'v2/?mode=demo&lang=ru'); await page.locator('#btn-cell01').waitFor();
    await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.includes('/v2/'));
    await page.locator('#cycleCapture').click();
    assert.equal(await page.locator('#cycleCapture').innerText(), '+ ТОЧКА');
    const oldKeys = await page.evaluate(() => caches.keys());
    assert.ok(oldKeys.includes(v2Cache));
    await old.evaluate(async () => (await navigator.serviceWorker.getRegistration('./')).update());
    await until(() => old.evaluate(async () => (await caches.keys()).includes('trckng-sstm-v1.34.9') && !(await caches.keys()).includes('trckng-sstm-v1.33.23')));
    assert.ok((await page.evaluate(() => caches.keys())).includes(v2Cache), 'Root update preserves v2 cache');
    await old.evaluate(async () => {
      const cache = await caches.open('trckng-sstm-v1.34.9');
      for (const asset of ['app.js', 'style.css', 'history-matrix.js', 'icons/icon-192.png', 'icons/icon-512.png']) {
        if (!(await cache.match('/TRCKNG-SSTM/' + asset))) throw new Error('Missing precached asset: ' + asset + '; cached: ' + (await cache.keys()).map(r => r.url).join(', '));
      }
    });
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('#btn-cell01').waitFor();
    assert.equal(await page.locator('body').getAttribute('data-mode'), 'demo');
    assert.equal(await page.evaluate(() => localStorage.getItem('trckng_sstm_data_pin0')), '{"fixture":"release-sentinel"}');
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    await context.close();
    console.log('PASS: deployed v1 worker → v2 → root upgrade; separate caches, complete precache, offline demo and untouched v1 sentinel.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
