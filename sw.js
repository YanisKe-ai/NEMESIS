/* ==========================================================================
   NEMESIS — Service Worker
   Cache-First-Strategie für den App-Shell. Alle Daten (Matches, Rivalen,
   Profil) leben in localStorage im Browser, nicht im Cache — dieser Worker
   kümmert sich ausschliesslich darum, dass die App-Dateien selbst auch
   ohne Netz laden (z.B. direkt am Court ohne Empfang).

   WICHTIG BEIM DEPLOY: Bei jedem inhaltlichen Update von index.html die
   CACHE_VERSION erhöhen (z.B. "nemesis-v2"), sonst liefern Rückkehrer-Nutzer
   dank Cache-First weiterhin die alte Version aus.
   ========================================================================== */

const CACHE_VERSION = "nemesis-v17";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./datenschutz.html",
  "./impressum.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Cache-First mit Netzwerk-Fallback; erfolgreiche GET-Antworten werden
// nachträglich in den Cache geschrieben, damit die App mit der Zeit auch
// neu hinzukommende, gleich-origin Assets offline verfügbar hat.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200){
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") return caches.match("./index.html");
        });
    })
  );
});
