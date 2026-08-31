# Guide simple de mise à jour des tarifs

Ce guide est destiné à Hamza et à son responsable. La mise à jour se fait dans GitHub, sans ligne de commande.

## Règle absolue

Le fichier `public/tarifs-base.json` est l'unique source utilisée par l'application. Aucun tarif ne doit être calculé, arrondi, complété, estimé ou déduit.

La base actuellement préparée pour GitHub Pages contient :

- 9 gares ;
- 36 relations sans doublon, utilisables dans les deux sens ;
- 19 profils tarifaires ;
- 684 lignes relation/profil ;
- 1 368 montants enregistrés, soit un prix 2de et un prix 1re par ligne.

Le surclassement n'est jamais saisi dans le JSON : l'application calcule `prix 1re - prix 2de` au moment de l'utilisation.

## Avant de commencer

Travaillez toujours avec deux fichiers :

1. le classeur Excel tarifaire mis à jour ;
2. le dernier fichier `public/tarifs-base.json` téléchargé depuis GitHub.

Conservez une copie non modifiée de ces deux fichiers. Demandez une vérification par une deuxième personne avant toute publication.

## Étape 1 - Mettre à jour le fichier Excel

1. Ouvrez le classeur `Base_tarifaire_KRONO_plus_2026_version_finale.xlsx`.
2. Dans la feuille **Tarifs**, modifiez uniquement les cellules validées des colonnes **Prix 2de (€)** et **Prix 1re (€)**.
3. Ne modifiez pas la colonne **Surclassement (€)** : elle contient une formule de contrôle.
4. Ne changez pas les identifiants de profil ni les clés de relation.
5. Ne supprimez aucune ligne et n'en ajoutez aucune sans validation expresse de Hamza.
6. Enregistrez une nouvelle copie datée du classeur. Gardez l'ancienne copie.

Contrôlez visuellement chaque ligne modifiée avec le document commercial d'origine. Si un montant manque ou n'est pas certain, laissez la mise à jour en attente.

## Étape 2 - Préparer la conversion avec une IA

Téléchargez depuis GitHub le fichier courant `public/tarifs-base.json`. Donnez à l'IA les deux pièces jointes dans la même conversation : le JSON courant et le nouvel Excel.

La conversion des euros vers les centimes est uniquement un changement d'unité exact. Par exemple, `35,10 €` devient `3510`. Si une cellule contient plus de deux décimales, est vide, ambiguë ou non numérique, l'IA doit s'arrêter : elle ne doit jamais arrondir.

### Demande 1 - Audit avant conversion

Copiez-collez ce texte en remplaçant uniquement les noms des fichiers si nécessaire :

> Tu dois contrôler une base tarifaire commerciale sans inventer ni recalculer aucun prix. Les deux pièces jointes sont : (1) le fichier JSON actuellement utilisé par l'application, qui fournit la structure et tous les identifiants ; (2) le fichier Excel mis à jour, qui fournit les prix validés. N'écris pas encore de nouveau JSON. Vérifie uniquement que l'Excel contient exactement 684 lignes tarifaires, 36 clés de relation distinctes et 19 identifiants de profil distincts, sans doublon sur la combinaison « clé relation + identifiant profil ». Vérifie que chaque combinaison du JSON existe exactement une fois dans l'Excel et réciproquement. Pour chaque ligne, les cellules Prix 2de et Prix 1re doivent être numériques, positives et comporter au maximum deux décimales. N'utilise jamais la colonne Surclassement pour produire un prix. Ne complète rien, ne déduis rien et n'arrondis rien. Si une donnée manque, est ambiguë ou ne correspond pas, arrête-toi et liste précisément les anomalies. Réponds seulement par un rapport de contrôle, sans modifier les données.

Ne passez à la suite que si le rapport ne signale aucune anomalie.

### Demande 2 - Création du JSON

Dans la même conversation, copiez-collez ensuite :

> Le contrôle précédent est validé. Crée maintenant un nouveau fichier `tarifs-base.json` en conservant strictement la structure du JSON de référence. Recopie à l'identique tous les objets `meta`, `stations`, `profiles`, leurs libellés, identifiants, règles et sources. Ne change les champs de version ou de révision que si je te fournis moi-même leurs nouvelles valeurs. Pour chaque combinaison « clé relation + identifiant profil », recopie uniquement les deux montants de l'Excel : Prix 2de puis Prix 1re. Convertis exactement l'unité euro vers l'unité centime, sans arrondi : `35,10` devient `3510`. Si une valeur comporte plus de deux décimales, est vide, ambiguë ou non numérique, arrête-toi sans produire de fichier. Chaque entrée `fares` doit contenir exactement `[prix_2de_en_centimes, prix_1re_en_centimes]`. N'utilise pas la colonne Surclassement, ne calcule aucun tarif à partir d'un pourcentage, ne déduis jamais une classe à partir de l'autre et ne complète jamais une valeur manquante. Le résultat doit garder exactement 9 gares, 36 relations, 19 profils, 684 combinaisons et 1 368 montants. Fournis le fichier JSON complet, sans commentaire à l'intérieur du JSON.

Téléchargez le fichier produit par l'IA. Ne copiez pas seulement un extrait affiché à l'écran.

## Étape 3 - Vérifier le JSON obtenu

Avant GitHub, contrôlez les points suivants :

1. Le fichier s'appelle `tarifs-base.json`.
2. Il commence par `{` et se termine par `}`.
3. Les rubriques `meta`, `stations`, `pairs` et `profiles` sont présentes.
4. L'IA annonce 9 gares, 36 relations, 19 profils, 684 combinaisons et 1 368 montants.
5. Aucune valeur n'est vide, nulle, négative ou écrite en euros avec une virgule.
6. Chaque paire contient deux nombres entiers : 2de puis 1re.
7. Les identifiants, libellés et informations de provenance non concernés sont inchangés.
8. Chaque ligne tarifaire modifiée est relue dans l'Excel et dans le JSON par une deuxième personne.

Les repères connus peuvent signaler une erreur, mais ne doivent jamais servir à fabriquer un tarif : aucun billet ne doit descendre sous 1,20 €, et les écarts Familles Nombreuses déjà contrôlés doivent rester cohérents.

## Étape 4 - Appliquer le fichier sur GitHub

1. Ouvrez `https://github.com/krono-plus-aura/krono-plus-aura.github.io` et connectez-vous.
2. Ouvrez le dossier `public`, puis le fichier `tarifs-base.json`.
3. Cliquez sur l'icône en forme de crayon pour modifier le fichier.
4. Remplacez tout le contenu par le JSON complet validé. Ne modifiez aucun autre fichier.
5. Cliquez sur **Commiter les changements**.
6. Saisissez un message clair, par exemple : `Mettre à jour les tarifs validés du 15 septembre 2026`.
7. Si GitHub propose **Commit directement sur main**, choisissez cette option. S'il impose une nouvelle branche, créez la branche proposée, ouvrez la demande de modification, faites-la relire puis fusionnez-la dans `main`.

Le dépôt doit accorder un droit de modification à Hamza et à son responsable. Seuls ces comptes doivent effectuer les mises à jour tarifaires.

## Étape 5 - Attendre les contrôles et la publication

1. Dans le dépôt, ouvrez l'onglet **Actions**.
2. Ouvrez l'exécution nommée **Contrôles et publication**.
3. Attendez que **Contrôles de la base tarifaire** puis **Mise en ligne** soient tous les deux verts.
4. Si un contrôle est rouge, ne tentez pas de contourner l'erreur. La version précédente reste en ligne. Relevez le message affiché et demandez une vérification.
5. Une fois les contrôles verts, ouvrez `https://krono-plus-aura.github.io/` avec Internet.
6. Vérifiez plusieurs trajets modifiés sur ordinateur et téléphone, puis testez une ouverture hors connexion.

## Revenir à la version précédente sans ligne de commande

Si une erreur commerciale est découverte après publication :

1. ouvrez l'historique du fichier `public/tarifs-base.json` sur GitHub ;
2. ouvrez la dernière version correcte ;
3. copiez son contenu complet ;
4. remplacez le fichier actuel avec ce contenu ;
5. créez un nouveau commit intitulé `Restaurer la dernière base tarifaire validée` ;
6. attendez de nouveau les contrôles et la publication.

Ne supprimez pas l'historique et ne forcez jamais le remplacement de la branche.

## Validation finale à deux personnes

Avant chaque publication tarifaire, une personne prépare et l'autre contrôle :

- le classeur Excel source ;
- les lignes réellement modifiées ;
- la correspondance exacte Excel/JSON ;
- le résultat des contrôles GitHub ;
- les calculs de vérification dans l'application ;
- l'ouverture hors connexion.

