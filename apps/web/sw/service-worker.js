// Template for the build-generated /sw.js. The Vite plugin replaces the
// version and precache list; no runtime caching of any other URL occurs.
const VERSION = '__VERSION__';
const PRECACHE = ['__PRECACHE__'];
const PREFIX = 'honeymelon-web-';
const CACHE = PREFIX + VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// A waiting version activates only when the user chooses to reload, so a
// running conversion never loses the worker chunk it was started with.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    // Network first keeps online visits current; the shell serves offline.
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .open(CACHE)
          .then((cache) => cache.match('/', { ignoreVary: true })),
      ),
    );

    return;
  }

  // Only the precached app shell is served from Cache Storage. Selected media
  // is never fetched, so it can never be written here.
  if (!PRECACHE.includes(url.pathname)) {
    return;
  }

  // Hosts may send Vary: Origin; CORS-mode module and font requests carry
  // Origin while precache requests do not. Same-origin shell bytes never vary.
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) =>
        cache
          .match(request, { ignoreVary: true })
          .then((hit) => hit ?? fetch(request)),
      ),
  );
});
