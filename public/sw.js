
// Basic service worker
const CACHE_NAME = 'stockflow-cache-v1';
const urlsToCache = [
  '/',
  // Add other important assets you want to cache, e.g.,
  // '/manifest.json',
  // '/favicon.ico', // if you have one
  // '/_next/static/...', // Be careful with Next.js specific build assets if not using next-pwa
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Add core assets for basic offline functionality
        // For a real PWA, `next-pwa` handles this much better by knowing build outputs
        return cache.addAll(urlsToCache.filter(url => !url.startsWith('/_next/static')));
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Basic cache-first strategy for GET requests
  // For more complex caching (network-first, stale-while-revalidate), consider `next-pwa`
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response; // Serve from cache
          }
          // Not in cache, fetch from network
          return fetch(event.request).then((networkResponse) => {
            // Optionally, cache the new response if it's valid and not a third-party resource
            if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          });
        }).catch(() => {
          // Fallback for offline - you might want a specific offline page
          // For now, just let the browser handle the error if network fails and not in cache
        })
    );
  }
});
