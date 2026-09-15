import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [app, fallback, manifestText, serviceWorker, baseText, workflow, tariffWorkflow, home, tariffTable] = await Promise.all([
  read("public/app.html"),
  read("public/tarifs-secours.css"),
  read("public/manifest.webmanifest"),
  read("public/sw.js"),
  read("public/tarifs-base.json"),
  read(".github/workflows/publication.yml"),
  read(".github/workflows/mise-a-jour-tarifs.yml"),
  read("public/index.html"),
  read("public/tarifs.html"),
]);
const manifest = JSON.parse(manifestText);
const data = JSON.parse(baseText);
const buildId = `${data.meta.version}-r${data.meta.revision}`;
const tariffDocument = `/tarifs-base-${buildId}.json`;
const versionedBaseText = await read(`public${tariffDocument}`);
const shellVersion = serviceWorker.match(/const APP_SHELL_VERSION = "([^"]+)";/)?.[1];
const cacheName = `krono-${buildId}-${shellVersion}`;

test("un nouveau service worker recharge les tarifs une seule fois, sans boucle à l'installation", () => {
  const hook = app.split("\n").find((line) => line.includes('addEventListener("controllerchange"'));
  assert.ok(hook);
  for (const alreadyInstalled of [false, true]) {
    let handler, reloads = 0;
    const navigator = { serviceWorker: {
      controller: alreadyInstalled ? {} : null,
      addEventListener(event, callback) { handler = callback; },
    } };
    runInNewContext(hook, { navigator, location: { reload() { reloads++; } } });
    handler();
    assert.equal(reloads, alreadyInstalled ? 1 : 0);
    handler();
    handler();
    assert.equal(reloads, 1);
  }
});

test("la base tarifaire reste la source unique", () => {
  assert.ok(app.includes(`fetch("${tariffDocument}"`));
  assert.deepEqual(JSON.parse(versionedBaseText), data);
  assert.match(app, /href="\/tarifs-secours\.css"/);
  assert.doesNotMatch(app, /const DATA=\{/);
  assert.match(fallback, /FICHIER GÉNÉRÉ — source unique : \/tarifs-base\.json/);
  // Cohérence interne plutôt que des nombres gravés : ajouter une gare ou un
  // profil un jour ne doit pas faire échouer la publication d'une hausse de tarifs.
  assert.equal(data.profiles.length, data.meta.profileCount);
  const gares = data.stations.length;
  assert.equal(Object.keys(data.pairs).length, (gares * (gares - 1)) / 2,
    "Toutes les relations symétriques entre gares doivent être présentes");
});

test("les profils adulte et enfant n’exposent que leurs cartes applicables", () => {
  const adults = data.profiles.filter((profile) => profile.travelerType === "adult");
  const children = data.profiles.filter((profile) => profile.travelerType === "child");
  assert.equal(adults.length + children.length, data.profiles.length,
    "Tout profil doit être rattaché à un adulte ou à un enfant");
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

test("un profil d'un type inattendu ne peut pas empêcher l'application de démarrer", () => {
  // On extrait la boucle réelle de public/app.html et on l'exécute telle quelle :
  // avant correction, un profil dont le travelerType n'était ni "adult" ni "child"
  // levait une TypeError et l'agent ne voyait plus que « La base tarifaire n'a pas
  // pu être chargée », sur la totalité de l'application.
  const extrait = app.match(/DATA\.profiles\.forEach\(profile=>\{.*?\}\);/);
  assert.ok(extrait, "La boucle de chargement des profils est introuvable dans app.html");
  const contexte = {
    DATA: { profiles: [...data.profiles, { id: "senior-test", travelerType: "senior", label: "Profil futur" }] },
    profilesByType: { adult: [], child: [] },
    profileById: new Map(),
  };
  assert.doesNotThrow(() => runInNewContext(extrait[0], contexte));
  assert.equal(contexte.profilesByType.adult.length, data.profiles.filter((p) => p.travelerType === "adult").length);
  assert.ok(contexte.profilesByType.senior, "Le profil inconnu doit être rangé à part, pas provoquer une erreur");
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
  assert.match(app, new RegExp(`<footer class="app-footer">Tarifs TER ${data.meta.year}</footer>`));
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
  assert.match(serviceWorker, new RegExp(`const TARIFF_VERSION = "${data.meta.version}-r${data.meta.revision}";`));
  assert.match(shellVersion, /^app-[a-f0-9]{12}$/,
    "Le cache de l'application doit porter une empreinte générée automatiquement");
  assert.match(serviceWorker, /const CACHE_NAME = `krono-\$\{TARIFF_VERSION\}-\$\{APP_SHELL_VERSION\}`;/);
  assert.match(serviceWorker, /const NETWORK_TIMEOUT_MS = 3000;/);
  assert.ok(serviceWorker.includes(`const TARIFF_DOCUMENT = "${tariffDocument}";`));
  assert.match(serviceWorker, /const STABLE_TARIFF_DOCUMENT = "\/tarifs-base\.json";/);
  assert.match(serviceWorker, /NAVIGATION_FALLBACKS = \[OFFLINE_DOCUMENT\]/);
  assert.match(serviceWorker, /OPTIONAL_SHELL = \["\/", "\/tarifs\.html"\]/);
  assert.match(serviceWorker, /"\/sncf-ter-aura\.webp"/);
  assert.match(serviceWorker, /Promise\.all\(REQUIRED_SHELL\.map/);
  assert.match(serviceWorker, /Promise\.allSettled\(OPTIONAL_SHELL\.map/);
  assert.match(serviceWorker, /const navigation = navigationStrategy\(event\.request\)/);
  assert.match(serviceWorker, /event\.respondWith\(navigation\.response\);[\s\S]*event\.waitUntil\(navigation\.refresh\)/);
  assert.match(serviceWorker, /isStableTariff \? freshTariff\(event\.request\) : cacheFirst\(event\.request\)/);
  assert.match(app, /async function registerOfflineWorker\(\)/);
  assert.match(app, /if\("serviceWorker" in navigator\)registerOfflineWorker\(\)/);
  assert.ok(app.indexOf("registerOfflineWorker();") < app.indexOf(`fetch("${tariffDocument}"`),
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
  let networkMode = "online";
  let rejectPendingNetwork;
  let networkCalls = 0;
  const workerSelf = {
    location: { origin },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener(type, handler) { handlers[type] = handler; },
  };
  const workerFetch = async (request) => {
    networkCalls++;
    const path = new URL(request.url).pathname;
    if (networkMode === "offline") throw new Error("Réseau indisponible");
    if (networkMode === "wifi-without-internet") {
      return new Response("Passerelle indisponible", { status: 503 });
    }
    if (networkMode === "degraded") {
      return new Promise((_, reject) => { rejectPendingNetwork = reject; });
    }
    return new Response(path === "/app.html" ? app : path, { status: 200 });
  };
  runInNewContext(serviceWorker, {
    self: workerSelf,
    caches: cacheStorage,
    fetch: workerFetch,
    Request: WorkerRequest,
    Response,
    URL,
    AbortController,
    Promise,
    Error,
    console,
    setTimeout,
    clearTimeout,
  });

  let installTask;
  handlers.install({ waitUntil(task) { installTask = task; } });
  await installTask;
  const cache = buckets.get(cacheName);
  assert.ok(cache, "Le cache versionné doit être créé");
  assert.ok(await cache.match("/app.html"));
  assert.ok(await cache.match("/tarifs-base.json"));
  assert.ok(await cache.match(tariffDocument));
  assert.ok(await cache.match("/sncf-ter-aura.webp"));

  const backgroundTasks = [];
  const fetchThroughWorker = async (request) => {
    let responseTask;
    handlers.fetch({
      request,
      respondWith(task) { responseTask = task; },
      waitUntil(task) { backgroundTasks.push(task); },
    });
    return responseTask;
  };

  // Bon réseau : la page en cache s'affiche d'abord, puis se rafraîchit en arrière-plan.
  await cache.put("/app.html", new Response("application en cache"));
  networkMode = "online";
  const cachedOnline = await fetchThroughWorker(new WorkerRequest("/app.html", { mode: "navigate" }));
  assert.equal(await cachedOnline.text(), "application en cache");
  await backgroundTasks.at(-1);
  assert.match(await (await cache.match("/app.html")).text(), /<!DOCTYPE html>/);

  // Réseau dégradé : une requête qui ne répond pas ne doit jamais retenir l'écran.
  await cache.put("/app.html", new Response("application immédiate"));
  networkMode = "degraded";
  const degraded = await Promise.race([
    fetchThroughWorker(new WorkerRequest("/app.html", { mode: "navigate" })),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Ouverture bloquée par le réseau lent")), 100)),
  ]);
  assert.equal(await degraded.text(), "application immédiate");
  rejectPendingNetwork(new Error("Fin de la simulation réseau lent"));
  await backgroundTasks.at(-1);

  // Wi-Fi sans Internet : une erreur HTTP en arrière-plan ne remplace pas le cache valide.
  networkMode = "wifi-without-internet";
  const captive = await fetchThroughWorker(new WorkerRequest("/app.html", { mode: "navigate" }));
  assert.equal(await captive.text(), "application immédiate");
  await backgroundTasks.at(-1);
  assert.equal(await (await cache.match("/app.html")).text(), "application immédiate");

  // Le fichier tarifaire versionné est immuable : s'il est en cache, aucun réseau
  // lent ne peut bloquer le calcul et aucun ancien chemin stable ne peut le remplacer.
  await cache.put(tariffDocument, new Response("tarifs versionnés courants"));
  networkMode = "degraded";
  const callsBeforeTariff = networkCalls;
  const cachedTariffs = await fetchThroughWorker(new WorkerRequest(tariffDocument));
  assert.equal(await cachedTariffs.text(), "tarifs versionnés courants");
  assert.equal(networkCalls, callsBeforeTariff);

  // Mode avion : navigation connue et tarifs restent disponibles immédiatement.
  networkMode = "offline";
  const airplaneNavigation = await fetchThroughWorker(new WorkerRequest("/app.html", { mode: "navigate" }));
  assert.equal(await airplaneNavigation.text(), "application immédiate");
  await backgroundTasks.at(-1);
  const airplaneTariffs = await fetchThroughWorker(new WorkerRequest(tariffDocument));
  assert.equal(await airplaneTariffs.text(), "tarifs versionnés courants");

  // Une route inconnue retombe toujours sur l'application hors connexion.
  const navigation = await fetchThroughWorker(new WorkerRequest("/trajet-inconnu", { mode: "navigate" }));
  assert.equal(await navigation.text(), "application immédiate");
});

test("une application déjà installée contourne l'ancien JSON mis en cache", async () => {
  // L'ancien worker ignorait les paramètres d'URL : ?v=... n'aurait rien réglé.
  // Le nouveau document change réellement de chemin à chaque révision.
  const oldCachedPath = "/tarifs-base.json";
  assert.notEqual(tariffDocument, oldCachedPath);
  const oldCache = new Map([[oldCachedPath, "ancien tarif militaire"]]);
  const requestedPath = new URL(tariffDocument, "https://krono.test").pathname;
  const response = oldCache.get(requestedPath) ?? "nouveau tarif militaire reçu du réseau";
  assert.equal(response, "nouveau tarif militaire reçu du réseau");
});

test("GitHub Pages conserve le lien public stable et la publication contrôlée", () => {
  assert.match(home, /url=\/app\.html/);
  assert.match(home, /location\.replace\("\/app\.html"\)/);
  assert.match(tariffTable, /href="\/app\.html"/);
  assert.match(workflow, /sync-app-from-tariff-base\.mjs/);
  assert.match(workflow, /verify-app-data\.mjs/);
  assert.match(workflow, /node --test tests\/\*\.test\.mjs/);
  assert.match(workflow, /paths-ignore:[\s\S]*gestion-tarifs/);
  assert.match(workflow, /upload-pages-artifact/);
  assert.match(workflow, /deploy-pages/);
  assert.match(workflow, /path: public/);
  assert.match(tariffWorkflow, /import-tarifs-excel\.py/);
  assert.match(tariffWorkflow, /contents: write/);
  assert.match(tariffWorkflow, /pages: write/);
  assert.match(tariffWorkflow, /id-token: write/);
  assert.match(tariffWorkflow, /verify-app-data\.mjs/);
  assert.match(tariffWorkflow, /node --test tests\/\*\.test\.mjs/);
  assert.match(tariffWorkflow, /git push origin HEAD:main/);
  assert.match(tariffWorkflow, /git add -A[\s\S]*'public\/tarifs-base\*\.json'/);
  assert.match(tariffWorkflow, /upload-pages-artifact/);
  assert.match(tariffWorkflow, /deploy-pages/);
  assert.match(tariffWorkflow, /path: public/);
  assert.doesNotMatch(tariffWorkflow, /tarifs-production/);
  assert.doesNotMatch(tariffWorkflow, /TARIFS_APPROVAL_ENABLED/);
  assert.doesNotMatch(tariffWorkflow, /deuxième personne/);
});
