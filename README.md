# Surclassement KRONO +

Application interne de calcul du surclassement TER (2de -> 1re classe) sur l'axe
Lyon Part-Dieu <-> Geneve.

Site publie : <https://krono-plus-aura.github.io>

Depot attendu : `krono-plus-aura/krono-plus-aura.github.io`.

---

## Mettre a jour les tarifs (procedure courante)

1. Ouvrir `public/tarifs-base.json` sur GitHub et cliquer sur le crayon.
2. Modifier les montants concernes. **Les montants sont en centimes** :
   12,40 EUR s'ecrit `1240`. Chaque relation contient `[prix 2de, prix 1re]`.
3. Mettre a jour l'en-tete `meta` : `year`, `label` et `version` (date du jour).
4. Cliquer sur **Commit changes** avec un libelle clair (ex. « Tarifs 2027 »).
5. Onglet **Actions** : attendre le voyant.
   - **Vert** : les controles sont passes, le site est publie.
   - **Rouge** : rien n'est publie. Ouvrir la ligne rouge pour lire l'erreur.

### Revenir en arriere

Onglet **Commits** > ouvrir la modification fautive > bouton **Revert**.
Le site repart sur la version precedente en quelques minutes.

### Regles tarifaires a respecter

- Ne jamais calculer, deduire ou inventer un tarif manquant. En cas de doute,
  s'arreter et demander le justificatif.
- Aucun montant ne descend sous **1,20 EUR** (plancher tarifaire reel).
- Sur les cartes Familles Nombreuses, l'ecart 1re/2de est **identique** quel que
  soit le taux (30/40/50/75 %), sauf quand le plancher s'applique.
- Le surclassement n'est jamais saisi : il est toujours calcule
  (`prix 1re - prix 2de`).

Ces trois regles sont verifiees automatiquement a chaque publication.

---

## Organisation du projet

- `public/tarifs-base.json` : **source unique** des gares, profils et montants.
- `public/app.html` : le simulateur (interface, calcul, animations).
- `public/index.html` : redirige la racine du site vers le simulateur.
- `public/tarifs.html` : la base tarifaire en tableau (non liee depuis le simulateur).
- `public/tarifs-secours.css` : **genere automatiquement**, ne jamais editer a la main.
- `public/sw.js` : fonctionnement hors ligne (reseau d'abord, cache en secours).
- `scripts/sync-app-from-tariff-base.mjs` : regenere le secours CSS depuis la base.
- `scripts/verify-app-data.mjs` : controle l'integralite de la matrice tarifaire.

Perimetre actuel : 9 gares, 36 relations valables dans les deux sens,
9 profils tarifaires, 648 montants.

## Verifications en local (optionnel, pour un developpeur)

Aucune dependance a installer. Node.js 20 ou superieur suffit :

```
npm test
```

## Si le perimetre change

Ajouter une gare, une carte de reduction ou une regle asymetrique depasse la
simple mise a jour de prix : il faut adapter la base, les controles
(`scripts/verify-app-data.mjs`) et le generateur du secours CSS. A confier a un
developpeur.

## Hebergement

Site statique publie par GitHub Pages via le workflow
`.github/workflows/publication.yml`. Aucun serveur, aucune base de donnees,
aucun cout. Le depot contient l'historique complet : il fait office de
sauvegarde.
