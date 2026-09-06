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

La base active porte la version tarifaire `2026-09-02`, révision `7`.

Ces nombres décrivent l'état actuel : ils ne sont plus figés dans les contrôles.
Une hausse de prix, une nouvelle campagne tarifaire ou l'ajout d'un profil
passent la chaîne de publication sans intervention technique.

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
| `tests/import-tarifs-excel.test.mjs` | Vérifie que le classeur Excel reproduit exactement la base publiée. |
| `tests/audit-recommendations.test.mjs` | Contrôle le rendu attendu, les profils, GitHub Pages et le mode hors connexion. |
| `.github/workflows/publication.yml` | Lance les contrôles puis publie `public/` sur GitHub Pages. |
| `.github/workflows/mise-a-jour-tarifs.yml` | Contrôle l'Excel, génère la base et publie les tarifs automatiquement. |
| `gestion-tarifs/Base_tarifaire_KRONO_plus.xlsx` | Seul fichier à remplacer lors d'une mise à jour tarifaire courante. |
| `gestion-tarifs/RELEVE_SNCF_CONNECT_ET_TER_AURA_2026-09-02.csv` | Relevé direct consolidé des 684 lignes, conservé pour traçabilité. |
| `docs/Guide_utilisateur_GitHub_Pages.md` | Guide simple d'accès, d'installation et de dépannage pour les contrôleurs. |
| `docs/Guide_mise_a_jour_tarifs.md` | Procédure illustrée, pas à pas, pour modifier l'Excel et le déposer sur GitHub. |
| `docs/Guide_utilisateur_Surclassement_KRONO_plus_GitHub_Pages.pdf` | Guide illustré à diffuser aux agents : accès, installation et mode hors connexion. |
| `docs/Guide_simple_mise_a_jour_tarifs_KRONO_plus.pdf` | Guide illustré de maintenance : Excel, dépôt GitHub, voyant vert et contrôle final. |
| `docs/Complement_guide_mise_a_jour_KRONO_plus.pdf` | Feuillet de 2 pages à joindre au guide de maintenance : feuille Résumé, changement d'année tarifaire, messages de blocage. |

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

GitHub contrôle toutes les lignes et tous les montants du classeur, génère le
JSON et le cache hors connexion, puis publie le site. Il n'y a aucun JSON à
modifier, aucune IA à utiliser et aucune commande à saisir.

Pour une nouvelle campagne tarifaire, modifier en plus la cellule **Année
tarifaire** de la feuille **Résumé** du classeur. La cellule **Version des
données** doit rester saisie en texte, au format `AAAA-MM-JJ`.

Le guide détaillé `docs/Guide_mise_a_jour_tarifs.md`, également fourni en PDF
dans le pack de sauvegarde, illustre cette procédure.

## Contrôles locaux facultatifs

Pour un développeur disposant de Node.js 22 ou supérieur :

```text
npm test
```

Cette commande régénère les fichiers dérivés, contrôle toutes les relations et
tous les profils, puis simule une coupure réseau pour vérifier le cache hors
connexion.

## Ce qui protège les tarifs

Aucun prix n'est recopié en dur dans les contrôles : ils changeraient à chaque
campagne et bloqueraient la publication. La protection repose sur trois
mécanismes qui, eux, ne périment pas :

1. `tests/import-tarifs-excel.test.mjs` vérifie que le classeur Excel reproduit
   **exactement** `public/tarifs-base.json`. Une valeur modifiée directement
   dans le JSON, sans relevé correspondant dans le classeur, fait échouer la
   publication — et cela couvre la totalité des lignes, pas un échantillon.
2. `scripts/verify-app-data.mjs` applique à chaque ligne les invariants
   tarifaires : montants entiers en centimes, plancher de 1,20 €, prix 1re
   supérieur ou égal au prix 2de, tous les profils présents sur toutes les
   relations, symétrie des deux sens.
3. `scripts/import-tarifs-excel.py` refuse tout prix vide, en double, négatif,
   inversé ou comportant plus de deux décimales — donc tout prix issu d'un
   calcul, d'un pourcentage ou d'un arrondi.

## Retour à la version précédente

L’historique Git est conservé. En cas de problème, revenir au dernier commit
validé depuis l’interface GitHub, puis attendre la nouvelle exécution verte de
l’onglet **Actions**. Ne jamais effacer l’historique du dépôt.

## Hébergement

GitHub Pages publie uniquement le dossier `public/`. Aucun serveur, abonnement,
offre payante ou carte bancaire n’est nécessaire.
# Contrôles complémentaires avant publication du 6 septembre 2026

Les formules Excel sont refusées dans les prix, y compris lorsqu'Excel a
enregistré leur résultat numérique. Les années décimales et les dates
inexistantes sont également bloquées. Lorsqu'un nouveau service worker prend
le relais dans une application déjà ouverte, la page se recharge une fois
pour utiliser les nouveaux tarifs ; la sélection en cours est alors réinitialisée.

Les 17 tests automatiques comprennent cinq scénarios de maintenance suivis
d'une relance identique, onze saisies invalides, la correspondance intégrale
Excel/JSON et une simulation de panne réseau du cache hors connexion.
Ces vérifications portent sur le fonctionnement technique : elles ne constituent
pas un nouveau relevé commercial SNCF Connect. Aucun montant n'a été modifié.
