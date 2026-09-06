import { readFile, writeFile } from "node:fs/promises";

// Ce script propage la base tarifaire vers les fichiers publiés.
// Règle absolue : AUCUN remplacement ne doit échouer en silence. Si un motif
// n'est plus trouvé (page retouchée, balise déplacée), le script s'arrête avec
// un message explicite plutôt que de publier une page restée sur l'ancienne
// année ou sur l'ancien nom de cache.

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

// Remplace un motif unique et vérifie que le remplacement a bien eu lieu.
function remplacer(contenu, motif, valeur, fichier, objet) {
  if (!motif.test(contenu)) {
    throw new Error(
      `${fichier} : impossible de mettre à jour ${objet}. Le motif attendu est introuvable ` +
      `(${motif}). La page a probablement été retouchée à la main : réaligner le motif ou la page.`,
    );
  }
  // Un contenu inchangé est normal : le fichier était déjà synchronisé.
  // Seul un motif introuvable est une anomalie, et il est signalé ci-dessus.
  return contenu.replace(motif, valeur);
}

// Le cache hors ligne change de nom à chaque campagne tarifaire : un agent qui a
// installé l'app avant une mise à jour reçoit donc bien un nouveau Service Worker
// au lieu de continuer à servir une base tarifaire périmée depuis le cache.
if (!data.meta.version || !Number.isInteger(data.meta.revision)) {
  throw new Error("meta.version et meta.revision (entier) sont obligatoires pour nommer le cache hors ligne.");
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(data.meta.version)) {
  throw new Error(
    `meta.version doit être une date au format AAAA-MM-JJ (reçu : "${data.meta.version}"). ` +
    "Dans le classeur Excel, la cellule « Version des données » doit être saisie en TEXTE, jamais en cellule de type date.",
  );
}
if (!Number.isInteger(data.meta.year)) {
  throw new Error("meta.year doit être une année entière.");
}
const buildId = `${data.meta.version}-r${data.meta.revision}`;
serviceWorker = remplacer(
  serviceWorker,
  /const CACHE_NAME = "krono-[^"]*";/,
  `const CACHE_NAME = "krono-${buildId}";`,
  "public/sw.js",
  "le nom du cache hors ligne",
);

// Le pied de page affiche l'année tarifaire. Le motif accepte les retours à la
// ligne : une page reformatée ne doit plus faire échouer la mise à jour en silence.
appHtml = remplacer(
  appHtml,
  /<footer class="app-footer">[\s\S]*?<\/footer>/,
  `<footer class="app-footer">Tarifs TER ${data.meta.year}</footer>`,
  "public/app.html",
  "l'année du pied de page",
);

// Page « base tarifaire » : valeurs affichées avant l'exécution du JavaScript.
tableHtml = remplacer(
  tableHtml,
  /(<span class="year-badge" id="year-badge">)[\s\S]*?(<\/span>)/,
  `$1Référence ${data.meta.year}$2`,
  "public/tarifs.html",
  "l'année de référence",
);
tableHtml = remplacer(
  tableHtml,
  /(<strong id="relation-count">)[\s\S]*?(<\/strong>)/,
  `$1${relationCount}$2`,
  "public/tarifs.html",
  "le nombre de relations",
);
tableHtml = remplacer(
  tableHtml,
  /(<strong id="journey-count">)[\s\S]*?(<\/strong>)/,
  `$1${relationCount * 2}$2`,
  "public/tarifs.html",
  "le nombre de trajets",
);
tableHtml = remplacer(
  tableHtml,
  /(<strong id="profile-count">)[\s\S]*?(<\/strong>)/,
  `$1${data.profiles.length}$2`,
  "public/tarifs.html",
  "le nombre de profils",
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

console.log(`Application synchronisée : ${relationCount} relations, ${data.profiles.length} profils, année ${data.meta.year}, cache hors ligne krono-${buildId}.`);
