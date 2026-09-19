// Service worker VTC PLUS — mise en cache légère de la coquille de l'app.
// Les appels en temps réel (Firestore, cartes, géocodage, itinéraires) ne sont
// JAMAIS mis en cache : ils doivent toujours passer par le réseau.
//
// Gère aussi la réception des notifications push (Firebase Cloud Messaging)
// côté client, pour prévenir quand une course est confirmée — y compris
// quand l'app est fermée ou le téléphone verrouillé.
importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyABNLn0CJcxH_skC9QqRsKLbY_tvP5hvV0",
  authDomain: "vtc-plus-a6242.firebaseapp.com",
  projectId: "vtc-plus-a6242",
  storageBucket: "vtc-plus-a6242.firebasestorage.app",
  messagingSenderId: "500809490080",
  appId: "1:500809490080:web:111996fe837bad8bcdb3c5"
});

var messaging = firebase.messaging();

// Notification reçue alors que le site n'est pas au premier plan.
messaging.onBackgroundMessage(function (payload) {
  var title = (payload.notification && payload.notification.title) || 'VTC PLUS';
  var options = {
    body: (payload.notification && payload.notification.body) || '',
    icon: 'favicon-512.png',
    badge: 'favicon-512.png',
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});

// Un tap sur la notification ramène (ou ouvre) le site. On utilise une URL
// absolue (basée sur la portée du service worker) plutôt qu'un simple
// "index.html" relatif : un chemin relatif peut échouer à s'ouvrir selon le
// contexte d'où part le clic, et amener sur un onglet vide.
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var targetUrl = new URL('index.html', self.registration.scope).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url.indexOf('index.html') !== -1 && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

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
