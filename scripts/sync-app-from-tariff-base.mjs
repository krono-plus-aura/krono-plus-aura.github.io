import { readFile, writeFile } from "node:fs/promises";

const appUrl = new URL("../public/app.html", import.meta.url);
const tableUrl = new URL("../public/tarifs.html", import.meta.url);
const baseUrl = new URL("../public/tarifs-base.json", import.meta.url);
const fallbackUrl = new URL("../public/tarifs-secours.css", import.meta.url);

const data = JSON.parse(await readFile(baseUrl, "utf8"));
let appHtml = await readFile(appUrl, "utf8");
let tableHtml = await readFile(tableUrl, "utf8");

const money = (cents) => `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, "0")} €`;
const amount = (cents) => `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, "0")}`;
const cssString = (value) => JSON.stringify(String(value));
const htmlText = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");
const selector = (from, to) =>
  `html:not(.js-ready) #app:has(#from option[value="${from}"]:checked):has(#to option[value="${to}"]:checked)`;

const stationIndex = new Map(data.stations.map((station, index) => [station.id, index]));
const pairKey = (from, to) => stationIndex.get(from) < stationIndex.get(to)
  ? `${from}|${to}`
  : `${to}|${from}`;

function fareRule(key, route) {
  const [from, to] = key.split("|");
  let rule = `${selector(from, to)},${selector(to, from)}{`;
  for (const discount of data.discounts) {
    const [second, first] = route.fares[discount.id];
    rule += `--p2-${discount.id}:${cssString(money(second))};--p1-${discount.id}:${cssString(money(first))};--sur-${discount.id}:${cssString(amount(first - second))};`;
  }
  const [fullSecond, fullFirst] = route.fares.none;
  return `${rule}--fallback-p2-none:${cssString(money(fullSecond))};--fallback-p1-none:${cssString(money(fullFirst))}}`;
}

const offset = (digit) => digit === 0 ? "0em" : `-${(digit * 1.06).toFixed(2)}em`;
function rollerValues(cents) {
  const euros = Math.floor(cents / 100);
  const decimals = String(cents % 100).padStart(2, "0");
  return {
    y0: offset(euros >= 10 ? Math.floor(euros / 10) % 10 : 0),
    y1: offset(euros % 10),
    y2: offset(Number(decimals[0])),
    y3: offset(Number(decimals[1])),
    width: euros >= 10 ? ".61em" : "0em",
  };
}

function rollerRule(key, route) {
  const [from, to] = key.split("|");
  let rule = `${selector(from, to)},${selector(to, from)}{`;
  for (const discount of data.discounts) {
    const [second, first] = route.fares[discount.id];
    const values = rollerValues(first - second);
    rule += `--fy0-${discount.id}:${values.y0};--fy1-${discount.id}:${values.y1};--fy2-${discount.id}:${values.y2};--fy3-${discount.id}:${values.y3};--ftw-${discount.id}:${values.width};`;
  }
  return `${rule}}`;
}

const relations = Object.entries(data.pairs);
const defaultFrom = data.stations[0];
const defaultTo = data.stations.at(-1);
const defaultRoute = data.pairs[pairKey(defaultFrom.id, defaultTo.id)];
const [defaultSecond, defaultFirst] = defaultRoute.fares.none;

const stationRules = data.stations.flatMap((station) => [
  `html:not(.js-ready) #app:has(#from option[value="${station.id}"]:checked){--fallback-from:${cssString(station.name)}}`,
  `html:not(.js-ready) #app:has(#to option[value="${station.id}"]:checked){--fallback-to:${cssString(station.name)}}`,
]);
const sameStationRules = data.stations.flatMap((station) => [
  `${selector(station.id, station.id)} #result-card{display:none!important}`,
  `${selector(station.id, station.id)} #same-station{display:flex!important}`,
]);
const discountRules = data.discounts.map((discount) =>
  `html:not(.js-ready) #app:has(#discount-card option[value="${discount.id}"]:checked){--fallback-p2:var(--p2-${discount.id});--fallback-p1:var(--p1-${discount.id});--fallback-sur:var(--sur-${discount.id});--fallback-status:${cssString(discount.status)}}`,
);
const rollerDiscountRules = data.discounts.map((discount) =>
  `html:not(.js-ready) #app:has(#discount-card option[value="${discount.id}"]:checked){--fy0:var(--fy0-${discount.id});--fy1:var(--fy1-${discount.id});--fy2:var(--fy2-${discount.id});--fy3:var(--fy3-${discount.id});--ftw:var(--ftw-${discount.id})}`,
);

const fallbackCss = [
  `/* FICHIER GÉNÉRÉ — source unique : /tarifs-base.json — ${data.meta.version} */`,
  `html:not(.js-ready) #journey-from::after{content:var(--fallback-from,${cssString(defaultFrom.name)})}`,
  `html:not(.js-ready) #journey-to::after{content:var(--fallback-to,${cssString(defaultTo.name)})}`,
  `html:not(.js-ready) #second-price::after{content:var(--fallback-p2,${cssString(money(defaultSecond))})}`,
  `html:not(.js-ready) #first-price::after{content:var(--fallback-p1,${cssString(money(defaultFirst))})}`,
  `html:not(.js-ready) #second-original s::after{content:var(--fallback-p2-none,${cssString(money(defaultSecond))})}`,
  `html:not(.js-ready) #first-original s::after{content:var(--fallback-p1-none,${cssString(money(defaultFirst))})}`,
  `html:not(.js-ready) #discount-status::after{content:var(--fallback-status,${cssString(data.discounts[0].status)})}`,
  'html:not(.js-ready) #app:not(:has(#discount-card option[value="none"]:checked)) .fare-original{display:block}',
  ...stationRules,
  ...sameStationRules,
  ...relations.map(([key, route]) => fareRule(key, route)),
  ...discountRules,
  "html:not(.js-ready) .surclassement-value{color:#fff!important;text-shadow:none!important}",
  ".css-fallback-roller{display:none;align-items:center;height:var(--roller-step);white-space:nowrap}",
  "html:not(.js-ready) .css-fallback-roller{display:inline-flex}",
  "html:not(.js-ready) #roller{display:none!important}",
  "html.js-ready .css-fallback-roller{display:none!important}",
  ".fallback-roll{position:relative;display:inline-block;width:.61em;height:var(--roller-step);overflow:hidden;vertical-align:bottom;line-height:var(--roller-step);transform:translateZ(0);contain:layout paint}",
  ".fallback-roll.fallback-tens{width:var(--ftw,0em);transition:width 360ms cubic-bezier(.18,.82,.24,1)}",
  ".fallback-roll-track{position:absolute;top:0;left:0;width:100%;will-change:transform;backface-visibility:hidden;-webkit-backface-visibility:hidden;transition:transform 620ms cubic-bezier(.18,.82,.24,1)}",
  ".fallback-roll-track>i{display:flex;align-items:center;justify-content:center;width:100%;height:var(--roller-step);line-height:var(--roller-step);font:inherit;font-style:normal}",
  ".fallback-tens .fallback-roll-track{transform:translate3d(0,var(--fy0,0em),0);transition-delay:0ms}",
  ".fallback-ones .fallback-roll-track{transform:translate3d(0,var(--fy1,0em),0);transition-delay:22ms}",
  ".fallback-d1 .fallback-roll-track{transform:translate3d(0,var(--fy2,0em),0);transition-delay:44ms}",
  ".fallback-d2 .fallback-roll-track{transform:translate3d(0,var(--fy3,0em),0);transition-delay:66ms}",
  "@media (prefers-reduced-motion:reduce){.fallback-roll,.fallback-roll-track{transition:none!important}}",
  ...relations.map(([key, route]) => rollerRule(key, route)),
  ...rollerDiscountRules,
  "",
].join("\n");

const legacyStart = "/* === STABLE 2.1 : moteur CSS de secours (WebView / aperçu bloquant JavaScript) === */";
const legacyEnd = "/* === AGC AURA premium : illustration centrale sans traits latéraux === */";
if (appHtml.includes(legacyStart)) {
  const startAt = appHtml.indexOf(legacyStart);
  const endAt = appHtml.indexOf(legacyEnd, startAt);
  if (endAt < 0) throw new Error("Fin du moteur CSS historique introuvable");
  appHtml = appHtml.slice(0, startAt) + appHtml.slice(endAt);
}

const stationOptions = (selectedId) => data.stations
  .map((station) => `<option value="${station.id}"${station.id === selectedId ? " selected" : ""}>${htmlText(station.name)}</option>`)
  .join("");
const discountOptions = data.discounts
  .map((discount, index) => `<option value="${discount.id}"${index === 0 ? " selected" : ""}>${htmlText(discount.label)}</option>`)
  .join("");

appHtml = appHtml
  .replace(/(<select id="from"[^>]*>)[\s\S]*?(<\/select>)/, `$1${stationOptions(defaultFrom.id)}$2`)
  .replace(/(<select id="to"[^>]*>)[\s\S]*?(<\/select>)/, `$1${stationOptions(defaultTo.id)}$2`)
  .replace(/(<select id="discount-card"[^>]*>)[\s\S]*?(<\/select>)/, `$1${discountOptions}$2`)
  .replace(/(<strong id="tariff-base-label">).*?(<\/strong>)/, `$1${data.meta.label}$2`)
  .replace(/(<small id="tariff-base-count">).*?(<\/small>)/, `$1Base tarifaire · ${relations.length} relations dans les deux sens$2`)
  .replace(/aria-label="Consulter la base tarifaire \d{4}"/, `aria-label="Consulter la base tarifaire ${data.meta.year}"`)
  .replace(/<!-- BASE TARIFAIRE UNIQUE : \/tarifs-base\.json — .*? -->/, `<!-- BASE TARIFAIRE UNIQUE : /tarifs-base.json — ${data.meta.version} -->`);

tableHtml = tableHtml
  .replace(/(<span class="year-badge" id="year-badge">).*?(<\/span>)/, `$1Référence ${data.meta.year}$2`)
  .replace(/(<strong id="relation-count">).*?(<\/strong>)/, `$1${relations.length}$2`)
  .replace(/(<strong id="journey-count">).*?(<\/strong>)/, `$1${relations.length * 2}$2`)
  .replace(/(<strong id="profile-count">).*?(<\/strong>)/, `$1${data.discounts.length}$2`);

await Promise.all([
  writeFile(appUrl, appHtml),
  writeFile(tableUrl, tableHtml),
  writeFile(fallbackUrl, fallbackCss),
]);

console.log(`Application synchronisée avec ${data.meta.label} : ${relations.length} relations et secours CSS généré.`);
