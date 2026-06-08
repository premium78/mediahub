const CACHE_NAME = 'mediahub-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/downloader.html',
  '/css/style.css',
  '/css/themes.css',
  '/css/home.css',
  '/css/settings.css',
  '/js/app.js',
  '/js/utils.js',
  '/js/settings.js',
  '/js/history.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).catch(() => {
        if (e.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
