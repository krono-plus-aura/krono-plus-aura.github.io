const CACHE_NAME = "krono-2026-09-02-r7";
const OFFLINE_DOCUMENT = "/app.html";
const TARIFF_DOCUMENT = "/tarifs-base-2026-09-02-r7.json";
const STABLE_TARIFF_DOCUMENT = "/tarifs-base.json";
const NAVIGATION_FALLBACKS = [OFFLINE_DOCUMENT];
const REQUIRED_SHELL = [
  OFFLINE_DOCUMENT,
  TARIFF_DOCUMENT,
  STABLE_TARIFF_DOCUMENT,
  "/tarifs-secours.css",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/agc-aura-final.png",
  "/sncf-ter-aura.webp",
];
const OPTIONAL_SHELL = ["/", "/tarifs.html"];

async function fetchAndCache(cache, url) {
  const request = new Request(url, { cache: "reload", credentials: "same-origin" });
  const response = await fetch(request);
  if (!response.ok) throw new Error(`Préchargement impossible : ${url}`);
  await cache.put(url, response.clone());
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(REQUIRED_SHELL.map((url) => fetchAndCache(cache, url)));
    await Promise.allSettled(OPTIONAL_SHELL.map((url) => fetchAndCache(cache, url)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith("krono-") && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function cachedNavigation(request) {
  try {
    const response = await fetch(request);
    if (!response.ok) throw new Error(`Navigation indisponible : ${response.status}`);
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
    return response;
  } catch (_) {
    const exact = await caches.match(request, { ignoreSearch: true });
    if (exact) return exact;
    for (const fallback of NAVIGATION_FALLBACKS) {
      const cached = await caches.match(fallback, { ignoreSearch: true });
      if (cached) return cached;
    }
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

// Les tarifs sont recherchés sur le réseau à chaque ouverture. Le cache ne sert
// qu'en cas de panne ou d'absence de connexion. Cela évite qu'une application
// déjà installée conserve une ancienne Carte Militaire alors qu'Internet marche.
async function freshTariff(request) {
  try {
    const response = await fetch(request);
    if (!response.ok) throw new Error(`Tarifs indisponibles : ${response.status}`);
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
    return response;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match(TARIFF_DOCUMENT);
    return fallback || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const isTariff = url.pathname === STABLE_TARIFF_DOCUMENT
    || /^\/tarifs-base-[^/]+\.json$/.test(url.pathname);
  event.respondWith(event.request.mode === "navigate"
    ? cachedNavigation(event.request)
    : isTariff ? freshTariff(event.request) : cacheFirst(event.request));
});
