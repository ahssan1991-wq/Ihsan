/**
 * EMIS Service Worker - Safe Bypass & Cache Purge Worker
 * Ensures all Vite dynamic modules and React chunks bypass SW caching.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      return self.registration.unregister();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch live from network to prevent caching out-of-sync React scripts
  event.respondWith(fetch(event.request));
});
