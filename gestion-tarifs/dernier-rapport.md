# Résumé de la mise à jour tarifaire

## Résultat

- Structure Excel : conforme
- Gares : 9
- Relations : 36
- Profils : 19
- Lignes contrôlées : 684
- Montants contrôlés : 1 368
- Lignes manquantes : 0
- Doublons : 0
- Statuts « non trouvé » : 0
- Lignes tarifaires modifiées par rapport à l'ancienne base : 41
- Version des données : 2026-09-02
- Révision technique : 7

## Provenance directe

- 648 lignes : SNCF Connect
- 36 lignes Carte Militaire : TER Auvergne-Rhône-Alpes

Le détail complet est conservé dans
`RELEVE_SNCF_CONNECT_ET_TER_AURA_2026-09-02.csv`.

## Contrôles

- 684 combinaisons uniques : 36 relations × 19 profils
- Deux montants numériques par ligne
- Aucun montant inférieur à 1,20 €
- Prix 1re toujours supérieur ou égal au prix 2de
- Trois lignes de calibrage conformes
- Application, publication GitHub Pages et cache hors connexion contrôlés

## Règle de sécurité

Les prix ont été recopiés dans la base en centimes, sans calcul, pourcentage,
arrondi, déduction ou valeur de remplacement. L'ancien script qui fabriquait
des profils à partir d'autres tarifs a été retiré.
