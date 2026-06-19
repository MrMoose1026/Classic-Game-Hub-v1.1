const CACHE_NAME = "cgh-v1-1";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./state.js",
  "./ui.js",
  "./games.js",
  "./script.js",
  "./manifest.json",

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
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});