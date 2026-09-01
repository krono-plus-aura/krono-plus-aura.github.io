# Mettre à jour les tarifs — guide simple

Vous n'avez besoin que du nouveau document tarifaire, du fichier Excel et de
votre compte GitHub. Le JSON, le cache hors connexion et la publication sont
gérés automatiquement.

## Les 5 étapes

### 1. Ouvrir le fichier Excel

Ouvrir `Base_tarifaire_KRONO_plus.xlsx`, puis la feuille **Tarifs**.

### 2. Recopier les prix

Modifier uniquement les colonnes :

- **Prix 2de (€)** ;
- **Prix 1re (€)**.

Recopier chaque prix exactement comme dans le document tarifaire.

Ne jamais calculer, arrondir, compléter ou deviner un prix. Si une valeur
manque ou paraît douteuse, arrêter la mise à jour.

Ne pas modifier les autres colonnes, ajouter ou supprimer de ligne. Ne pas
saisir le surclassement : Excel l'affiche automatiquement.

### 3. Enregistrer

Conserver exactement ce nom :

`Base_tarifaire_KRONO_plus.xlsx`

### 4. Remplacer le fichier sur GitHub

1. Ouvrir le dépôt `krono-plus-aura/krono-plus-aura.github.io`.
2. Ouvrir le dossier **gestion-tarifs**.
3. Choisir **Add file**, puis **Upload files**.
4. Déposer le nouvel Excel.
5. Cliquer sur **Commit changes**.

Il n'y a aucun JSON à ouvrir, aucun code à copier et aucune commande à saisir.

### 5. Attendre le voyant vert

Ouvrir l'onglet **Actions**, puis la ligne **Mettre à jour les tarifs depuis
Excel**.

- **Vert** : tous les contrôles ont réussi et le site est publié.
- **Rouge** : rien n'est publié. Faire une capture du message et demander une
  vérification. L'ancienne version reste en ligne.

Après le voyant vert, ouvrir une fois l'application avec Internet sur chaque
téléphone afin d'actualiser le mode hors connexion :

<https://krono-plus-aura.github.io/>

## Ce que GitHub vérifie automatiquement

- 9 gares ;
- 36 relations ;
- 19 profils ;
- 684 lignes tarifaires ;
- 1 368 montants ;
- aucune cellule vide ou ambiguë ;
- aucun doublon ni ligne manquante ;
- aucun prix inférieur à 1,20 € ;
- aucun prix 1re inférieur au prix 2de ;
- aucune valeur calculée, arrondie ou inventée ;
- fonctionnement du calcul et du mode hors connexion.

Un voyant vert signifie que tous les tarifs ont été **contrôlés
techniquement** par rapport à l'Excel déposé. Il ne transforme pas une
provenance commerciale « à confirmer » en provenance confirmée : seul un
document commercial vérifiable permet de modifier cette information.

## Les trois règles à retenir

1. Recopier uniquement les prix 2de et 1re.
2. Ne jamais inventer un prix manquant.
3. Attendre le voyant vert avant d'utiliser les nouveaux tarifs.
