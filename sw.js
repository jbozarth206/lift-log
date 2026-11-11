const CACHE = 'liftlog-v3';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './styles.css?v=3', './app.js?v=3', './manifest.webmanifest',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network-first for same-origin so updates land when online; cache fallback offline.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // tidy any caches an older worker re-created after we activated
  if (req.mode === 'navigate') caches.keys().then(keys => keys.filter(k => k !== CACHE).forEach(k => caches.delete(k)));
  e.respondWith(
    fetch(req, {cache: 'no-cache'}).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match('./index.html')))
  );
});
