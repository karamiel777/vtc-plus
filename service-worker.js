// Service worker VTC PLUS — mise en cache légère de la coquille de l'app.
// Les appels en temps réel (Firestore, cartes, géocodage, itinéraires) ne sont
// JAMAIS mis en cache : ils doivent toujours passer par le réseau.
var CACHE_NAME = 'vtcplus-v1';
var APP_SHELL = [
  './',
  './index.html',
  './logo.jpg',
  './favicon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL).catch(function () { /* un fichier manquant ne doit pas bloquer l'install */ });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

var BYPASS_PATTERNS = [
  'googleapis', 'firestore', 'firebasestorage', 'nominatim.openstreetmap.org',
  'photon.komoot.io', 'router.project-osrm.org', 'tile.openstreetmap.org', 'wa.me'
];

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  if (BYPASS_PATTERNS.some(function (p) { return req.url.indexOf(p) !== -1; })) return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      var networkFetch = fetch(req).then(function (res) {
        if (res && res.ok) {
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || networkFetch;
    })
  );
});
