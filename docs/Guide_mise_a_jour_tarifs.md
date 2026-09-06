# Mettre à jour les tarifs - guide pas à pas

> Un feuillet de deux pages reprend la feuille **Résumé** du classeur, le
> changement d'année tarifaire et les messages de blocage :
> `docs/Complement_guide_mise_a_jour_KRONO_plus.pdf`.

Cette procédure se fait sur **ordinateur**. Vous modifiez un seul fichier Excel,
puis GitHub contrôle et publie automatiquement.

## Avant de commencer

Préparez :

- la source officielle contenant les nouveaux prix ;
- un ordinateur avec Excel et un navigateur ;
- votre compte GitHub autorisé à modifier le dépôt.

Règle absolue : ne calculez, n'arrondissez, ne déduisez et n'inventez aucun
tarif. Si une information manque ou paraît douteuse, arrêtez la mise à jour.

## Étape 1 - ouvrir le dépôt

1. Ouvrez le dépôt officiel :
   <https://github.com/krono-plus-aura/krono-plus-aura.github.io>.
2. Connectez-vous à GitHub si nécessaire.
3. Vérifiez que la branche affichée en haut à gauche est **main**.
4. Cliquez sur le dossier **gestion-tarifs**.

![Dossier gestion-tarifs dans le dépôt GitHub](images/github-depot.jpg)

## Étape 2 - télécharger le bon fichier Excel

1. Dans **gestion-tarifs**, cliquez sur
   **Base_tarifaire_KRONO_plus.xlsx**.
2. Cliquez sur l'icône de téléchargement : flèche vers le bas.
3. Si l'icône n'apparaît pas, cliquez sur **View raw**.
4. Ouvrez le fichier téléchargé dans Excel.

Lien direct :
<https://github.com/krono-plus-aura/krono-plus-aura.github.io/blob/main/gestion-tarifs/Base_tarifaire_KRONO_plus.xlsx>

![Bouton de téléchargement du fichier Excel](images/github-fichier-excel.jpg)

Ne partez pas d'un ancien fichier reçu par e-mail. Le fichier présent dans
GitHub contient la structure attendue.

## Étape 3 - repérer la bonne ligne dans Excel

1. En bas d'Excel, cliquez sur la feuille **Tarifs**.
2. Repérez la ligne avec les colonnes **Départ**, **Arrivée**, **Voyageur** et
   **Profil / carte**.

![Colonnes permettant de repérer la ligne](images/excel-reperer-ligne.png)

## Étape 4 - modifier uniquement les deux prix

Modifiez seulement les cellules jaunes des colonnes :

- **Prix 2de (€)** ;
- **Prix 1re (€)**.

![Les deux colonnes modifiables](images/excel-prix-modifiables.png)

Recopiez exactement les deux montants lus sur la source officielle. Ne touchez
pas aux gares, profils, identifiants, clés, sources ou autres colonnes. N'ajoutez
et ne supprimez aucune ligne.

Enregistrez en conservant exactement ce nom :
`Base_tarifaire_KRONO_plus.xlsx`.

Fermez ensuite Excel.

## Étape 5 - déposer le fichier sur GitHub

1. Revenez dans le dossier **gestion-tarifs** du dépôt.
2. Cliquez sur **Add file**, puis **Upload files**.
3. Sélectionnez l'Excel que vous venez d'enregistrer.
4. Vérifiez que GitHub affiche exactement
   `Base_tarifaire_KRONO_plus.xlsx` comme fichier remplacé.
5. Dans **Commit message**, écrivez :
   `Mettre à jour les tarifs du JJ/MM/AAAA`.
6. Choisissez le commit direct sur **main** si GitHub vous le demande.
7. Cliquez sur le bouton vert **Commit changes**.

![Repères pour déposer l'Excel sur GitHub](images/mise-a-jour-github.svg)

Si **Add file** n'apparaît pas, vérifiez que vous êtes connecté avec le compte
invité comme collaborateur. Ne partagez jamais un mot de passe.

## Étape 6 - attendre le voyant vert

1. Cliquez sur l'onglet **Actions** en haut du dépôt.
2. Ouvrez **Mettre à jour les tarifs depuis Excel**.
3. Attendez la fin de l'exécution.

![Contrôle de la mise à jour dans GitHub Actions](images/github-actions.jpg)

- **Vert** : la publication est terminée.
- **Jaune** : le travail est en cours. Attendez sans redéposer le fichier.
- **Rouge** : rien de nouveau n'est publié et l'ancienne version reste en
  ligne. Ouvrez l'exécution : le message commence par **MISE À JOUR BLOQUÉE**
  et indique la cellule exacte en cause. Les cas les plus courants sont repris
  ci-dessous. Si le message ne correspond à aucun d'eux, faites une capture et
  transmettez-la à Hamza.

### Messages de blocage et solution

| Message | Ce qu'il faut corriger dans le classeur |
| --- | --- |
| Tarif manquant dans la cellule … | Une case de prix est vide. Chaque ligne doit porter un prix 2de **et** un prix 1re. |
| Tarif inférieur au plancher de 1,20 € | Aucun billet ne descend sous 1,20 €. Revérifiez le relevé. |
| Le prix 1re est inférieur au prix 2de | Les deux colonnes ont probablement été inversées. |
| Tarif avec plus de deux décimales | Le prix vient d'un calcul ou d'un pourcentage. Saisissez le prix relevé tel quel, par exemple 12,40. |
| Doublon ligne … | La même relation et le même profil apparaissent deux fois. |
| Structure Excel non conforme | Une ligne a été ajoutée ou supprimée. Ne changez jamais le nombre de lignes ni les colonnes. |
| La cellule « Version des données » doit contenir une date … | Voir l'encadré sur la feuille **Résumé** ci-dessous. |


GitHub contrôle toutes les lignes et tous les montants du classeur, les
doublons, les cases vides, le minimum de 1,20 €, l'ordre 2de/1re et le mode
hors connexion. Il ne crée aucun tarif.

## La feuille Résumé du classeur

Trois cellules seulement y ont un effet, et deux d'entre elles demandent de
l'attention.

- **Année tarifaire** (cellule B5). Pour une simple mise à jour de prix, n'y
  touchez pas. Au passage d'une nouvelle campagne, remplacez 2026 par 2027 :
  l'application affichera alors « Tarifs TER 2027 ». L'année ne peut jamais
  reculer.
- **Version des données** (cellule B6). Indiquez la date de votre relevé, au
  format `2027-01-15`. **Saisissez-la en texte**, jamais avec le format Date
  d'Excel : si Excel la transforme en date, l'outil sait la rattraper, mais le
  plus sûr reste de mettre la cellule au format Texte avant de taper.
- **Révision technique** (cellule B7). Purement informative. Elle est
  recalculée automatiquement à chaque publication : ne la modifiez pas, et ne
  vous inquiétez pas si elle ne correspond plus au rapport.

Le rapport affiché à la fin de l'exécution indique toujours l'année, la version
et la révision réellement publiées.

## Après le voyant vert

1. Ouvrez <https://krono-plus-aura.github.io/> avec Internet.
2. Vérifiez au moins le trajet et le profil réellement modifiés.
3. Sur chaque téléphone, attendez quelques secondes, fermez complètement
   l'application puis relancez-la.
4. Coupez le réseau et vérifiez que l'application s'ouvre et calcule toujours.

Le PDF illustré complet est disponible dans ce même dossier :
`Guide_simple_mise_a_jour_tarifs_KRONO_plus.pdf`.
