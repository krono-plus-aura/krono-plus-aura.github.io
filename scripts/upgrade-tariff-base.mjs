import { readFile, writeFile } from "node:fs/promises";

const baseUrl = new URL("../public/tarifs-base.json", import.meta.url);
const companionChecksUrl = new URL("./illico-companion-checks-2026-08-29.json", import.meta.url);
const [data, companionChecks] = await Promise.all([
  readFile(baseUrl, "utf8").then(JSON.parse),
  readFile(companionChecksUrl, "utf8").then(JSON.parse),
]);

const ceilToTen = (cents) => Math.ceil(cents / 10) * 10;
const childFare = (cents) => Math.max(120, ceilToTen(cents / 2));

const profile = (id, travelerType, label, status, sourceRule) => ({
  id,
  travelerType,
  label,
  status,
  sourceRule,
});

data.meta = {
  ...data.meta,
  label: "Tarifs TER 2026 — profils adulte et enfant",
  version: "2026-08-24",
  revision: 6,
  profileCount: 19,
  travelerTypes: ["adult", "child"],
  childDefinition: "Enfant de 4 à 11 ans inclus",
  sources: [
    {
      label: "SNCF Connect — simulations tarifaires TER",
      url: "https://www.sncf-connect.com/home/search",
      checkedAt: "2026-08-24",
    },
    {
      label: "SNCF Connect — tarifs spéciaux SNCF",
      url: "https://www.sncf-connect.com/fr-fr/aide/les-tarifs-speciaux-sncf",
      checkedAt: "2026-08-24",
    },
    {
      label: "TER Auvergne-Rhône-Alpes — carte illico LIBERTÉ et accompagnants",
      url: "https://www.ter.sncf.com/auvergne-rhone-alpes/tarifs-cartes/cartes-reduction/illico-liberte",
      checkedAt: "2026-08-24",
    },
    {
      label: "TER Auvergne-Rhône-Alpes — illico LIBERTÉ JEUNES",
      url: "https://www.ter.sncf.com/auvergne-rhone-alpes/tarifs-cartes/cartes-reduction/illico-liberte-jeunes",
      checkedAt: "2026-08-24",
    },
  ],
  audit: {
    relations: 36,
    directionMode: "symmetric",
    directChecks: [
      "Lyon Part-Dieu ↔ Genève — Carte Famille Militaire adulte et enfant",
      "Lyon Part-Dieu ↔ Ambérieu-en-Bugey — Carte Famille Militaire adulte",
      "Lyon Part-Dieu ↔ Genève — enfant FN 30 %, 40 %, 50 % et 75 %",
      "Ambérieu-en-Bugey ↔ Tenay-Hauteville — enfant FN 50 % et 75 %",
      "Lyon Part-Dieu ↔ Meximieux – Pérouges — plancher enfant FN 75 %",
      "36 relations — enfant accompagnant illico LIBERTÉ, TER directs du samedi 29 août 2026",
    ],
    controls: [
      "Deux montants positifs par profil et par relation",
      "Tarif 1re supérieur ou égal au tarif 2de",
      "Plancher de perception enfant réduit fixé à 1,20 €",
      "Carte Militaire 1re et 2de fusionnées dans un profil unique",
      "Tarif adulte accompagnant illico LIBERTÉ identique au tarif du porteur le week-end",
      "Aucun profil illico LIBERTÉ JEUNES proposé aux enfants de 4 à 11 ans",
      "Résultats identiques dans les deux sens de circulation",
    ],
  },
};

data.profiles = [
  profile("adult-none", "adult", "Aucune — Plein tarif", "Plein tarif adulte appliqué.", "Base adulte 2026 contrôlée"),
  profile("adult-illico-liberte-weekday", "adult", "illico LIBERTÉ — Semaine (-25 %)", "Réduction illico LIBERTÉ Semaine appliquée.", "Tarif adulte existant"),
  profile("adult-illico-liberte-weekend", "adult", "illico LIBERTÉ — Week-end / Jour férié (-50 %)", "Tarif illico LIBERTÉ Week-end / Jour férié appliqué.", "50 % du tarif normal le week-end et les jours fériés"),
  profile("adult-illico-liberte-weekend-companion", "adult", "illico LIBERTÉ — Accompagnant, Week-end / Jour férié (-50 %)", "Tarif accompagnant illico LIBERTÉ Week-end / Jour férié appliqué.", "Même réduction et mêmes montants que le porteur ; jusqu’à 3 accompagnants"),
  profile("adult-illico-jeunes", "adult", "illico LIBERTÉ JEUNES (-50 %)", "Réduction illico LIBERTÉ JEUNES appliquée.", "Tarif adulte existant"),
  profile("adult-liberte-nationale", "adult", "Carte Liberté SNCF (-25 %)", "Réduction Carte Liberté SNCF appliquée.", "Tarif adulte existant"),
  profile("adult-famille-nombreuse-30", "adult", "Carte Familles Nombreuses (-30 %)", "Réduction Familles Nombreuses 30 % appliquée.", "Tarif adulte directement contrôlé"),
  profile("adult-famille-nombreuse-40", "adult", "Carte Familles Nombreuses (-40 %)", "Réduction Familles Nombreuses 40 % appliquée.", "Tarif adulte directement contrôlé"),
  profile("adult-famille-nombreuse-50", "adult", "Carte Familles Nombreuses (-50 %)", "Réduction Familles Nombreuses 50 % appliquée.", "Tarif adulte directement contrôlé"),
  profile("adult-famille-nombreuse-75", "adult", "Carte Familles Nombreuses (-75 %)", "Réduction Familles Nombreuses 75 % appliquée.", "Tarif adulte directement contrôlé"),
  profile("adult-military", "adult", "Carte Militaire (-75 %)", "Tarif Carte Militaire appliqué.", "Même assiette et même taux que FN 75 % sur TER ; cartes Militaire 1re et 2de fusionnées"),
  profile("adult-family-military", "adult", "Carte Famille Militaire (-40 %)", "Tarif Carte Famille Militaire appliqué.", "60 % du plein tarif, arrondi SNCF au décime supérieur"),
  profile("child-none", "child", "Aucune — Tarif Enfant 4–11 ans", "Tarif Enfant 4–11 ans appliqué.", "50 % du plein tarif adulte, arrondi SNCF au décime supérieur"),
  profile("child-illico-liberte-weekend-companion", "child", "illico LIBERTÉ — Accompagnant, Week-end / Jour férié", "Tarif enfant accompagnant illico LIBERTÉ appliqué.", "36 relations contrôlées dans SNCF Connect avec le profil régional Accompagnant"),
  profile("child-family-military", "child", "Carte Famille Militaire", "Tarif enfant avec Carte Famille Militaire appliqué.", "50 % du tarif adulte Famille Militaire, plancher 1,20 €"),
  profile("child-famille-nombreuse-30", "child", "Carte Familles Nombreuses (-30 %)", "Tarif enfant Familles Nombreuses 30 % appliqué.", "50 % du tarif adulte correspondant, arrondi SNCF et plancher 1,20 €"),
  profile("child-famille-nombreuse-40", "child", "Carte Familles Nombreuses (-40 %)", "Tarif enfant Familles Nombreuses 40 % appliqué.", "50 % du tarif adulte correspondant, arrondi SNCF et plancher 1,20 €"),
  profile("child-famille-nombreuse-50", "child", "Carte Familles Nombreuses (-50 %)", "Tarif enfant Familles Nombreuses 50 % appliqué.", "50 % du tarif adulte correspondant, arrondi SNCF et plancher 1,20 €"),
  profile("child-famille-nombreuse-75", "child", "Carte Familles Nombreuses (-75 %)", "Tarif enfant Familles Nombreuses 75 % appliqué.", "50 % du tarif adulte correspondant, arrondi SNCF et plancher 1,20 €"),
];

const legacyToAdult = {
  none: "adult-none",
  "illico-liberte-weekday": "adult-illico-liberte-weekday",
  "illico-liberte-weekend": "adult-illico-liberte-weekend",
  "illico-jeunes": "adult-illico-jeunes",
  "liberte-nationale": "adult-liberte-nationale",
  "famille-nombreuse-30": "adult-famille-nombreuse-30",
  "famille-nombreuse-40": "adult-famille-nombreuse-40",
  "famille-nombreuse-50": "adult-famille-nombreuse-50",
  "famille-nombreuse-75": "adult-famille-nombreuse-75",
};

const childExceptionOverrides = {
  "amberieu-en-bugey|tenay-hauteville": {
    "child-famille-nombreuse-75": [120, 180],
  },
};

for (const [key, route] of Object.entries(data.pairs)) {
  const legacyFares = route.fares;
  const fares = {};
  for (const [legacyId, adultId] of Object.entries(legacyToAdult)) {
    const source = legacyFares[legacyId] ?? legacyFares[adultId];
    if (!source) throw new Error(`Tarif adulte source manquant : ${key} / ${adultId}`);
    fares[adultId] = [...source];
  }

  fares["adult-illico-liberte-weekend-companion"] = [...fares["adult-illico-liberte-weekend"]];
  fares["adult-military"] = [...fares["adult-famille-nombreuse-75"]];
  fares["adult-family-military"] = fares["adult-none"].map((fare) => ceilToTen(fare * 0.6));
  fares["child-none"] = fares["adult-none"].map(childFare);
  const directCompanionCheck = companionChecks.relations[key]?.fares;
  if (!directCompanionCheck) throw new Error(`Contrôle direct illico accompagnant manquant : ${key}`);
  fares["child-illico-liberte-weekend-companion"] = [...directCompanionCheck];
  fares["child-family-military"] = fares["adult-family-military"].map(childFare);
  for (const rate of [30, 40, 50, 75]) {
    fares[`child-famille-nombreuse-${rate}`] = fares[`adult-famille-nombreuse-${rate}`].map(childFare);
  }

  Object.assign(fares, childExceptionOverrides[key] ?? {});
  route.fares = Object.fromEntries(data.profiles.map(({ id }) => [id, fares[id]]));
}

delete data.discounts;

await writeFile(baseUrl, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Base enrichie : ${Object.keys(data.pairs).length} relations × ${data.profiles.length} profils.`);
