// Template for dist/sw.js. The placeholders below are filled in at build time
// from the real bundle — see the serviceWorker plugin in vite.config.ts.
const CACHE = 'mattolisto-__VERSION__';
const SHELL = __PRECACHE__;

// Match on the URL alone: a host that sends Vary (preview sends `Vary: Origin`)
// would otherwise turn every precached asset into a cache miss.
const MATCH = { ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  // Navigations: network first so a new build lands, cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put('index.html', copy));
          return response;
        })
        .catch(() =>
          caches
            .match('index.html', MATCH)
            .then((hit) => hit || caches.match('.', MATCH)),
        ),
    );
    return;
  }

  // Everything else: cache first, refreshed in the background.
  event.respondWith(
    caches.match(request, MATCH).then((hit) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => hit);
      return hit || network;
    }),
  );
});
