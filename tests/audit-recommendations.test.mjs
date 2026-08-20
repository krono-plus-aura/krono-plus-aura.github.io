import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [app, fallback, manifestText, serviceWorker, workflow, home] = await Promise.all([
  read("public/app.html"),
  read("public/tarifs-secours.css"),
  read("public/manifest.webmanifest"),
  read("public/sw.js"),
  read(".github/workflows/publication.yml"),
  read("public/index.html"),
]);
const manifest = JSON.parse(manifestText);

test("la base tarifaire reste la source unique", () => {
  assert.match(app, /fetch\("\/tarifs-base\.json"/);
  assert.match(app, /href="\/tarifs-secours\.css"/);
  assert.doesNotMatch(app, /href="\/tarifs\.html"/);
  assert.doesNotMatch(app, /--p2-none:/);
  assert.match(fallback, /FICHIER GÉNÉRÉ — source unique : \/tarifs-base\.json/);
  assert.equal((fallback.match(/--p2-none:/g) ?? []).length, 36);
});

test("le mode ordinateur et la hiérarchie de titres sont présents", () => {
  assert.match(app, /@media \(min-width:900px\)/);
  assert.match(app, /grid-template-columns:minmax\(340px,.85fr\) minmax\(0,1.15fr\)/);
  assert.equal((app.match(/<h1\b/g) ?? []).length, 1);
  assert.ok((app.match(/<h2\b/g) ?? []).length >= 3);
  assert.equal((app.match(/<h3\b/g) ?? []).length, 2);
});

test("la PWA accepte toutes les orientations et garde le secours hors ligne", () => {
  assert.equal(manifest.orientation, "any");
  assert.match(serviceWorker, /"\/tarifs-secours\.css"/);
});

test("les contrôles et la publication sont automatiques sur GitHub", () => {
  assert.match(workflow, /sync-app-from-tariff-base\.mjs/);
  assert.match(workflow, /verify-app-data\.mjs/);
  assert.match(workflow, /audit-recommendations\.test\.mjs/);
  assert.match(workflow, /upload-pages-artifact/);
  assert.match(workflow, /deploy-pages/);
  assert.match(workflow, /path: public/);
});

test("la racine du site redirige vers le simulateur", () => {
  assert.match(home, /url=\/app\.html/);
  assert.match(home, /location\.replace\("\/app\.html"\)/);
});
