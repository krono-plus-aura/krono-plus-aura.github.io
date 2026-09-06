"""Scénarios de maintenance exécutés dans une copie temporaire du projet."""
import json
import runpy
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
module = runpy.run_path(str(ROOT / 'scripts/import-tarifs-excel.py'))
NS = module['NS']
MAIN = module['MAIN_NS']
original = ROOT / 'gestion-tarifs/Base_tarifaire_KRONO_plus.xlsx'


def change_cells(destination, changes):
    with zipfile.ZipFile(original) as source:
        paths = {module['worksheet_path'](source, sheet): cells for sheet, cells in changes.items()}
        with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as output:
            for entry in source.infolist():
                content = source.read(entry.filename)
                if entry.filename in paths:
                    tree = ET.fromstring(content)
                    for reference, value in paths[entry.filename].items():
                        cell = tree.find(f'.//x:c[@r="{reference}"]', NS)
                        assert cell is not None, reference
                        for child in list(cell):
                            cell.remove(child)
                        cell.attrib.pop('t', None)
                        if isinstance(value, tuple):
                            formula, cached = value
                            ET.SubElement(cell, f'{{{MAIN}}}f').text = formula
                            ET.SubElement(cell, f'{{{MAIN}}}v').text = cached
                        elif isinstance(value, str):
                            cell.set('t', 'inlineStr')
                            inline = ET.SubElement(cell, f'{{{MAIN}}}is')
                            ET.SubElement(inline, f'{{{MAIN}}}t').text = value
                        else:
                            ET.SubElement(cell, f'{{{MAIN}}}v').text = str(value)
                    content = ET.tostring(tree, encoding='utf-8', xml_declaration=True)
                output.writestr(entry, content)


def run(*args, cwd):
    result = subprocess.run(args, cwd=cwd, text=True, capture_output=True)
    assert result.returncode == 0, result.stdout + result.stderr


with tempfile.TemporaryDirectory(prefix='krono-scenarios-') as temporary:
    project = Path(temporary)
    for folder in ('public', 'scripts', 'gestion-tarifs'):
        shutil.copytree(ROOT / folder, project / folder)
    excel = project / 'gestion-tarifs/Base_tarifaire_KRONO_plus.xlsx'
    base_path = project / 'public/tarifs-base.json'
    baseline = json.loads(base_path.read_text())
    valid = {
        'sans modification': {},
        'hausse de prix': {'Tarifs': {'G5': 9.7}},
        'baisse au plancher': {'Tarifs': {'G5': 1.2}},
        'campagne suivante': {'Résumé': {'B5': baseline['meta']['year'] + 1, 'B6': '2027-01-15'}},
        'date Excel numérique': {'Résumé': {'B6': 46265}},
    }
    for name, cells in valid.items():
        base_path.write_text(json.dumps(baseline))
        change_cells(excel, cells)
        updated, changes, report = module['import_tariffs'](excel, base_path)
        base_path.write_text(json.dumps(updated))
        run('node', 'scripts/sync-app-from-tariff-base.mjs', cwd=project)
        run('node', 'scripts/verify-app-data.mjs', cwd=project)
        repeated, _, _ = module['import_tariffs'](excel, base_path)
        assert repeated == updated, f'{name} : une relance doit être idempotente'
        if changes or cells.get('Résumé'):
            if updated != baseline:
                assert updated['meta']['revision'] == baseline['meta']['revision'] + 1
        print('OK :', name, '+ relance identique')

    invalid = {
        'formule avec résultat enregistré': ({'Tarifs': {'G5': ('9.6*1', '9.6')}}, 'Formule interdite'),
        'prix sous le plancher': ({'Tarifs': {'G5': 1.19}}, '1,20'),
        'classes inversées': ({'Tarifs': {'G5': 99}}, 'inférieur'),
        'plus de deux décimales': ({'Tarifs': {'G5': 9.601}}, 'décimales'),
        'prix vide': ({'Tarifs': {'G5': ''}}, 'manquant'),
        'année décimale': ({'Résumé': {'B5': 2027.5}}, 'Année tarifaire'),
        'année en recul': ({'Résumé': {'B5': baseline['meta']['year'] - 1}}, 'antérieure'),
        'année aberrante': ({'Résumé': {'B5': 9999}}, 'invraisemblable'),
        'date inexistante': ({'Résumé': {'B6': '2027-02-30'}}, 'Date inexistante'),
        'date illisible': ({'Résumé': {'B6': 'demain'}}, 'AAAA-MM-JJ'),
        'doublon': ({'Tarifs': {'E6': 'adult-none'}}, 'Doublon'),
    }
    for name, (cells, message) in invalid.items():
        base_path.write_text(json.dumps(baseline))
        change_cells(excel, cells)
        try:
            module['import_tariffs'](excel, base_path)
        except module['ImportErrorWithDetails'] as error:
            assert message in str(error), str(error)
        else:
            raise AssertionError(f'Saisie invalide acceptée : {name}')
        assert json.loads(base_path.read_text()) == baseline
        print('BLOQUÉ :', name)
