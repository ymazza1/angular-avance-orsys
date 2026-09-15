# TP 1 — Corrigé et notes d'animation

**Durée cible** 45 min · **Rouge → vert** 21 tests à faire passer

## Ce qui a été ajouté par rapport au projet apprenant

| Fichier                          | Modification                                        |
| -------------------------------- | --------------------------------------------------- |
| `apps/boutique/project.json`     | `tags: ["type:app", "domaine:boutique"]`             |
| `libs/*/project.json` (7 fichiers) | deux tags chacun : un de type, un de domaine       |
| `eslint.config.mjs`              | `depConstraints` complété : 6 contraintes techniques + 4 fonctionnelles |

Rien d'autre. Aucun code applicatif n'est écrit à ce stade : c'est volontaire.
Les bibliothèques restent vides jusqu'au TP 2.

## Pourquoi ce découpage

### Pourquoi deux axes de tags et pas un seul

Un seul axe force à choisir entre deux découpages également légitimes :
par couche, ou par domaine métier. Avec deux axes, les deux règles coexistent
et se composent — Nx exige que **toutes** les contraintes applicables soient
satisfaites.

Conséquence pratique : `catalogue/ui` ne peut pas importer
`livraison/data-access`, non pas à cause d'une règle qui le dit explicitement,
mais parce que la contrainte technique (`type:ui` n'atteint pas
`type:data-access`) suffit.

### Pourquoi `type:domaine` ne peut pas atteindre `type:data-access`

C'est la contrainte qui porte tout le reste de la formation. Elle garantit
que les règles métier sont testables sans `TestBed`, sans `HttpClient` et sans
navigateur. Au TP 9, c'est ce qui permettra d'avoir une suite de tests qui
tourne en quelques secondes.

Si un stagiaire demande « et si j'ai vraiment besoin d'appeler l'API depuis le
domaine ? », la réponse est : le domaine déclare une interface, et
l'infrastructure l'implémente. C'est exactement ce qu'on fera au TP 2 avec
`DepotProduits`.

### Pourquoi une lib `livraison/data-access` séparée

Les stratégies de livraison sont des règles métier pures — elles vivent dans
`livraison/domaine`. Mais leur **composition** (le jeton d'injection, les
multi-providers) relève d'Angular. Mettre l'`InjectionToken` dans le domaine
casserait la règle de pureté, et le test `livraison-domaine n importe rien
d Angular` le détecterait immédiatement.

C'est un bon moment pour montrer qu'un test de structure attrape une erreur
d'architecture aussi sûrement qu'un test unitaire attrape une régression.

### Pourquoi `domaine:catalogue` peut dépendre de `domaine:livraison`

Le catalogue affiche un coût de livraison estimé sur la fiche produit. La
dépendance est donc réelle, et elle va dans un seul sens : la livraison n'a
aucune raison de connaître le catalogue. Si quelqu'un propose l'inverse, c'est
le signe qu'une règle est du mauvais côté.

## Déroulé conseillé

| Temps   | Étape                                                               |
| ------- | ------------------------------------------------------------------- |
| 0-5 min | Lancer `npm run test:structure` tous ensemble, constater les 21 rouges |
| 5-10    | Étape 1 : `nx graph`, commenter le graphe plat                       |
| 10-20   | Étape 2 : les tags. 9 tests passent au vert                          |
| 20-25   | Étape 3 : les 4 questions à l'oral — **ne pas sauter cette étape**   |
| 25-35   | Étape 4 : `depConstraints`. Les 12 derniers tests passent            |
| 35-42   | Étape 5 : la violation volontaire, en plénière                       |
| 42-45   | Étape 6 : `affected` vs `run-many`                                   |

## Points où ça coince

**« Mes tags sont bons mais le test échoue. »**
Vérifier la casse et le tiret : `type:data-access`, pas `type:dataAccess`.
Le test compare des chaînes exactes.

**Le lint ne détecte pas la violation de l'étape 5.**
Deux causes possibles : l'import est dans un fichier non couvert par le
`files: ['**/*.ts']` du bloc ESLint, ou le cache Nx sert un ancien résultat.
`npx nx reset` tranche.

**« Pourquoi ne pas simplement faire une revue de code ? »**
Question légitime, à prendre au sérieux. Réponse : la revue de code attrape
la violation une fois sur deux, à condition que le relecteur connaisse la
règle. Le lint l'attrape à chaque fois, y compris six mois après le départ de
celui qui l'avait posée. Ce n'est pas un remplacement de la revue, c'est le
déplacement d'un type de vérification vers la machine.

**Groupe mixte :** les stagiaires les plus juniors vont vouloir écrire du code
Angular. Recadrer clairement : ce TP ne produit aucune ligne de composant,
c'est le seul de la formation dans ce cas.

## Ce que ce TP prépare

- TP 2 : les frontières posées ici vont être mises à l'épreuve par du vrai
  code. La façade n'a de sens que parce que `type:ui` ne peut pas atteindre
  `type:data-access`.
- TP 9 : la pureté du domaine est ce qui rendra la suite de tests rapide.
- TP 10 : `nx affected` est le levier principal sur le temps de CI.

## Vérification du corrigé

```bash
npm install --legacy-peer-deps
npm run test:structure      # 28 verts
npx nx run-many -t test     # 8 projets, aucun test applicatif encore
npx nx run-many -t lint     # vert
npx nx build boutique       # ~225 kB brut / 61 kB transférés
npx nx graph                # 8 projets, aucune dépendance encore
```

Ces cinq commandes ont été exécutées sur ce workspace : le build passe, le
lint passe, et une violation de frontière produit bien l'erreur attendue
(`A project tagged with "type:ui" can only depend on libs tagged with
"type:ui", "type:domaine", "type:util"`). Le chiffre de 225 kB servira de
point de comparaison au TP 10.

## Notes de configuration

Trois choix de configuration méritent d'être connus, parce qu'un stagiaire
curieux ouvrira ces fichiers :

- **La cible `test` est déclarée explicitement** dans chaque `project.json`
  (`nx:run-commands` + `vitest run`). L'inférence automatique du plugin
  `@nx/vite` ne produisait pas de cible dans cette combinaison de versions ;
  la déclaration explicite est de toute façon plus lisible en formation.
- **Les bibliothèques de domaine tournent en environnement `node`**, sans
  plugin Angular. Si un test de domaine réclame `jsdom`, c'est le signe que la
  règle testée n'est pas au bon endroit.
- **`tsconfig.base.json` n'a pas de `baseUrl`** : l'option est dépréciée en
  TypeScript 6, les `paths` sont donc relatifs au fichier.
