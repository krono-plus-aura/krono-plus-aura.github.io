import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("le classeur de référence reproduit exactement la base JSON", async () => {
  const directory = await mkdtemp(join(tmpdir(), "krono-excel-"));
  const output = join(directory, "tarifs-base.json");
  const report = join(directory, "rapport.md");
  try {
    const result = spawnSync(
      "python3",
      [
        "scripts/import-tarifs-excel.py",
        "--excel",
        "gestion-tarifs/Base_tarifaire_KRONO_plus.xlsx",
        "--base",
        "public/tarifs-base.json",
        "--output",
        output,
        "--report",
        report,
        "--allow-no-change",
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.deepEqual(
      JSON.parse(await readFile(output, "utf8")),
      JSON.parse(await readFile("public/tarifs-base.json", "utf8")),
    );
    const reportText = await readFile(report, "utf8");
    assert.match(reportText, /Lignes contrôlées : 684/);
    assert.match(reportText, /Montants contrôlés : 1368/);
    assert.match(reportText, /Vérification technique complète : réussie/);
    assert.match(reportText, /Aucun tarif n'a changé/);
    assert.match(reportText, /informations de provenance sont conservées sans modification/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("le convertisseur bloque tout prix inférieur à 1,20 €", () => {
  const python = [
    "import runpy",
    "module = runpy.run_path('scripts/import-tarifs-excel.py')",
    "to_cents = module['to_cents']",
    "expected_error = module['ImportErrorWithDetails']",
    "assert to_cents('1.20', 'F5') == 120",
    "try:",
    "    to_cents('1.19', 'F5')",
    "except expected_error:",
    "    pass",
    "else:",
    "    raise AssertionError('Un prix inférieur à 1,20 € a été accepté')",
  ].join("\n");
  const result = spawnSync("python3", ["-c", python], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
