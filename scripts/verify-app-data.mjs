import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [appHtml, tariffTableHtml, tariffBase, fallbackCss, serviceWorker, manifestText, companionChecksText] = await Promise.all([
  read("public/app.html"),
  read("public/tarifs.html"),
  read("public/tarifs-base.json"),
  read("public/tarifs-secours.css"),
  read("public/sw.js"),
  read("public/manifest.webmanifest"),
  read("scripts/illico-companion-checks-2026-08-29.json"),
]);
const data = JSON.parse(tariffBase);
const manifest = JSON.parse(manifestText);
const companionChecks = JSON.parse(companionChecksText);

const stationIds = [
  "lyon-part-dieu",
  "meximieux-perouges",
  "amberieu-en-bugey",
  "tenay-hauteville",
  "virieu-le-grand-belley",
  "culoz",
  "seyssel-corbonod",
  "bellegarde-sur-valserine",
  "geneve",
];
const adultProfileIds = [
  "adult-none",
  "adult-illico-liberte-weekday",
  "adult-illico-liberte-weekend",
  "adult-illico-liberte-weekend-companion",
  "adult-illico-jeunes",
  "adult-liberte-nationale",
  "adult-famille-nombreuse-30",
  "adult-famille-nombreuse-40",
  "adult-famille-nombreuse-50",
  "adult-famille-nombreuse-75",
  "adult-military",
  "adult-family-military",
];
const childProfileIds = [
  "child-none",
  "child-illico-liberte-weekend-companion",
  "child-family-military",
  "child-famille-nombreuse-30",
  "child-famille-nombreuse-40",
  "child-famille-nombreuse-50",
  "child-famille-nombreuse-75",
];
const profileIds = [...adultProfileIds, ...childProfileIds];
const ceilToTen = (value) => Math.ceil(value / 10) * 10;
const childFare = (value) => Math.max(120, ceilToTen(value / 2));
const companionFormulaExceptions = new Set([
  "meximieux-perouges|amberieu-en-bugey",
  "virieu-le-grand-belley|culoz",
]);

assert.deepEqual(data.stations.map(({ id }) => id), stationIds, "Ordre ou liste des gares incorrecte");
assert.equal(data.meta.year, 2026);
assert.match(data.meta.version, /^\d{4}-\d{2}-\d{2}$/);
assert.equal(data.meta.directionMode, "symmetric");
assert.equal(data.meta.childDefinition, "Enfant de 4 à 11 ans inclus");
assert.equal(data.meta.profileCount, 19);
assert.equal(data.meta.revision, 6);
assert.deepEqual(data.profiles.map(({ id }) => id), profileIds, "Liste des profils tarifaires incorrecte");
assert.deepEqual(data.profiles.filter(({ travelerType }) => travelerType === "adult").map(({ id }) => id), adultProfileIds);
assert.deepEqual(data.profiles.filter(({ travelerType }) => travelerType === "child").map(({ id }) => id), childProfileIds);
assert.ok(data.meta.sources.every(({ url }) => /^https:\/\//.test(url)), "Chaque source doit être traçable par URL");

const expectedRelations = stationIds.length * (stationIds.length - 1) / 2;
assert.equal(Object.keys(data.pairs).length, expectedRelations);
for (let from = 0; from < stationIds.length; from += 1) {
  for (let to = from + 1; to < stationIds.length; to += 1) {
    const key = `${stationIds[from]}|${stationIds[to]}`;
    assert.ok(data.pairs[key], `Relation manquante : ${key}`);
  }
}

for (const [key, route] of Object.entries(data.pairs)) {
  assert.ok(Number.isInteger(route.km) && route.km > 0, `Distance invalide : ${key}`);
  assert.deepEqual(Object.keys(route.fares), profileIds, `Profils incomplets : ${key}`);
  for (const [profileId, fares] of Object.entries(route.fares)) {
    assert.equal(fares.length, 2, `Deux classes attendues : ${key} / ${profileId}`);
    assert.ok(fares.every((fare) => Number.isInteger(fare) && fare > 0), `Tarif invalide : ${key} / ${profileId}`);
    assert.ok(fares[1] >= fares[0], `La 1re doit être supérieure ou égale à la 2de : ${key} / ${profileId}`);
  }
  assert.deepEqual(route.fares["adult-military"], route.fares["adult-famille-nombreuse-75"], `Équivalence militaire incorrecte : ${key}`);
  assert.deepEqual(route.fares["adult-illico-liberte-weekend-companion"], route.fares["adult-illico-liberte-weekend"], `Accompagnant illico adulte incorrect : ${key}`);
  assert.deepEqual(route.fares["adult-family-military"], route.fares["adult-none"].map((fare) => ceilToTen(fare * 0.6)), `Famille Militaire adulte incorrecte : ${key}`);
  assert.deepEqual(route.fares["child-none"], route.fares["adult-none"].map(childFare), `Tarif enfant incorrect : ${key}`);
  assert.deepEqual(route.fares["child-illico-liberte-weekend-companion"], companionChecks.relations[key]?.fares, `Contrôle SNCF Connect accompagnant enfant incorrect : ${key}`);
  if (!companionFormulaExceptions.has(key)) {
    assert.deepEqual(route.fares["child-illico-liberte-weekend-companion"], route.fares["child-none"].map(childFare), `Cohérence accompagnant illico enfant incorrecte : ${key}`);
  }
  assert.deepEqual(route.fares["child-family-military"], route.fares["adult-family-military"].map(childFare), `Famille Militaire enfant incorrecte : ${key}`);
  for (const rate of [30, 40, 50, 75]) {
    const profileId = `child-famille-nombreuse-${rate}`;
    const expected = route.fares[`adult-famille-nombreuse-${rate}`].map(childFare);
    const override = route.overrides?.[profileId];
    if (override) {
      assert.ok(override.reason && override.proof && override.checkedAt,
        `Exception non justifiée (reason/proof/checkedAt requis) : ${key} / ${profileId}`);
      assert.deepEqual(override.expectedByFormula, expected,
        `L'exception ${key}/${profileId} ne documente plus l'écart réel avec la formule — mettre à jour expectedByFormula ou retirer l'exception`);
      // L'exception est tracée avec preuve : le tarif retenu peut s'écarter de la formule.
    } else {
      assert.deepEqual(route.fares[profileId], expected, `FN ${rate} enfant incorrecte : ${key}`);
    }
  }
}

assert.equal(Object.keys(companionChecks.relations).length, expectedRelations, "Les 36 contrôles directs illico accompagnant sont obligatoires");
assert.equal(companionChecks.meta.travelDate, "2026-08-29");
assert.equal(companionChecks.meta.traveler, "Enfant de 10 ans, représentatif de la tranche 4–11 ans");
assert.ok(!profileIds.includes("child-illico-jeunes"), "Un enfant de 4–11 ans ne doit jamais recevoir illico LIBERTÉ JEUNES");
const illicoWeekend = data.profiles.find((profile) => profile.id === "adult-illico-liberte-weekend");
assert.equal(illicoWeekend.label, "illico LIBERTÉ — Week-end / Jour férié (-50 %)", "Le libellé illico LIBERTÉ principal est incorrect");
assert.doesNotMatch(illicoWeekend.label, /Porteur/, "La mention Porteur doit rester supprimée");
assert.deepEqual(data.pairs["meximieux-perouges|amberieu-en-bugey"].fares["child-illico-liberte-weekend-companion"], [120, 180], "Contrôle direct accompagnant Meximieux–Ambérieu altéré");
assert.deepEqual(data.pairs["virieu-le-grand-belley|culoz"].fares["child-illico-liberte-weekend-companion"], [120, 180], "Contrôle direct accompagnant Virieu–Culoz altéré");

assert.deepEqual(data.pairs["amberieu-en-bugey|tenay-hauteville"].fares["child-famille-nombreuse-75"], [120, 180], "Contrôle direct FN 75 enfant altéré");
assert.deepEqual(data.pairs["lyon-part-dieu|geneve"].fares["adult-family-military"], [2110, 3200], "Contrôle direct Famille Militaire adulte altéré");
assert.deepEqual(data.pairs["lyon-part-dieu|geneve"].fares["child-family-military"], [1060, 1600], "Contrôle direct Famille Militaire enfant altéré");
assert.deepEqual(data.pairs["lyon-part-dieu|geneve"].fares["child-famille-nombreuse-30"], [990, 1690]);
assert.deepEqual(data.pairs["lyon-part-dieu|geneve"].fares["child-famille-nombreuse-40"], [850, 1550]);
assert.deepEqual(data.pairs["lyon-part-dieu|geneve"].fares["child-famille-nombreuse-50"], [710, 1410]);
assert.deepEqual(data.pairs["lyon-part-dieu|geneve"].fares["child-famille-nombreuse-75"], [360, 1060]);

assert.match(appHtml, /fetch\("\/tarifs-base\.json"/);
assert.match(appHtml, /id="result-card"[^>]*hidden/, "Les résultats doivent être masqués avant validation");
assert.match(appHtml, /id="validate-button"/, "Le bouton Valider est obligatoire");
assert.match(appHtml, /id="add-traveler"/, "Le sélecteur multi-voyageurs est obligatoire");
assert.match(appHtml, /profilesByType=\{adult:\[\],child:\[\]\}/, "Les cartes doivent être filtrées selon le profil");
assert.match(appHtml, /travelers\.length>=9/, "La limite SNCF de 9 voyageurs doit être respectée");
assert.match(appHtml, /function markDirty\(\)\{resultCard\.hidden=true;setMessage\(\)\}/, "Toute modification doit remasquer le résultat");
assert.doesNotMatch(appHtml, /Résultat masqué|pending-card|Prêt —|Calcul effectué avec/, "Les messages supprimés ne doivent pas réapparaître");
assert.doesNotMatch(appHtml, /détail individuel ci-dessous|Montants indicatifs issus/, "Les mentions supprimées ne doivent pas réapparaître");
assert.match(appHtml, /caption\.textContent=travelers\.length>1\?travelers\.length\+" voyageurs":""/, "Le nombre de voyageurs ne doit apparaître que pour un groupe");
assert.match(appHtml, /<footer class="app-footer">Tarifs TER 2026<\/footer>/, "Le pied de page doit rester minimal");
assert.match(appHtml, /\.field select\{[^}]*-webkit-appearance:none;appearance:none;/, "Tous les sélecteurs doivent avoir le même rendu sur iPhone, Android et ordinateur");
assert.match(appHtml, /background-position:right 12px center/, "Les flèches doivent être alignées à droite");
assert.match(appHtml, /@media \(max-width:370px\)/, "La mise en page Crosscall doit rester couverte");
assert.match(appHtml, /@media \(min-width:900px\)/, "La mise en page ordinateur doit rester couverte");
assert.match(appHtml, /\.total-value\.is-increasing\{color:#6DF3B7/, "Le vert doit être restauré sur le montant pendant le défilement");
assert.match(appHtml, /\.total-value\.is-decreasing\{color:#FF9BA9/, "Le rouge clair doit rester lisible sur le montant pendant le défilement");
assert.match(appHtml, /directional&&delta!==0/, "La couleur ne s'applique qu'au total du groupe, pas aux sous-totaux 2de/1re");
assert.match(appHtml, /\.traveler-index\{[^}]*background:var\(--fuchsia\)/, "La pastille voyageur doit utiliser un aplat uni");
assert.match(appHtml, /\.validate-button\{[^}]*background:var\(--fuchsia\)/, "Le bouton Valider doit utiliser un aplat uni");
assert.match(appHtml, /\.total-card\{[^}]*background:var\(--fuchsia\)/, "L'encart Surclassement du groupe doit utiliser un aplat uni");
assert.doesNotMatch(appHtml, /\.total-card::after/, "L'encart Surclassement du groupe ne doit contenir aucune bulle décorative");
assert.doesNotMatch(appHtml, /class="total-trend"/, "Aucune pastille de tendance : non demandée, retirée");
assert.match(appHtml, /var android=\/Android\/i\.test\(navigator\.userAgent\)/,
  "Le contournement du splash doit rester réservé à Android — étendu à iOS (navigator.standalone), il masque l'écran de chargement sur iPhone même hors installation");
assert.match(appHtml, /if\(android&&installed\)document\.documentElement\.classList\.remove\("splash-active"\)/,
  "La condition doit combiner android ET installed, jamais installed seul");
assert.doesNotMatch(appHtml, /navigator\.standalone===true/,
  "navigator.standalone (iOS) ne doit plus jamais déclencher la suppression du splash");
assert.match(appHtml, /@keyframes train-between-stations/);
assert.match(appHtml, /position:fixed;inset:-2px;bottom:calc\(-2px - env\(safe-area-inset-bottom\)\);z-index:2147483647/);
assert.match(appHtml, /min-height:calc\(100dvh \+ env\(safe-area-inset-bottom\) \+ 4px\)/);
assert.match(appHtml, /--page-gradient:linear-gradient\(180deg,var\(--plum-dark\) 0%,var\(--plum\) 20%,var\(--fuchsia\) 40%,var\(--sncf-crimson\) 60%,var\(--sncf-red-mid\) 80%,var\(--red\) 100%\)/, "Le fond global doit reprendre le dégradé SNCF du violet en haut vers le rouge en bas");
assert.match(appHtml, /html\{margin:0;width:100%;max-width:100%;min-height:100%;overflow-x:hidden;overflow-x:clip;background-color:var\(--red\);background-image:var\(--page-gradient\);background-repeat:no-repeat/,
  "La racine doit porter l'unique dégradé continu et finir sur le rouge dans la zone basse");
assert.match(appHtml, /body\{position:relative;margin:0;width:100%;max-width:100%;min-height:100vh;min-height:100svh;min-height:100dvh;padding:0;overflow-x:hidden;overflow-x:clip;background:transparent/,
  "Le body doit rester transparent pour ne jamais recommencer le dégradé");
assert.match(appHtml, /<meta id="theme-color" name="theme-color" content="#7F2171"\/>/,
  "Android doit reprendre le violet du haut sans afficher de bande rouge système");
assert.match(appHtml, /if\(ios\)document\.getElementById\("theme-color"\)\.setAttribute\("content","#E41D25"\)/,
  "iOS doit conserver le rouge final pour la continuité de son interface basse");
assert.doesNotMatch(appHtml, /--plum-dark:#4F1A60/, "L'ancien violet sombre ne doit pas réapparaître");
assert.match(appHtml, /\.header\{position:relative;background:transparent/, "L'en-tête doit rester transparent sur le fond continu");
assert.doesNotMatch(appHtml, /header-art/, "Les bulles décoratives de l'en-tête doivent être supprimées");
assert.doesNotMatch(appHtml, /\.splash-screen::before|\.splash-screen::after/, "Les bulles décoratives de l'écran d'ouverture doivent être supprimées");
assert.match(appHtml, /<img class="brand-logo" src="\/sncf-ter-aura\.webp" alt="SNCF Voyageurs – TER Auvergne-Rhône-Alpes"\/>/,
  "Le logo SNCF TER Auvergne-Rhône-Alpes doit être présent");
assert.match(appHtml, /\.brand-logo-wrap\{[^}]*background:#fff/, "Le logo SNCF TER doit rester dans son cartouche blanc");
assert.match(appHtml, /\.app-footer\{[^}]*padding:18px 12px calc\(24px \+ env\(safe-area-inset-bottom\)\);[^}]*color:#fff/,
  "Le pied de page doit être blanc et couvrir la zone sûre basse");
assert.match(fallbackCss, new RegExp(`source unique : \/tarifs-base\.json — ${data.meta.version}`));
assert.match(tariffTableHtml, /data\.profiles/, "Le tableau tarifaire doit utiliser les 19 profils");
assert.match(tariffTableHtml, /\.hero\{position:relative;background:var\(--page-gradient\)/,
  "La base tarifaire doit reprendre la même identité SNCF");
assert.doesNotMatch(tariffTableHtml, /\.hero::before|\.hero::after/,
  "La base tarifaire ne doit conserver aucune bulle décorative");
assert.match(tariffTableHtml, /\.field select\{[^}]*-webkit-appearance:none;appearance:none/,
  "Le sélecteur de la base tarifaire doit être identique sur les différents appareils");
assert.equal(manifest.start_url, "/app.html");
assert.equal(manifest.orientation, "any");
assert.equal(manifest.background_color, "#7F2171");
assert.equal(manifest.theme_color, "#7F2171");
assert.match(serviceWorker, new RegExp(`const CACHE_NAME = "krono-${data.meta.version}-r${data.meta.revision}";`),
  "Le nom du cache doit dériver de meta.version et meta.revision — lancer scripts/sync-app-from-tariff-base.mjs avant de vérifier");
assert.doesNotMatch(serviceWorker, /krono-plus-v\d+"/, "Aucun nom de cache ne doit rester écrit en dur (ex. krono-plus-v17)");
assert.match(serviceWorker, /"\/tarifs-base\.json"/);
assert.ok(data.meta.revision >= 6, "La couleur système Crosscall doit invalider l'ancien cache hors connexion");
assert.match(serviceWorker, /OFFLINE_DOCUMENT = "\/app\.html"/);
assert.match(serviceWorker, /NAVIGATION_FALLBACKS = \[OFFLINE_DOCUMENT\]/);
assert.match(serviceWorker, /OPTIONAL_SHELL = \["\/", "\/tarifs\.html"\]/);
assert.match(tariffTableHtml, /href="\/app\.html"/, "La base tarifaire doit revenir vers la page GitHub Pages réelle");
assert.match(serviceWorker, /"\/sncf-ter-aura\.webp"/);
assert.match(serviceWorker, /Promise\.all\(REQUIRED_SHELL\.map/);
assert.match(serviceWorker, /Promise\.allSettled\(OPTIONAL_SHELL\.map/);
assert.match(serviceWorker, /event\.request\.mode === "navigate"[\s\S]*cachedNavigation\(event\.request\)[\s\S]*cacheFirst\(event\.request\)/);
assert.match(appHtml, /updateViaCache:"none"/);
assert.match(appHtml, /async function registerOfflineWorker\(\)/);
assert.match(appHtml, /if\("serviceWorker" in navigator\)registerOfflineWorker\(\)/);
assert.ok(appHtml.indexOf("registerOfflineWorker();") < appHtml.indexOf('fetch("/tarifs-base.json"'),
  "Le service worker doit être lancé avant le chargement asynchrone des tarifs");
assert.match(appHtml, /await registration\.update\(\)/);
assert.match(appHtml, /registration\.waiting\.postMessage\(\{type:"SKIP_WAITING"\}\)/);

const directedRoutes = data.stations.length * (data.stations.length - 1);
const fareStates = directedRoutes * data.profiles.length;
console.log(`Données vérifiées : ${data.stations.length} gares, ${directedRoutes} trajets orientés, ${data.profiles.length} profils, ${fareStates * 2} montants et ${fareStates} surclassements.`);
