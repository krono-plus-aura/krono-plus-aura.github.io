# Processus automatisé de mise à jour des tarifs

## Objectif

La personne chargée des tarifs manipule un seul fichier :
`gestion-tarifs/Base_tarifaire_KRONO_plus.xlsx`.

GitHub effectue automatiquement la conversion, les contrôles, la régénération
du mode hors connexion et la publication. Aucune approbation supplémentaire
n'est demandée.

## Déroulement

1. Hamza ou son responsable recopie les prix 2de et 1re dans l'Excel.
2. Il remplace le classeur dans le dossier `gestion-tarifs` sur GitHub.
3. GitHub recopie exactement les montants dans un JSON temporaire.
4. GitHub vérifie les 684 lignes, les 1 368 montants et toute l'application.
5. Si tous les contrôles réussissent, GitHub enregistre les fichiers générés et
   publie le dossier `public` sur GitHub Pages.
6. Si un contrôle échoue, le processus s'arrête et la version déjà en ligne
   reste disponible.

## Garde-fous

- Le convertisseur n'utilise aucune IA et aucune source extérieure.
- Il ne calcule, n'arrondit, ne déduit et ne complète aucun tarif.
- Il refuse une cellule vide, non numérique, inférieure à 1,20 € ou comportant
  plus de deux décimales.
- Il exige exactement les 684 combinaisons relation/profil de la base courante,
  sans ajout, absence ni doublon.
- Il refuse un prix 1re inférieur au prix 2de.
- Il conserve tous les objets autres que les montants depuis le JSON courant,
  notamment les profils, libellés et informations de provenance.
- Il bloque une exécution devenue ancienne si un nouvel Excel a été déposé
  entre-temps.
- Le même workflow publie directement GitHub Pages. Il ne dépend pas du
  déclenchement d'un second workflow après le commit automatique.

## Accès

Hamza et son responsable utilisent chacun leur propre compte GitHub avec un
droit d'écriture sur le dépôt. Aucun mot de passe ne doit être partagé.

Le dépôt et GitHub Pages restent gratuits. Aucun environnement de validation,
abonnement ni carte bancaire n'est nécessaire.

## Sens du mot « vérifié »

Après un voyant vert, les 684 lignes et les 1 368 montants sont vérifiés
techniquement contre l'Excel déposé. Le processus ne change pas le statut d'une
source commerciale. Une provenance encore « à confirmer » ne peut être marquée
comme confirmée qu'à partir d'un justificatif commercial identifiable.
