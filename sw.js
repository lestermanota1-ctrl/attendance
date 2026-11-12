/* Talaan service worker: keeps the app working offline.
   Bump VERSION whenever you replace index.html so phones pick up the new files. */
const VERSION = 'talaan-v7';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  // add files one by one so a single missing icon does not stop the whole install
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.allSettled(SHELL.map((url) => c.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function save(req, res) {
  if (res && (res.ok || res.type === 'opaque')) {
    const copy = res.clone();
    caches.open(VERSION).then((c) => c.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Own files: network first so updates show up, saved copy when offline.
    e.respondWith(
      fetch(req)
        .then((res) => save(req, res))
        .catch(() =>
          caches.match(req).then((m) => m || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
        )
    );
  } else {
    // Fonts and the QR library: saved on first load, then served from the saved copy.
    e.respondWith(caches.match(req).then((m) => m || fetch(req).then((res) => save(req, res))));
  }
});
