# Surclassement KRONO +

Application interne de calcul du surclassement TER de la 2de vers la 1re classe
sur l’axe Lyon Part-Dieu ↔ Genève.

Site public : <https://krono-plus-aura.github.io>

L’application est statique, gratuite et publiée automatiquement par GitHub
Pages depuis la branche `main`. Elle reste utilisable hors connexion après une
première ouverture avec Internet.

## Version de référence

Cette version reprend à l’identique l’application finale validée :

- 9 gares ;
- 36 relations directes, valables dans les deux sens ;
- 19 profils tarifaires : 12 adultes et 7 enfants ;
- 684 couples relation/profil ;
- 1 368 montants de classe, enregistrés en centimes ;
- calcul automatique du surclassement : prix 1re − prix 2de.

La base active porte la version tarifaire `2026-08-24`, révision `6`.

## Règles absolues

- `public/tarifs-base.json` est l’unique source des tarifs de l’application.
- Aucun tarif manquant ne doit être calculé, déduit, arrondi ou inventé.
- Les deux montants d’une ligne sont toujours recopiés tels qu’ils ont été
  vérifiés : `[prix 2de, prix 1re]`.
- Les montants sont exprimés en centimes : `1240` signifie 12,40 €.
- Le surclassement n’est jamais enregistré dans la base ; l’application le
  calcule automatiquement.
- Le rendu visuel et le comportement de la PWA sont figés, sauf demande
  explicite du propriétaire.

## Organisation du dépôt

| Fichier ou dossier | Rôle |
| --- | --- |
| `public/app.html` | Simulateur visible par les contrôleurs : interface, calculs et animations. |
| `public/index.html` | Ouvre automatiquement le simulateur depuis l’adresse principale. |
| `public/tarifs-base.json` | Source unique des gares, profils et prix. |
| `public/tarifs.html` | Tableau de contrôle de la base, non lié depuis le simulateur. |
| `public/tarifs-secours.css` | Fichier de secours généré automatiquement. Ne pas modifier manuellement. |
| `public/sw.js` | Mise en cache et fonctionnement hors connexion. |
| `public/manifest.webmanifest` | Installation sur l’écran d’accueil et identité de la PWA. |
| `public/*.png`, `public/*.svg`, `public/*.webp` | Logos, icônes et visuels de l’application. |
| `scripts/sync-app-from-tariff-base.mjs` | Synchronise le cache et les fichiers générés avec la base tarifaire. |
| `scripts/verify-app-data.mjs` | Vérifie l’intégralité de la matrice tarifaire et les règles de sécurité. |
| `scripts/import-tarifs-excel.py` | Recopie et contrôle les prix de l'Excel sans calcul ni arrondi. |
| `tests/audit-recommendations.test.mjs` | Contrôle le rendu attendu, les profils, GitHub Pages et le mode hors connexion. |
| `.github/workflows/publication.yml` | Lance les contrôles puis publie `public/` sur GitHub Pages. |
| `.github/workflows/mise-a-jour-tarifs.yml` | Contrôle l'Excel, génère la base et publie les tarifs automatiquement. |
| `gestion-tarifs/Base_tarifaire_KRONO_plus.xlsx` | Seul fichier à remplacer lors d'une mise à jour tarifaire courante. |
| `docs/Guide_utilisateur_GitHub_Pages.md` | Guide simple d'accès, d'installation et de dépannage pour les contrôleurs. |
| `docs/Guide_mise_a_jour_tarifs.md` | Procédure sans ligne de commande pour l'Excel, la conversion JSON et la publication. |

## Séparation entre utilisation et maintenance

Les contrôleurs utilisent uniquement le site public. La modification des tarifs
se fait dans le dépôt GitHub et nécessite un compte disposant d’un accès en
écriture. Le simulateur ne contient aucun bouton public permettant de modifier
la base.

Hamza et son responsable doivent chacun utiliser leur propre compte GitHub. Il
ne faut jamais partager un mot de passe.

## Mise à jour rapide des tarifs

1. Ouvrir `gestion-tarifs/Base_tarifaire_KRONO_plus.xlsx`.
2. Modifier uniquement les colonnes **Prix 2de (€)** et **Prix 1re (€)**.
3. Enregistrer le fichier sans changer son nom.
4. Remplacer cet Excel dans le dossier `gestion-tarifs` sur GitHub, puis cliquer
   sur **Commit changes**.
5. Attendre le voyant vert dans **Actions**.

GitHub contrôle les 684 lignes et les 1 368 montants, génère le JSON et le cache
hors connexion, puis publie le site. Il n'y a aucun JSON à modifier, aucune IA
à utiliser et aucune commande à saisir.

Le guide détaillé `docs/Guide_mise_a_jour_tarifs.md`, également fourni en PDF
dans le pack de sauvegarde, illustre cette procédure.

## Contrôles locaux facultatifs

Pour un développeur disposant de Node.js 22 ou supérieur :

```text
npm test
```

Cette commande régénère les fichiers dérivés, contrôle les 36 relations et les
19 profils, puis simule une coupure réseau pour vérifier le cache hors
connexion.

## Retour à la version précédente

L’historique Git est conservé. En cas de problème, revenir au dernier commit
validé depuis l’interface GitHub, puis attendre la nouvelle exécution verte de
l’onglet **Actions**. Ne jamais effacer l’historique du dépôt.

## Hébergement

GitHub Pages publie uniquement le dossier `public/`. Aucun serveur, abonnement,
offre payante ou carte bancaire n’est nécessaire.
