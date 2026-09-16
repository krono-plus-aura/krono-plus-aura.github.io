const TARIFF_VERSION = "2026-09-02-r7";
const APP_SHELL_VERSION = "app-7d4630b1db2d";
const CACHE_NAME = `krono-${TARIFF_VERSION}-${APP_SHELL_VERSION}`;
const NETWORK_TIMEOUT_MS = 3000;
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

async function fetchWithTimeout(request, timeout = NETWORK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(REQUIRED_SHELL.map((url) => fetchAndCache(cache, url)));
    await Promise.allSettled(OPTIONAL_SHELL.map((url) => fetchAndCache(cache, url)));
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

async function updateNavigation(cache, request) {
  const response = await fetchWithTimeout(request);
  if (!response.ok) throw new Error(`Navigation indisponible : ${response.status}`);
  await cache.put(request, response.clone());
  return response;
}

function navigationStrategy(request) {
  const state = (async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    return { cache, cached };
  })();
  const response = state.then(async ({ cache, cached }) => {
    if (cached) return cached;
    try {
      return await updateNavigation(cache, request);
    } catch (_) {
      for (const fallback of NAVIGATION_FALLBACKS) {
        const fallbackResponse = await cache.match(fallback, { ignoreSearch: true });
        if (fallbackResponse) return fallbackResponse;
      }
      return Response.error();
    }
  });
  // La vérification réseau est déclarée pendant l'événement fetch, avant tout
  // await : Safari peut sinon refuser un waitUntil appelé trop tard.
  const refresh = state.then(({ cache, cached }) => cached
    ? updateNavigation(cache, request).catch(() => undefined)
    : undefined);
  return { response, refresh };
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

// L'adresse stable reste vérifiée sur le réseau pour les anciens clients. La
// page principale utilise, elle, un fichier versionné immuable servi cache-first.
async function freshTariff(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetchWithTimeout(request);
    if (!response.ok) throw new Error(`Tarifs indisponibles : ${response.status}`);
    await cache.put(request, response.clone());
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const fallback = await cache.match(TARIFF_DOCUMENT);
    return fallback || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    const navigation = navigationStrategy(event.request);
    event.respondWith(navigation.response);
    event.waitUntil(navigation.refresh);
    return;
  }
  const isStableTariff = url.pathname === STABLE_TARIFF_DOCUMENT;
  event.respondWith(isStableTariff ? freshTariff(event.request) : cacheFirst(event.request));
});
