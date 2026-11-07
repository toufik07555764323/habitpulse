// Bump CACHE_NAME whenever the app shell changes so installed apps pick up the update.
const CACHE_NAME = 'habitpulse-pro-v2';
const APP_SHELL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

function putInCache(request, response) {
  if (response && response.ok && new URL(request.url).origin === self.location.origin) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
  }
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Pages: network first, so a new version shows up as soon as you are online; cache when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => putInCache(request, response))
        .catch(() => caches.match(request, { ignoreSearch: true }).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Everything else: cache first, refreshed in the background.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => putInCache(request, response)).catch(() => cached);
      return cached || network;
    })
  );
});

// Tapping a reminder or timer notification opens (or focuses) the app.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow('./');
    })
  );
});
