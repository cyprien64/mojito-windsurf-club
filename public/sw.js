// Service worker du Mojito Windsurf Club.
// - Pages / scripts : réseau d'abord, cache en secours (fonctionne hors ligne).
// - Données météo (Open-Meteo) : réseau d'abord, dernière réponse en secours.
// - Webcams : jamais mises en cache (pour ne pas afficher une vieille image).
const VERSION = 'mwc-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './brand/emblem.jpg', './icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isWeather = url.hostname.endsWith('open-meteo.com');
  const isFont = url.hostname.includes('fonts.g');
  if (!sameOrigin && !isWeather && !isFont) return; // webcams & autres : pas de cache

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => (list[0] ? list[0].focus() : self.clients.openWindow('./'))));
});
