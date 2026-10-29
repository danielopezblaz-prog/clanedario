/* Clanedario: service worker. Guarda la app para que abra sin conexión y recibe los avisos «push»
   del servidor: los enseña aunque la app esté cerrada y la pantalla bloqueada, con el sonido del sistema. */
const CACHE = 'clanedario-v14';
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

/* Aviso que manda el servidor (avisos.php / api.php): se enseña siempre, esté la app abierta o cerrada. */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'Clanedario', body: e.data ? e.data.text() : '' }; }
  const titulo = d.title || 'Clanedario';
  const opciones = {
    body: d.body || '', tag: d.tag || 'clanedario', renotify: true, requireInteraction: true,
    icon: 'icon-192.png', badge: 'badge.png', vibrate: [250, 120, 250, 120, 400], timestamp: Date.now(),
    data: { id: d.id || '', date: d.date || '' }
  };
  const tareas = [self.registration.showNotification(titulo, opciones)];
  if (typeof d.badge === 'number' && self.navigator && self.navigator.setAppBadge) tareas.push((d.badge ? self.navigator.setAppBadge(d.badge) : self.navigator.clearAppBadge()).catch(() => null));
  e.waitUntil(Promise.all(tareas));
});

/* Al tocar el aviso: si la app está abierta se abre la tarea; si no, se abre la app directamente en ella. */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
  const url = d.id ? './?abrir=' + encodeURIComponent(d.id) + '&dia=' + encodeURIComponent(d.date || '') : './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url && x.url.indexOf(self.registration.scope) === 0) || cs[0];
    if (c) { return c.focus().then(() => { if (d.id) c.postMessage({ type: 'open', id: d.id, date: d.date }); }); }
    return self.clients.openWindow(url);
  }));
});
