const CACHE = "vibetube-mobile-shell-v1";
const ASSETS = /* PRECACHE */ [];
const BASE = "/VibeTube-Mobile/";
self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))),
);
self.addEventListener("message", (e) => {
  if (e.data === "ACTIVATE") self.skipWaiting();
});
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) => k.startsWith("vibetube-mobile-shell-") && k !== CACHE,
            )
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (
    e.request.method !== "GET" ||
    u.origin !== self.location.origin ||
    !u.pathname.startsWith(BASE)
  )
    return;
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(BASE + "index.html")),
    );
    return;
  }
  if (ASSETS.includes(u.pathname))
    e.respondWith(
      caches
        .match(e.request, { ignoreVary: true })
        .then((r) => r || fetch(e.request)),
    );
});
