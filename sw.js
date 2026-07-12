// sw.js — offline support for the deployed planner (v2.15.0+).
//
// Registered only from the built copy (build.mjs injects the registration into dist and
// substitutes the version below). The cache name is tied to APP_VERSION, so each release
// installs a fresh cache and the activate step deletes the old ones — no eternal staleness.
//
// Strategy:
//   - App pages (navigations): network-first, cache fallback. Online always gets the latest
//     HTML, so a redeploy is picked up on the next online load; offline serves the last copy.
//   - React CDN scripts and Google Fonts: cache-first (immutable / rarely changing). Font
//     woff2 files are cached on first fetch — their URLs are user-agent specific, so they
//     cannot be precached by URL.
//   - Everything else (e.g. the GitHub API used by sync) goes to the network untouched.
const VERSION = '__APP_VERSION__';
const CACHE = 'planner-' + VERSION;

const PRECACHE = [
  'index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap',
];

const CACHE_FIRST_HOSTS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // add each entry individually so one network miss cannot abort the whole install
      .then(c => Promise.all(PRECACHE.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App pages: network-first, then cached page, then the precached app shell.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })
        .catch(() => caches.match(req).then(hit => hit || caches.match('index.html')))
    );
    return;
  }

  // Immutable CDN scripts and Google Fonts: cache-first, filled on first fetch.
  if (CACHE_FIRST_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r;
      }))
    );
    return;
  }
  // Anything else (e.g. api.github.com sync): straight to the network, uncached.
});
