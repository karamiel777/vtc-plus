// Service worker VTC PLUS — notifications + ouverture directe de la course.

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


// ============================================================
// NOTIFICATIONS
// ============================================================

messaging.onBackgroundMessage(function (payload) {

  var title =
    (payload.data && payload.data.title) ||
    (payload.notification && payload.notification.title) ||
    'VTC PLUS';

  var options = {
    body:
      (payload.data && payload.data.body) ||
      (payload.notification && payload.notification.body) ||
      '',

    icon: 'favicon-512.png',
    badge: 'favicon-512.png',

    // Très important :
    // on garde les données de la notification,
    // notamment reservationId.
    data: payload.data || {}
  };

  if (payload.data && payload.data.tag) {
    options.tag = payload.data.tag;
  }

  self.registration.showNotification(title, options);
});


// ============================================================
// CLIC SUR LA NOTIFICATION
// ============================================================

self.addEventListener('notificationclick', function (event) {

  event.notification.close();

  var data = event.notification.data || {};

  // ID de la réservation envoyé par Firebase
  var reservationId = data.reservationId || '';

  // URL de la page client
  var targetUrl = new URL(
    'index.html',
    self.registration.scope
  );

  // On ajoute l'ID de la course dans l'URL
  //
  // Exemple :
  // index.html?ride=ABC123
  //
  if (reservationId) {
    targetUrl.searchParams.set(
      'ride',
      reservationId
    );
  }

  var targetHref = targetUrl.href;


  event.waitUntil(

    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })

    .then(function (clientList) {

      // ========================================================
      // UN ONGLET VTC PLUS EST DÉJÀ OUVERT
      // ========================================================

      for (var i = 0; i < clientList.length; i++) {

        var client = clientList[i];

        if (
          client.url.indexOf('index.html') !== -1
        ) {

          // Si on connaît la réservation,
          // on recharge l'onglet avec ?ride=ID
          if (
            reservationId &&
            'navigate' in client
          ) {

            return client
              .navigate(targetHref)
              .then(function (newClient) {

                var focusedClient =
                  newClient || client;

                if (
                  'focus' in focusedClient
                ) {
                  return focusedClient.focus();
                }

                return focusedClient;
              });
          }


          // Sinon on se contente de ramener
          // l'onglet au premier plan.
          if ('focus' in client) {

            return client.focus().then(function () {

              // On envoie également l'ID
              // directement à la page.
              if (
                reservationId &&
                'postMessage' in client
              ) {

                client.postMessage({
                  type: 'OPEN_RIDE',
                  reservationId: reservationId
                });

              }

            });

          }

        }

      }


      // ========================================================
      // AUCUN ONGLET OUVERT
      // ========================================================

      if (clients.openWindow) {

        return clients.openWindow(
          targetHref
        );

      }

    })

  );

});


// ============================================================
// CACHE
// ============================================================

var CACHE_NAME = 'vtcplus-v2';

var APP_SHELL = [
  './',
  './index.html',
  './logo.jpg',
  './favicon-512.png'
];


// ============================================================
// INSTALLATION
// ============================================================

self.addEventListener('install', function (event) {

  event.waitUntil(

    caches
      .open(CACHE_NAME)
      .then(function (cache) {

        return cache
          .addAll(APP_SHELL)
          .catch(function () {

            // Un fichier manquant ne doit pas
            // empêcher le service worker de s'installer.

          });

      })

  );

  self.skipWaiting();

});


// ============================================================
// ACTIVATION
// ============================================================

self.addEventListener('activate', function (event) {

  event.waitUntil(

    caches
      .keys()
      .then(function (keys) {

        return Promise.all(

          keys
            .filter(function (key) {

              return key !== CACHE_NAME;

            })

            .map(function (key) {

              return caches.delete(key);

            })

        );

      })

  );

  self.clients.claim();

});


// ============================================================
// REQUÊTES QUI NE DOIVENT JAMAIS ÊTRE MISES EN CACHE
// ============================================================

var BYPASS_PATTERNS = [

  'googleapis',
  'firestore',
  'firebasestorage',

  'nominatim.openstreetmap.org',

  'photon.komoot.io',

  'router.project-osrm.org',

  'tile.openstreetmap.org',

  'wa.me'

];


// ============================================================
// FETCH
// ============================================================

self.addEventListener('fetch', function (event) {

  var req = event.request;

  if (req.method !== 'GET') {
    return;
  }


  if (
    BYPASS_PATTERNS.some(function (pattern) {

      return req.url.indexOf(pattern) !== -1;

    })
  ) {

    return;

  }


  event.respondWith(

    caches
      .match(req)

      .then(function (cached) {

        var networkFetch = fetch(req)

          .then(function (response) {

            if (
              response &&
              response.ok
            ) {

              var responseClone =
                response.clone();

              caches
                .open(CACHE_NAME)
                .then(function (cache) {

                  cache.put(
                    req,
                    responseClone
                  );

                });

            }

            return response;

          })

          .catch(function () {

            return cached;

          });


        return cached || networkFetch;

      })

  );

});
