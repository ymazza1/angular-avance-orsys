# TP 0 — Corrigé et notes d'animation

**Durée cible** 20 min · **Objectif réel** que personne ne démarre le TP 1 avec un poste cassé

## Ce qui change par rapport au projet apprenant

Un seul fichier :

| Fichier                                     | Modification                                    |
| ------------------------------------------- | ----------------------------------------------- |
| `libs/partage/util/src/lib/api-url.ts`      | la fabrique renvoie `'http://localhost:3333/api'` au lieu de `''` |

C'est tout. Les tests d'environnement (`tools/environnement/`) ne dépendent pas
du code mais de l'état du poste : ils deviennent verts quand les dépendances
sont installées et que l'API tourne, pas quand un fichier est modifié. Autrement
dit, pour ce TP-là, le corrigé ne peut pas « rendre les tests verts » — c'est le
stagiaire qui le fait en lançant l'API.

## Pourquoi un jeton d'injection plutôt qu'une constante

C'est la question 1 de l'étape 4, et elle mérite trois minutes.

Une constante exportée (`export const API_URL = 'http://…'`) fonctionne
parfaitement — jusqu'au premier test. Pour la remplacer, il faut soit mocker le
module, soit passer par une variable globale. Avec un jeton, le remplacement est
une ligne de providers, et c'est exactement ce que fait le quatrième test :

```ts
providers: [{ provide: API_URL, useValue: '/faux-api' }]
```

Le même mécanisme servira au TP 9 pour les tests d'intégration, et au TP 8 pour
donner une URL différente à une route lazy.

Question 2 (`providedIn: 'root'` + `factory` plutôt qu'un provider dans
`app.config.ts`) : la fabrique fournit un défaut raisonnable et reste
tree-shakable ; un provider explicite dans `app.config.ts` est préférable dès
que la valeur vient vraiment de l'environnement de déploiement. Les deux sont
défendables — dire qu'on commence par le plus simple et qu'on déplacera si le
besoin apparaît.

## Déroulé conseillé

| Temps    | Étape                                                              |
| -------- | ------------------------------------------------------------------ |
| 0-3 min  | Étapes 1-2 : Node et `npm install`, lancés simultanément par tous  |
| 3-8      | Pendant l'installation : présenter le fil rouge Maison&Co           |
| 8-12     | Étape 3 : l'API. Insister sur le terminal dédié                     |
| 12-16    | Étape 4 : `api-url.ts`, puis les deux questions en plénière         |
| 16-20    | Étapes 5-6 : `nx serve`, DevTools                                   |

Profitez du temps d'installation pour parler du projet plutôt que de regarder
une barre de progression.

## Problèmes fréquents

**`npm install` échoue sur des conflits de peers.**
Le `--legacy-peer-deps` est dans l'énoncé mais tout le monde ne le lit pas.
`npm run install:tp` fait la même chose et évite l'oubli.

**Les tests d'API restent rouges alors que l'API tourne.**
Trois causes, dans l'ordre de fréquence : le port 3333 est déjà pris par autre
chose (`lsof -i :3333`), un proxy d'entreprise intercepte `localhost`, ou
l'API a été lancée depuis le mauvais dossier. Le message d'échec des tests
rappelle la commande exacte.

**Le port 4200 est occupé.**
`npx nx serve boutique --port 4300`. Signaler que l'URL de l'API ne change pas
pour autant — c'est justement l'intérêt du jeton.

**Un poste totalement bloqué.**
Le mettre en binôme et continuer. Ne pas retarder le groupe : il y a dix TP
derrière, et le TP 0 n'apporte rien pédagogiquement.

## Ce que ce TP prépare

- `API_URL` sera injecté par `CatalogueApi` au TP 2.
- Le terminal dédié à l'API servira aux modes dégradés des TP 3 et 8.
- Les Angular DevTools sont l'outil central du jour 2 : mieux vaut découvrir
  maintenant qu'ils ne sont pas installés.

## Vérification du corrigé

```bash
npm install --legacy-peer-deps
# dans un second terminal : cd api && npm install && npm start
npm run test:environnement       # environnement : tout vert
npx nx test partage-util     # 4 tests verts
npx nx run-many -t test      # 8 projets
npx nx build boutique        # ~225 kB brut / 61 kB transférés
```
