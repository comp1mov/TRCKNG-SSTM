'use strict';
const CACHE = 'trckng-sstm-v2-alpha-0.6.0';
const assets = ['./', './index.html', './surface.css', './surface.js', './field.js', './clocks.js', './data.js', './modules.js', './moments.js', './tag-input.js', './marks.js', './scenarios.js', './account.js', './cycles.js', './demo-data.js', './vendor/supabase-2.116.0.js',
  './translations.js', './i18n.js', './readability.js', './fonts/JetBrainsMono-Regular.woff2',
  './points-lab.html', './style.css', './model.js', './store.js', './app.js',
  '../index.html', '../style.css', '../app-config.js', '../app.js', '../history-matrix.js'];
const localAssets = new Set(assets.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(assets)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('trckng-sstm-v2-alpha-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SSTM_V2_CLAIM') event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin ||
      (!url.href.startsWith(self.registration.scope) && !localAssets.has(url.href))) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy))); }
    return response;
  }).catch(async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(event.request) || (event.request.mode === 'navigate' ? await cache.match('./index.html') : null) || Response.error();
  }));
});
