# TP 1 — Le workspace Maison&Co

**Durée** 45 min

## Le contexte

Vous reprenez Maison&Co, un site de vente de mobilier. Le workspace Nx existe
déjà : l'application `boutique` et sept bibliothèques ont été générées. Mais
personne n'a posé de règles : n'importe quelle bibliothèque peut aujourd'hui
importer n'importe quelle autre.

Votre mission : rendre l'architecture **vérifiable par l'outillage**, pas par
la bonne volonté de l'équipe.

## Comment savoir si vous avez fini

```bash
npm install --legacy-peer-deps
npm run test:structure
```

> `--legacy-peer-deps` est nécessaire : quelques paquets de l'écosystème
> déclarent encore des plages de pairs antérieures à Angular 22. C'est sans
> conséquence ici.

Vous devez avoir **21 tests rouges** au départ. Le TP est terminé quand les
28 sont verts. Lisez les messages d'échec : ils décrivent précisément ce qui
est attendu.

Ouvrez `tools/structure/structure.spec.ts`. Ce fichier n'est pas à modifier —
c'est votre cahier des charges.

## Ce qui existe déjà

```
apps/boutique/                  l'application
libs/catalogue/domaine/         types et règles métier du catalogue
libs/catalogue/data-access/     HTTP, façades, état
libs/catalogue/ui/              composants de présentation
libs/catalogue/feature/         pages routées
libs/livraison/domaine/         règles de coût de livraison
libs/livraison/data-access/     jetons d'injection, composition des stratégies
libs/partage/util/              helpers transverses
```

Les bibliothèques sont vides : c'est normal, on les remplira au TP 2.

## Étape 1 — Lire avant d'écrire

```bash
npx nx graph
```

Le graphe s'ouvre dans le navigateur. Il est plat : aucune bibliothèque ne
dépend d'une autre, puisqu'elles sont vides. Gardez cet onglet ouvert, on y
reviendra à chaque TP.

## Étape 2 — Poser les tags

Chaque projet porte **deux** tags : un de type (sa couche technique) et un de
domaine (son périmètre fonctionnel). Ils se déclarent dans le `project.json`
de chaque projet :

```json
{
  "name": "catalogue-data-access",
  "tags": ["type:data-access", "domaine:catalogue"]
}
```

Les types disponibles : `app`, `feature`, `ui`, `data-access`, `domaine`,
`util`.
Les domaines : `boutique`, `catalogue`, `livraison`, `partage`.

À vous de déduire les valeurs à partir du nom de chaque bibliothèque. Les
tests vous diront si vous vous êtes trompé.

> Neuf des 21 tests rouges concernent cette étape.

## Étape 3 — Comprendre ce qu'on veut interdire

Avant d'écrire la configuration, répondez à ces questions à l'oral, en binôme :

1. Un composant de `catalogue/ui` doit-il pouvoir appeler `CatalogueApi` ?
   Pourquoi ?
2. `catalogue/domaine` doit-il pouvoir importer `partage/util` ? Et l'inverse ?
3. `livraison/domaine` doit-il connaître `catalogue/domaine` ?
4. Si demain on extrait le catalogue dans une autre application, quelles
   bibliothèques emporte-t-on ?

## Étape 4 — Déclarer les contraintes

Ouvrez `eslint.config.mjs`. La règle `@nx/enforce-module-boundaries` est bien
activée, mais son tableau `depConstraints` est vide : elle ne protège rien.

Complétez-le. Deux familles de contraintes :

**Axe technique** — la dépendance va toujours vers le bas :

| Depuis            | Peut importer                                                |
| ----------------- | ------------------------------------------------------------ |
| `type:app`        | `feature`, `ui`, `util`                                       |
| `type:feature`    | `feature`, `ui`, `data-access`, `domaine`, `util`             |
| `type:ui`         | `ui`, `domaine`, `util`                                       |
| `type:data-access`| `data-access`, `domaine`, `util`                              |
| `type:domaine`    | `domaine`, `util`                                             |
| `type:util`       | `util`                                                        |

**Axe fonctionnel** — qui a le droit de connaître quel domaine :

| Depuis              | Peut importer                                  |
| ------------------- | ---------------------------------------------- |
| `domaine:boutique`  | tout (`*`)                                     |
| `domaine:catalogue` | `catalogue`, `livraison`, `partage`            |
| `domaine:livraison` | `livraison`, `partage`                         |
| `domaine:partage`   | `partage`                                      |

Syntaxe :

```js
{ sourceTag: 'type:ui', onlyDependOnLibsWithTags: ['type:ui', 'type:domaine', 'type:util'] },
```

## Étape 5 — Provoquer une violation

C'est l'étape la plus importante du TP : il faut avoir **vu** l'erreur une
fois pour la reconnaître plus tard.

Dans `libs/catalogue/ui/src/index.ts`, ajoutez :

```ts
import { CatalogueApi } from '@maison/catalogue/data-access';
```

Puis :

```bash
npx nx lint catalogue-ui
```

Lisez le message en entier. Il nomme le tag source, le tag cible et la
contrainte violée. C'est ce message que verra votre collègue, dans six mois,
au moment où il essaiera de prendre le raccourci.

Retirez ensuite l'import : le lint doit redevenir vert.

## Étape 6 — Mesurer l'effet sur la CI

```bash
git add -A && git commit -m "tags et frontières"
# modifiez un fichier de libs/catalogue/ui, puis :
npx nx affected -t lint --base=HEAD
npx nx run-many -t lint
```

Comparez le nombre de projets exécutés dans les deux cas. C'est la différence
entre une CI de trois minutes et une CI de vingt.

## Vérification finale

- [ ] `npm run test:structure` : 28 tests verts
- [ ] `npx nx run-many -t lint` : vert
- [ ] L'import interdit de l'étape 5 produisait bien une erreur de lint
- [ ] `npx nx affected` exécute strictement moins de projets que `run-many`

## Pour ceux qui finissent en avance

1. Ajoutez un troisième axe de tags, `perimetre:public` / `perimetre:interne`,
   et une contrainte qui empêche l'application d'importer une lib interne.
2. Écrivez un test supplémentaire dans `tools/structure/` qui vérifie qu'aucun
   `project.json` n'a de tableau `tags` vide. Comment feriez-vous échouer ce
   test volontairement ?
