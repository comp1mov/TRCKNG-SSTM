const CACHE_NAME = 'trckng-sstm-v1.33.21';
const urlsToCache = [
  '/TRCKNG-SSTM/',
  '/TRCKNG-SSTM/index.html',
  '/TRCKNG-SSTM/style.css',
  '/TRCKNG-SSTM/app-config.js',
  '/TRCKNG-SSTM/app.js',
  '/TRCKNG-SSTM/manifest.json',
  '/TRCKNG-SSTM/icons/icon-192.png',
  '/TRCKNG-SSTM/icons/icon-512.png'
];

const networkFirstPaths = new Set([
  '/TRCKNG-SSTM/',
  '/TRCKNG-SSTM/index.html',
  '/TRCKNG-SSTM/style.css',
  '/TRCKNG-SSTM/app-config.js',
  '/TRCKNG-SSTM/app.js',
  '/TRCKNG-SSTM/manifest.json'
]);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(() => {
        return cache.addAll([
          '/TRCKNG-SSTM/',
          '/TRCKNG-SSTM/index.html'
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

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const shouldUseNetworkFirst =
    isSameOrigin &&
    (event.request.mode === 'navigate' || networkFirstPaths.has(requestUrl.pathname));

  if (shouldUseNetworkFirst) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        return caches.match(event.request).then(response => {
          return response || caches.match('/TRCKNG-SSTM/index.html') || caches.match('/TRCKNG-SSTM/');
        });
      })
    );
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
        return caches.match('/TRCKNG-SSTM/');
      });
    })
  );
});
