import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [app, fallback, manifestText, serviceWorker, baseText, workflow, home, tariffTable] = await Promise.all([
  read("public/app.html"),
  read("public/tarifs-secours.css"),
  read("public/manifest.webmanifest"),
  read("public/sw.js"),
  read("public/tarifs-base.json"),
  read(".github/workflows/publication.yml"),
  read("public/index.html"),
  read("public/tarifs.html"),
]);
const manifest = JSON.parse(manifestText);
const data = JSON.parse(baseText);

test("la base tarifaire reste la source unique", () => {
  assert.match(app, /fetch\("\/tarifs-base\.json"/);
  assert.match(app, /href="\/tarifs-secours\.css"/);
  assert.doesNotMatch(app, /const DATA=\{/);
  assert.match(fallback, /FICHIER GÉNÉRÉ — source unique : \/tarifs-base\.json/);
  assert.equal(data.profiles.length, 19);
  assert.equal(Object.keys(data.pairs).length, 36);
});

test("les profils adulte et enfant n’exposent que leurs cartes applicables", () => {
  const adults = data.profiles.filter((profile) => profile.travelerType === "adult");
  const children = data.profiles.filter((profile) => profile.travelerType === "child");
  assert.equal(adults.length, 12);
  assert.equal(children.length, 7);
  assert.ok(adults.some((profile) => profile.id === "adult-military"));
  assert.ok(adults.some((profile) => profile.id === "adult-family-military"));
  assert.ok(adults.some((profile) => profile.id === "adult-illico-liberte-weekend-companion"));
  assert.ok(children.some((profile) => profile.id === "child-illico-liberte-weekend-companion"));
  assert.ok(!children.some((profile) => profile.id === "child-illico-jeunes"));
  assert.ok(children.some((profile) => profile.id === "child-family-military"));
  assert.ok(!children.some((profile) => profile.id === "child-military"));
  assert.ok(!children.some((profile) => /liberte-nationale/.test(profile.id)));
  const illicoWeekend = adults.find((profile) => profile.id === "adult-illico-liberte-weekend");
  assert.equal(illicoWeekend.label, "illico LIBERTÉ — Week-end / Jour férié (-50 %)");
  assert.doesNotMatch(illicoWeekend.label, /Porteur/);
});

test("le parcours multi-voyageurs attend une validation explicite", () => {
  assert.match(app, /id="add-traveler"/);
  assert.match(app, /id="validate-button"/);
  assert.match(app, /id="result-card"[^>]*hidden/);
  assert.match(app, /function markDirty\(\)\{resultCard\.hidden=true;setMessage\(\)\}/);
  assert.match(app, /Détail par voyageur/);
  assert.match(app, /Total du groupe/);
  assert.doesNotMatch(app, /Résultat masqué|pending-card|Prêt —|Calcul effectué avec/);
  assert.doesNotMatch(app, /détail individuel ci-dessous|Montants indicatifs issus/);
  assert.match(app, /caption\.textContent=travelers\.length>1\?travelers\.length\+" voyageurs":""/);
  assert.match(app, /<footer class="app-footer">Tarifs TER 2026<\/footer>/);
});

test("les contrôles et la mise en page restent adaptés aux téléphones et aux ordinateurs", () => {
  assert.match(app, /\.field select\{[^}]*-webkit-appearance:none;appearance:none;/);
  assert.match(app, /background-position:right 12px center/);
  assert.match(app, /@media \(max-width:520px\)/);
  assert.match(app, /@media \(max-width:370px\)/);
  assert.match(app, /@media \(min-width:900px\)/);
  assert.match(app, /\.traveler-fields\{grid-template-columns:1fr\}/);
  assert.match(app, /\.result-card\{grid-column:2;grid-row:1;margin-top:0\}/);
});

test("le fond reste continu et l’identité SNCF TER est visible", () => {
  assert.match(app, /--page-gradient:linear-gradient\(180deg,var\(--plum-dark\) 0%,var\(--plum\) 20%,var\(--fuchsia\) 40%,var\(--sncf-crimson\) 60%,var\(--sncf-red-mid\) 80%,var\(--red\) 100%\)/);
  assert.match(app, /html\{margin:0;width:100%;max-width:100%;min-height:100%;overflow-x:hidden;overflow-x:clip;background-color:var\(--red\);background-image:var\(--page-gradient\);background-repeat:no-repeat/);
  assert.match(app, /body\{position:relative;margin:0;width:100%;max-width:100%;min-height:100vh;min-height:100svh;min-height:100dvh;padding:0;overflow-x:hidden;overflow-x:clip;background:transparent/);
  assert.match(app, /<meta id="theme-color" name="theme-color" content="#7F2171"\/>/);
  assert.match(app, /if\(ios\)document\.getElementById\("theme-color"\)\.setAttribute\("content","#E41D25"\)/);
  assert.doesNotMatch(app, /--plum-dark:#4F1A60/, "L'ancien violet sombre ne doit pas réapparaître");
  assert.match(app, /\.header\{position:relative;background:transparent/);
  assert.doesNotMatch(app, /header-art/);
  assert.doesNotMatch(app, /\.splash-screen::before|\.splash-screen::after/);
  assert.match(app, /<img class="brand-logo" src="\/sncf-ter-aura\.webp" alt="SNCF Voyageurs – TER Auvergne-Rhône-Alpes"\/>/);
  assert.match(app, /\.brand-logo-wrap\{[^}]*background:#fff/);
  assert.match(app, /\.app-footer\{[^}]*padding:18px 12px calc\(24px \+ env\(safe-area-inset-bottom\)\);[^}]*color:#fff/);
});

test("les éléments entourés utilisent des aplats unis et aucune bulle décorative", () => {
  assert.match(app, /\.total-value\.is-increasing\{color:#6DF3B7/);
  assert.match(app, /\.total-value\.is-decreasing\{color:#FF9BA9/);
  assert.match(app, /directional&&delta!==0/);
  assert.match(app, /\.traveler-index\{[^}]*background:var\(--fuchsia\)/);
  assert.match(app, /\.validate-button\{[^}]*background:var\(--fuchsia\)/);
  assert.match(app, /\.total-card\{[^}]*background:var\(--fuchsia\)/);
  assert.doesNotMatch(app, /\.total-card::after/);
  assert.doesNotMatch(app, /class="total-trend"/, "Pastille retirée : non demandée");
});

test("l'écran de chargement ne se masque que sur Android installé, jamais sur iOS", () => {
  assert.match(app, /var android=\/Android\/i\.test\(navigator\.userAgent\)/);
  assert.match(app, /if\(android&&installed\)document\.documentElement\.classList\.remove\("splash-active"\)/);
  assert.doesNotMatch(app, /navigator\.standalone===true/, "navigator.standalone (iOS) masquait le splash même hors installation");
});

test("le train traverse uniquement la zone entre les deux gares", () => {
  assert.match(app, /\.journey\{display:grid;grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\)/);
  assert.match(app, /\.train-lane\{--lane-width:196px;--train-width:174px/);
  assert.match(app, /@keyframes train-between-stations\{from\{transform:translate3d\(calc\(var\(--train-width\) \* -1\),0,0\)\}to\{transform:translate3d\(var\(--lane-width\),0,0\)\}\}/);
});

test("l’écran d’ouverture recouvre entièrement l’application sur iPhone", () => {
  assert.match(app, /<html lang="fr" class="splash-active">/);
  assert.match(app, /\.splash-screen\{position:fixed;inset:-2px;bottom:calc\(-2px - env\(safe-area-inset-bottom\)\);z-index:2147483647/);
  assert.match(app, /\.splash-screen\{[^}]*width:auto;height:auto/);
  assert.match(app, /min-height:calc\(100dvh \+ env\(safe-area-inset-bottom\) \+ 4px\)/);
  assert.match(app, /\.splash-screen\{[^}]*background-color:var\(--plum-dark\);background-image:var\(--page-gradient\)/);
  assert.match(app, /body\{[^}]*min-height:100dvh/);
});

test("la PWA reste installable et utilisable hors connexion", () => {
  assert.equal(manifest.orientation, "any");
  assert.equal(manifest.start_url, "/app.html");
  assert.ok(data.meta.revision >= 6);
  assert.match(serviceWorker, /OFFLINE_DOCUMENT = "\/app\.html"/);
  assert.match(serviceWorker, new RegExp(`const CACHE_NAME = "krono-${data.meta.version}-r${data.meta.revision}";`),
    "Le cache doit être nommé d'après la version tarifaire courante, pas une valeur figée en dur");
  assert.match(serviceWorker, /"\/tarifs-base\.json"/);
  assert.match(serviceWorker, /NAVIGATION_FALLBACKS = \[OFFLINE_DOCUMENT\]/);
  assert.match(serviceWorker, /OPTIONAL_SHELL = \["\/", "\/tarifs\.html"\]/);
  assert.match(serviceWorker, /"\/sncf-ter-aura\.webp"/);
  assert.match(serviceWorker, /Promise\.all\(REQUIRED_SHELL\.map/);
  assert.match(serviceWorker, /Promise\.allSettled\(OPTIONAL_SHELL\.map/);
  assert.match(serviceWorker, /event\.request\.mode === "navigate"[\s\S]*cachedNavigation\(event\.request\)[\s\S]*cacheFirst\(event\.request\)/);
  assert.match(app, /async function registerOfflineWorker\(\)/);
  assert.match(app, /if\("serviceWorker" in navigator\)registerOfflineWorker\(\)/);
  assert.ok(app.indexOf("registerOfflineWorker();") < app.indexOf('fetch("/tarifs-base.json"'),
    "Le service worker doit être lancé avant le chargement asynchrone des tarifs");
  assert.match(app, /await registration\.update\(\)/);
  assert.match(app, /registration\.waiting\.postMessage\(\{type:"SKIP_WAITING"\}\)/);
});

test("le cache PWA sert réellement l’application et les tarifs quand le réseau tombe", async () => {
  const origin = "https://krono.test";
  const normalize = (input) => {
    const url = new URL(typeof input === "string" ? input : input.url, origin);
    url.search = "";
    return url.href;
  };
  class WorkerRequest {
    constructor(input, init = {}) {
      this.url = new URL(typeof input === "string" ? input : input.url, origin).href;
      this.method = init.method ?? input?.method ?? "GET";
      this.mode = init.mode ?? input?.mode ?? "cors";
      this.cache = init.cache ?? "default";
      this.credentials = init.credentials ?? "same-origin";
    }
  }
  class MemoryCache {
    entries = new Map();
    async put(request, response) { this.entries.set(normalize(request), response.clone()); }
    async match(request) { return this.entries.get(normalize(request))?.clone(); }
    async keys() { return [...this.entries.keys()].map((url) => new WorkerRequest(url)); }
  }
  const buckets = new Map();
  const cacheStorage = {
    async open(name) {
      if (!buckets.has(name)) buckets.set(name, new MemoryCache());
      return buckets.get(name);
    },
    async keys() { return [...buckets.keys()]; },
    async delete(name) { return buckets.delete(name); },
    async match(request) {
      for (const cache of buckets.values()) {
        const response = await cache.match(request);
        if (response) return response;
      }
    },
  };
  const handlers = {};
  let online = true;
  const workerSelf = {
    location: { origin },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener(type, handler) { handlers[type] = handler; },
  };
  const workerFetch = async (request) => {
    const path = new URL(request.url).pathname;
    if (!online) throw new Error("Réseau indisponible");
    return new Response(path === "/app.html" ? app : path, { status: 200 });
  };
  runInNewContext(serviceWorker, {
    self: workerSelf,
    caches: cacheStorage,
    fetch: workerFetch,
    Request: WorkerRequest,
    Response,
    URL,
    Promise,
    Error,
    console,
  });

  let installTask;
  handlers.install({ waitUntil(task) { installTask = task; } });
  await installTask;
  const cache = buckets.get(`krono-${data.meta.version}-r${data.meta.revision}`);
  assert.ok(cache, "Le cache versionné doit être créé");
  assert.ok(await cache.match("/app.html"));
  assert.ok(await cache.match("/tarifs-base.json"));
  assert.ok(await cache.match("/sncf-ter-aura.webp"));

  const fetchOffline = async (request) => {
    let responseTask;
    handlers.fetch({ request, respondWith(task) { responseTask = task; } });
    return responseTask;
  };
  online = false;
  const navigation = await fetchOffline(new WorkerRequest("/trajet-inconnu", { mode: "navigate" }));
  assert.match(await navigation.text(), /<!DOCTYPE html>/);
  const tariffs = await fetchOffline(new WorkerRequest("/tarifs-base.json"));
  assert.equal(await tariffs.text(), "/tarifs-base.json");
});

test("GitHub Pages conserve le lien public stable et la publication contrôlée", () => {
  assert.match(home, /url=\/app\.html/);
  assert.match(home, /location\.replace\("\/app\.html"\)/);
  assert.match(tariffTable, /href="\/app\.html"/);
  assert.match(workflow, /sync-app-from-tariff-base\.mjs/);
  assert.match(workflow, /verify-app-data\.mjs/);
  assert.match(workflow, /audit-recommendations\.test\.mjs/);
  assert.match(workflow, /upload-pages-artifact/);
  assert.match(workflow, /deploy-pages/);
  assert.match(workflow, /path: public/);
});
