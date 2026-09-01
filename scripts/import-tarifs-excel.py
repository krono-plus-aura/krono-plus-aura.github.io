#!/usr/bin/env python3
"""Convertit le classeur tarifaire validé vers tarifs-base.json.

Le script n'utilise aucune bibliothèque externe et ne calcule aucun tarif.
Il recopie uniquement les colonnes Prix 2de et Prix 1re du classeur, après
avoir vérifié que toutes les combinaisons relation/profil sont présentes une
et une seule fois.
"""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
import zipfile
from decimal import Decimal, InvalidOperation
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree as ET


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"x": MAIN_NS, "r": REL_NS, "p": PKG_REL_NS}
CELL_RE = re.compile(r"^([A-Z]+)([0-9]+)$")


class ImportErrorWithDetails(ValueError):
    """Erreur de validation destinée à être affichée telle quelle."""


def column_number(reference: str) -> int:
    match = CELL_RE.match(reference)
    if not match:
        raise ImportErrorWithDetails(f"Référence de cellule Excel invalide : {reference}")
    value = 0
    for character in match.group(1):
        value = value * 26 + ord(character) - 64
    return value


def text_nodes(element: ET.Element | None) -> str:
    if element is None:
        return ""
    return "".join(node.text or "" for node in element.iter(f"{{{MAIN_NS}}}t"))


def normalize_target(target: str) -> str:
    target = target.lstrip("/")
    if target.startswith("xl/"):
        return target
    return str(PurePosixPath("xl") / target)


def worksheet_path(archive: zipfile.ZipFile, sheet_name: str) -> str:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    relation_id = None
    for sheet in workbook.findall("x:sheets/x:sheet", NS):
        if sheet.get("name") == sheet_name:
            relation_id = sheet.get(f"{{{REL_NS}}}id")
            break
    if not relation_id:
        raise ImportErrorWithDetails(f"Feuille Excel introuvable : {sheet_name}")
    for relation in relationships.findall("p:Relationship", NS):
        if relation.get("Id") == relation_id:
            return normalize_target(relation.get("Target", ""))
    raise ImportErrorWithDetails(f"Fichier XML introuvable pour la feuille {sheet_name}")


def shared_strings(archive: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return [text_nodes(item) for item in root.findall("x:si", NS)]


def read_sheet(path: Path, sheet_name: str) -> dict[int, dict[int, str | None]]:
    try:
        archive = zipfile.ZipFile(path)
    except (OSError, zipfile.BadZipFile) as error:
        raise ImportErrorWithDetails(f"Le fichier Excel ne peut pas être ouvert : {error}") from error
    with archive:
        strings = shared_strings(archive)
        root = ET.fromstring(archive.read(worksheet_path(archive, sheet_name)))
        rows: dict[int, dict[int, str | None]] = {}
        for row in root.findall("x:sheetData/x:row", NS):
            row_number = int(row.get("r", "0"))
            values: dict[int, str | None] = {}
            for cell in row.findall("x:c", NS):
                reference = cell.get("r", "")
                cell_type = cell.get("t")
                raw = cell.findtext("x:v", default="", namespaces=NS)
                if cell_type == "s":
                    try:
                        value = strings[int(raw)]
                    except (ValueError, IndexError) as error:
                        raise ImportErrorWithDetails(
                            f"Chaîne partagée invalide dans la cellule {reference}"
                        ) from error
                elif cell_type == "inlineStr":
                    value = text_nodes(cell.find("x:is", NS))
                else:
                    value = raw
                values[column_number(reference)] = value
            rows[row_number] = values
        return rows


def to_cents(raw_value: str | None, cell_name: str) -> int:
    if raw_value is None or str(raw_value).strip() == "":
        raise ImportErrorWithDetails(f"Tarif manquant dans la cellule {cell_name}")
    try:
        euros = Decimal(str(raw_value).strip().replace(",", "."))
    except InvalidOperation as error:
        raise ImportErrorWithDetails(f"Tarif non numérique dans la cellule {cell_name}") from error
    cents = euros * 100
    if not cents.is_finite() or cents != cents.to_integral_value():
        raise ImportErrorWithDetails(
            f"Tarif avec plus de deux décimales dans la cellule {cell_name} : {raw_value}"
        )
    value = int(cents)
    if value <= 0:
        raise ImportErrorWithDetails(f"Tarif non positif dans la cellule {cell_name} : {raw_value}")
    if value < 120:
        raise ImportErrorWithDetails(
            f"Tarif inférieur au plancher de 1,20 € dans la cellule {cell_name} : {raw_value}"
        )
    return value


def euro(cents: int) -> str:
    return f"{cents / 100:.2f}".replace(".", ",") + " €"


def import_tariffs(excel_path: Path, base_path: Path) -> tuple[dict, list[dict], str]:
    try:
        base = json.loads(base_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ImportErrorWithDetails(f"La base JSON de référence est illisible : {error}") from error

    tariff_rows = read_sheet(excel_path, "Tarifs")
    summary_rows = read_sheet(excel_path, "Résumé")
    headers = {str(value): column for column, value in tariff_rows.get(4, {}).items() if value}
    required_headers = [
        "Départ",
        "Arrivée",
        "Prix 2de (€)",
        "Prix 1re (€)",
        "Identifiant profil",
        "Clé relation",
    ]
    missing_headers = [header for header in required_headers if header not in headers]
    if missing_headers:
        raise ImportErrorWithDetails(
            "Colonnes absentes de la feuille Tarifs : " + ", ".join(missing_headers)
        )

    profile_ids = [profile["id"] for profile in base.get("profiles", [])]
    pair_keys = list(base.get("pairs", {}))
    expected = {(pair_key, profile_id) for pair_key in pair_keys for profile_id in profile_ids}
    seen: dict[tuple[str, str], dict] = {}

    for row_number in sorted(number for number in tariff_rows if number >= 5):
        row = tariff_rows[row_number]
        pair_key = str(row.get(headers["Clé relation"], "") or "").strip()
        profile_id = str(row.get(headers["Identifiant profil"], "") or "").strip()
        if not pair_key and not profile_id:
            continue
        if not pair_key or not profile_id:
            raise ImportErrorWithDetails(
                f"Ligne {row_number} incomplète : clé relation ou identifiant profil absent"
            )
        combination = (pair_key, profile_id)
        if combination in seen:
            raise ImportErrorWithDetails(
                f"Doublon ligne {row_number} : {pair_key} / {profile_id}"
            )
        second = to_cents(row.get(headers["Prix 2de (€)"]), f"F{row_number}")
        first = to_cents(row.get(headers["Prix 1re (€)"]), f"G{row_number}")
        if first < second:
            raise ImportErrorWithDetails(
                f"Ligne {row_number} : le prix 1re est inférieur au prix 2de"
            )
        seen[combination] = {
            "second": second,
            "first": first,
            "departure": str(row.get(headers["Départ"], "") or "").strip(),
            "arrival": str(row.get(headers["Arrivée"], "") or "").strip(),
            "row": row_number,
        }

    found = set(seen)
    extras = sorted(found - expected)
    missing = sorted(expected - found)
    if extras or missing:
        details = []
        if extras:
            details.append("combinaisons inconnues : " + ", ".join(f"{a}/{b}" for a, b in extras[:10]))
        if missing:
            details.append("combinaisons absentes : " + ", ".join(f"{a}/{b}" for a, b in missing[:10]))
        raise ImportErrorWithDetails("Structure Excel non conforme ; " + " ; ".join(details))

    updated = copy.deepcopy(base)
    changes: list[dict] = []
    profiles_by_id = {profile["id"]: profile for profile in base["profiles"]}
    for pair_key, profile_id in sorted(expected):
        entry = seen[(pair_key, profile_id)]
        before = base["pairs"][pair_key]["fares"][profile_id]
        after = [entry["second"], entry["first"]]
        updated["pairs"][pair_key]["fares"][profile_id] = after
        if before != after:
            changes.append(
                {
                    "pair": pair_key,
                    "route": f"{entry['departure']} → {entry['arrival']}",
                    "profile": profile_id,
                    "label": profiles_by_id[profile_id]["label"],
                    "row": entry["row"],
                    "before": before,
                    "after": after,
                }
            )

    excel_year = summary_rows.get(5, {}).get(2)
    if excel_year and int(Decimal(excel_year)) != int(base["meta"]["year"]):
        raise ImportErrorWithDetails(
            "L'année du classeur ne correspond pas à la base JSON. "
            "Un changement d'année nécessite une validation technique complète."
        )
    excel_version = str(summary_rows.get(6, {}).get(2, "") or "").strip()
    if excel_version:
        updated["meta"]["version"] = excel_version
    if changes:
        updated["meta"]["revision"] = int(base["meta"].get("revision", 0)) + 1

    report_lines = [
        "# Résumé de la mise à jour tarifaire",
        "",
        "## Résultat",
        "",
        "- Structure Excel : conforme",
        f"- Gares : {len(base['stations'])}",
        f"- Relations : {len(pair_keys)}",
        f"- Profils : {len(profile_ids)}",
        f"- Lignes contrôlées : {len(seen)}",
        f"- Montants contrôlés : {len(seen) * 2}",
        "- Vérification technique complète : réussie",
        f"- Lignes tarifaires modifiées : {len(changes)}",
        f"- Version des données : {base['meta']['version']} → {updated['meta']['version']}",
        f"- Révision technique : {base['meta']['revision']} → {updated['meta']['revision']}",
        "",
    ]
    if changes:
        report_lines.extend(
            [
                "## Tarifs modifiés et contrôlés automatiquement",
                "",
                "| Ligne Excel | Relation | Profil | 2de avant | 2de après | 1re avant | 1re après |",
                "| ---: | --- | --- | ---: | ---: | ---: | ---: |",
            ]
        )
        for change in changes:
            report_lines.append(
                "| {row} | {route} | {label} | {b2} | {a2} | {b1} | {a1} |".format(
                    row=change["row"],
                    route=change["route"].replace("|", "/"),
                    label=change["label"].replace("|", "/"),
                    b2=euro(change["before"][0]),
                    a2=euro(change["after"][0]),
                    b1=euro(change["before"][1]),
                    a1=euro(change["after"][1]),
                )
            )
    else:
        report_lines.extend(["## Information", "", "Aucun tarif n'a changé."])
    report_lines.extend(
        [
            "",
            "## Règle de sécurité",
            "",
            "Le convertisseur a uniquement recopié les deux prix présents dans Excel. "
            "Il n'a calculé, arrondi, déduit ni complété aucun tarif.",
            "Les informations de provenance sont conservées sans modification. Une provenance "
            "commerciale à confirmer ne devient pas confirmée par ce contrôle technique.",
            "",
        ]
    )
    return updated, changes, "\n".join(report_lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Importer les tarifs validés depuis Excel")
    parser.add_argument("--excel", required=True, type=Path)
    parser.add_argument("--base", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--allow-no-change", action="store_true")
    args = parser.parse_args()

    try:
        updated, changes, report = import_tariffs(args.excel, args.base)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(
            json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        args.report.write_text(report, encoding="utf-8")
        print(report)
        if not changes and not args.allow_no_change:
            print("Aucun tarif modifié : aucune publication à préparer.", file=sys.stderr)
            return 2
        return 0
    except ImportErrorWithDetails as error:
        print(f"MISE À JOUR BLOQUÉE : {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
