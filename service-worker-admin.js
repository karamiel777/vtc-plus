// Service worker VTC PLUS — Admin. Portée volontairement limitée à admin.html
// (voir le "scope" passé lors de l'enregistrement) pour ne jamais interférer
// avec le service worker du site public (index.html).
// Comme pour le site public : aucune donnée en temps réel (Firestore, Storage)
// n'est mise en cache, uniquement la coquille de la page.
var CACHE_NAME = 'vtcplus-admin-v1';
var APP_SHELL = [
  './admin.html',
  './logo.jpg',
  './favicon-512-admin.png'
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
  'photon.komoot.io', 'router.project-osrm.org', 'tile.openstreetmap.org'
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
