const CACHE_NAME = "cgh-v1.2.1";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./state.js",
  "./ui.js",
  "./chess.js",
  "./checkers.js",
  "./connectfour.js",
  "./tictactoe.js",
  "./script.js",
  "./manifest.json",
  "./img/Gwenchana.ttf",

  "./img/icons/icon-192.png",
  "./img/icons/icon-512.png",

  "./img/chess/white-pawn.png",
  "./img/chess/white-rook.png",
  "./img/chess/white-knight.png",
  "./img/chess/white-bishop.png",
  "./img/chess/white-queen.png",
  "./img/chess/white-king.png",

  "./img/chess/black-pawn.png",
  "./img/chess/black-rook.png",
  "./img/chess/black-knight.png",
  "./img/chess/black-bishop.png",
  "./img/chess/black-queen.png",
  "./img/chess/black-king.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {

  // Do NOT intercept Web Worker scripts.
  if (event.request.destination === "worker") {
    return;
  }

  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {

        if (response.ok) {
          const responseClone = response.clone();

          event.waitUntil(
            caches.open(CACHE_NAME)
              .then(cache => {
                return cache.put(
                  event.request,
                  responseClone
                );
              })
          );
        }

        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});