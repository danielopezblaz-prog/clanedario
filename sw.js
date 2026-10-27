/* Clanedario: service worker. Guarda la app para que abra sin conexión y muestra los avisos en el móvil. */
const CACHE = 'clanedario-v9';
const FILES = ['./', './index.html', './app.css', './app.js', './icon.svg', './icon.png', './icon-192.png', './icon-512.png', './manifest.webmanifest'];

/* Se guarda lo que haya: en proyecton.es no existe index.html (es index.php) y no debe fallar por eso. */
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* Red primero (para tener siempre la última versión); si no hay conexión, la copia guardada. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin) || e.request.url.indexOf('api.php') !== -1) return;
  e.respondWith(caches.open(CACHE).then(c => fetch(e.request).then(res => { if (res && res.ok && !res.redirected) c.put(e.request, res.clone()); return res; })
    .catch(() => c.match(e.request, { ignoreSearch: true }).then(hit => hit || Response.error()))));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs[0];
    if (c) { c.focus(); c.postMessage({ type: 'open', id: d.id, date: d.date }); }
    else self.clients.openWindow('./');
  }));
});
