const CACHE = 'dayflow-cache-v3-2';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('dayflow-cache-') && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Always check the network first for HTML so new app fixes are not trapped
  // behind an old installed-PWA cache. Fall back to the cached copy offline.
  const isHtml = event.request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/');

  if (isHtml) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
