import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appHtml = await readFile(new URL("../public/app.html", import.meta.url), "utf8");
const tariffTableHtml = await readFile(new URL("../public/tarifs.html", import.meta.url), "utf8");
const tariffBase = await readFile(new URL("../public/tarifs-base.json", import.meta.url), "utf8");
const fallbackCss = await readFile(new URL("../public/tarifs-secours.css", import.meta.url), "utf8");
const serviceWorker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
const data = JSON.parse(tariffBase);
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
const discountIds = [
  "none",
  "illico-liberte-weekday",
  "illico-liberte-weekend",
  "illico-jeunes",
  "liberte-nationale",
  "famille-nombreuse-30",
  "famille-nombreuse-40",
  "famille-nombreuse-50",
  "famille-nombreuse-75",
];

assert.deepEqual(data.stations.map(({ id }) => id), stationIds, "Ordre ou liste des gares incorrecte");
assert.ok(Number.isInteger(data.meta.year) && data.meta.year >= 2026, "L’année de la base tarifaire est invalide");
assert.equal(data.meta.label, `Tarifs TER ${data.meta.year}`, "Le libellé tarifaire doit suivre l’année de la base");
assert.match(data.meta.version, /^\d{4}-\d{2}-\d{2}$/, "La version tarifaire doit être une date ISO");
assert.equal(data.meta.directionMode, "symmetric", "Les relations doivent rester bidirectionnelles");
assert.equal(data.stations.find(({ id }) => id === "meximieux-perouges")?.name, "Meximieux – Pérouges");
assert.deepEqual(data.discounts.map(({ id }) => id), discountIds, "Les cartes de réduction ont changé");
const expectedRelations = stationIds.length * (stationIds.length - 1) / 2;
assert.equal(Object.keys(data.pairs).length, expectedRelations, `La matrice doit contenir ${expectedRelations} relations non orientées`);

for (let from = 0; from < stationIds.length; from += 1) {
  for (let to = from + 1; to < stationIds.length; to += 1) {
    const key = `${stationIds[from]}|${stationIds[to]}`;
    assert.ok(data.pairs[key], `Relation manquante : ${key}`);
  }
}

const FLOOR_CENTS = 120;
const money = (cents) => `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, "0")} €`;
const amount = (cents) => `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, "0")}`;
for (const [key, route] of Object.entries(data.pairs)) {
  assert.ok(Number.isInteger(route.km) && route.km > 0, `Distance invalide : ${key}`);
  assert.deepEqual(Object.keys(route.fares), discountIds, `Cartes incomplètes : ${key}`);
  for (const [discount, fares] of Object.entries(route.fares)) {
    assert.equal(fares.length, 2, `Deux classes attendues : ${key} / ${discount}`);
    assert.ok(fares.every((fare) => Number.isInteger(fare) && fare >= FLOOR_CENTS), `Tarif sous le plancher de 1,20 € : ${key} / ${discount}`);
    assert.ok(fares[1] >= fares[0], `La 1re classe doit être au moins égale à la 2de : ${key} / ${discount}`);
  }

  const [from, to] = key.split("|");
  let fallbackRule = `html:not(.js-ready) #app:has(#from option[value="${from}"]:checked):has(#to option[value="${to}"]:checked),html:not(.js-ready) #app:has(#from option[value="${to}"]:checked):has(#to option[value="${from}"]:checked){`;
  for (const discount of discountIds) {
    const [second, first] = route.fares[discount];
    fallbackRule += `--p2-${discount}:"${money(second)}";--p1-${discount}:"${money(first)}";--sur-${discount}:"${amount(first - second)}";`;
  }
  fallbackRule += `--fallback-p2-none:"${money(route.fares.none[0])}";--fallback-p1-none:"${money(route.fares.none[1])}"}`;
  assert.ok(fallbackCss.includes(fallbackRule), `Règle de secours sans JavaScript désynchronisée : ${key}`);
}

assert.equal((appHtml.match(/<option value="meximieux-perouges">Meximieux – Pérouges<\/option>/g) ?? []).length, 2, "La nouvelle gare doit figurer dans les deux menus");
assert.equal((fallbackCss.match(/value="meximieux-perouges"\]:checked\):has\(#to option\[value="meximieux-perouges"\]:checked/g) ?? []).length, 2, "Le cas départ = arrivée doit être géré sans JavaScript");
assert.doesNotMatch(appHtml, /militaire/i, "Les cartes militaires ne doivent pas réapparaître");
assert.match(appHtml, /fetch\("\/tarifs-base\.json"/, "Le calculateur doit charger la base tarifaire unique");
assert.doesNotMatch(appHtml, /const DATA=\{/, "Les tarifs ne doivent plus être dupliqués dans le calculateur");
assert.doesNotMatch(appHtml, /--p2-none:/, "Les tarifs de secours ne doivent plus être dupliqués dans le HTML");
assert.match(appHtml, /href="\/tarifs-secours\.css"/, "La feuille de secours générée doit être chargée");
assert.match(fallbackCss, new RegExp(`source unique : \\/tarifs-base\\.json — ${data.meta.version}`), "Le secours CSS doit identifier la version de sa source");
assert.doesNotMatch(appHtml, /href="\/tarifs\.html"/, "La base tarifaire ne doit pas apparaître dans le simulateur public");
assert.match(tariffTableHtml, /fetch\("\/tarifs-base\.json"/, "Le tableau doit charger la même base tarifaire");
assert.match(tariffTableHtml, /Relation aller ↔ retour/, "Le regroupement des deux sens doit être expliqué");
assert.equal(manifest.orientation, "any", "La PWA doit autoriser portrait et paysage");
assert.match(serviceWorker, /surclassement-krono-plus-v10/, "Le cache PWA doit être actualisé");
assert.match(serviceWorker, /"\/tarifs-base\.json"/, "La base tarifaire doit être disponible hors connexion");
assert.match(serviceWorker, /"\/tarifs-secours\.css"/, "Le secours CSS doit être disponible hors connexion");
assert.match(appHtml, /<h1 class="brand-title">/, "Le calculateur doit avoir un titre principal sémantique");
assert.match(appHtml, /<h2 class="panel-title" id="selection-title">/, "Le formulaire doit avoir un titre de niveau 2");
assert.match(appHtml, /<h2 class="surclassement-eyebrow" id="result-title">/, "Le résultat doit avoir un titre de niveau 2");
assert.equal((appHtml.match(/<h3 class="fare-head">/g) ?? []).length, 2, "Les deux classes doivent être des sous-titres de niveau 3");
assert.match(appHtml, /@media \(min-width:900px\).*grid-template-columns:minmax\(340px,.85fr\) minmax\(0,1.15fr\)/s, "Le mode ordinateur doit utiliser deux colonnes");
assert.match(tariffTableHtml, /<h1>Base tarifaire<\/h1>/, "La page tarifaire doit avoir un titre principal");
assert.ok((tariffTableHtml.match(/<h2/g) ?? []).length >= 3, "La page tarifaire doit avoir une hiérarchie de sections");

// Règle tarifaire confirmée (relevés Trainline + TER AURA) : l'écart 1re/2de
// des cartes Familles Nombreuses est identique quel que soit le taux
// (30/40/50/75 %), sauf quand le plancher de 1,20 € s'applique à la 2de
// classe d'un palier — auquel cas l'écart ne peut que se réduire.
const familyTiers = ["famille-nombreuse-30", "famille-nombreuse-40", "famille-nombreuse-50", "famille-nombreuse-75"];
for (const [key, route] of Object.entries(data.pairs)) {
  const [refSecond, refFirst] = route.fares["famille-nombreuse-30"];
  assert.ok(refSecond > FLOOR_CENTS, `Familles Nombreuses 30 % ne doit jamais toucher le plancher (référence invalide) : ${key}`);
  const refSurcharge = refFirst - refSecond;
  for (const tier of familyTiers.slice(1)) {
    const [second, first] = route.fares[tier];
    const surcharge = first - second;
    if (second === FLOOR_CENTS) {
      assert.ok(surcharge <= refSurcharge, `Écart Familles Nombreuses anormalement élevé malgré le plancher : ${key} / ${tier}`);
    } else {
      assert.equal(surcharge, refSurcharge, `Écart 1re/2de Familles Nombreuses non constant : ${key} / ${tier}`);
    }
  }
}

const directedRoutes = data.stations.length * (data.stations.length - 1);
const fareStates = directedRoutes * data.discounts.length;
console.log(`Données vérifiées : ${data.stations.length} gares, ${directedRoutes} trajets orientés, ${fareStates} états tarifaires, ${fareStates * 2} montants et ${fareStates} surclassements.`);
