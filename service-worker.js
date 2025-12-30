const CACHE_NAME = 'trckng-sstm-v0.02';
const urlsToCache = [
  '/tracking-system/',
  '/tracking-system/index.html',
  '/tracking-system/manifest.json',
  '/tracking-system/icons/icon-192.png',
  '/tracking-system/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(() => {
        // Если не все файлы закешировались, продолжаем
        return cache.addAll([
          '/tracking-system/',
          '/tracking-system/index.html'
        ]);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }

      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Если нет сети и нет кеша, возвращаем главную страницу
        return caches.match('/tracking-system/');
      });
    })
  );
});
