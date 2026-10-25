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

function offlineResponse() {
  return new Response('Offline', {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/plain' },
  });
}

/** Scoped to the current cache, so markup and its hashed assets always agree. */
function fromCache(key) {
  return caches.open(CACHE).then((cache) => cache.match(key, MATCH));
}

function store(request, response) {
  if (!response.ok) return;
  const copy = response.clone();
  void caches.open(CACHE).then((cache) => cache.put(request, copy));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  // Every path below resolves to a Response. Resolving respondWith with
  // undefined fails the request outright, which for a script tag means a blank
  // page and no error anywhere.

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          store('index.html', response);
          return response;
        })
        .catch(() =>
          fromCache('index.html')
            .then((hit) => hit || fromCache('.'))
            .then((hit) => hit || offlineResponse()),
        ),
    );
    return;
  }

  event.respondWith(
    fromCache(request).then((hit) => {
      if (hit) {
        // Refresh in the background; a failure here must not affect the page.
        void fetch(request)
          .then((response) => store(request, response))
          .catch(() => {});
        return hit;
      }
      return fetch(request)
        .then((response) => {
          store(request, response);
          return response;
        })
        .catch(() => offlineResponse());
    }),
  );
});
