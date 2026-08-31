import { readFile, writeFile } from "node:fs/promises";

const appUrl = new URL("../public/app.html", import.meta.url);
const tableUrl = new URL("../public/tarifs.html", import.meta.url);
const baseUrl = new URL("../public/tarifs-base.json", import.meta.url);
const fallbackUrl = new URL("../public/tarifs-secours.css", import.meta.url);
const swUrl = new URL("../public/sw.js", import.meta.url);

const data = JSON.parse(await readFile(baseUrl, "utf8"));
let appHtml = await readFile(appUrl, "utf8");
let tableHtml = await readFile(tableUrl, "utf8");
let serviceWorker = await readFile(swUrl, "utf8");
const relationCount = Object.keys(data.pairs).length;

// Le cache hors ligne change de nom à chaque campagne tarifaire : un agent qui a
// installé l'app avant une mise à jour reçoit donc bien un nouveau Service Worker
// au lieu de continuer à servir une base tarifaire périmée depuis le cache.
if (!data.meta.version || !Number.isInteger(data.meta.revision)) {
  throw new Error("meta.version et meta.revision (entier) sont obligatoires pour nommer le cache hors ligne.");
}
const buildId = `${data.meta.version}-r${data.meta.revision}`;
const cacheNamePattern = /const CACHE_NAME = "krono-[^"]*";/;
if (!cacheNamePattern.test(serviceWorker)) {
  throw new Error("public/sw.js : ligne CACHE_NAME introuvable ou déjà modifiée dans un format inattendu.");
}
serviceWorker = serviceWorker.replace(cacheNamePattern, `const CACHE_NAME = "krono-${buildId}";`);

appHtml = appHtml
  .replace(/<footer class="app-footer">.*?<\/footer>/, `<footer class="app-footer">Tarifs TER ${data.meta.year}</footer>`);

tableHtml = tableHtml
  .replace(/(<span class="year-badge" id="year-badge">).*?(<\/span>)/, `$1Référence ${data.meta.year}$2`)
  .replace(/(<strong id="relation-count">).*?(<\/strong>)/, `$1${relationCount}$2`)
  .replace(/(<strong id="journey-count">).*?(<\/strong>)/, `$1${relationCount * 2}$2`)
  .replace(/(<strong id="profile-count">).*?(<\/strong>)/, `$1${data.profiles.length}$2`)
  .replaceAll("data.discounts", "data.profiles")
  .replace(
    "option.textContent=discount.label",
    'option.textContent=(discount.travelerType==="child"?"Enfant · ":"Adulte · ")+discount.label',
  );

const fallbackCss = [
  `/* FICHIER GÉNÉRÉ — source unique : /tarifs-base.json — ${data.meta.version} */`,
  "html:not(.js-ready) #result-card{display:none!important}",
  "",
].join("\n");

await Promise.all([
  writeFile(appUrl, appHtml),
  writeFile(tableUrl, tableHtml),
  writeFile(fallbackUrl, fallbackCss),
  writeFile(swUrl, serviceWorker),
]);

console.log(`Application synchronisée : ${relationCount} relations, ${data.profiles.length} profils, cache hors ligne krono-${buildId}.`);
