# TP 5 — Corrigé et notes d'animation

**Durée cible** 60 min · **Rouge → vert** 48 tests à faire passer

## Ce qui a été ajouté

| Bibliothèque | Fichiers | Tests |
| --- | --- | --- |
| `panier/domaine` (**nouvelle**) | `panier.ts` — 8 fonctions pures | 21 |
| `panier/data-access` (**nouvelle**) | `panier.store.ts` — chaîne de dérivation, persistance, code promo | 19 |
| `panier/ui` (**nouvelle**) | `ligne-panier.component.ts` — `model()` | 8 |
| `tools/structure` | `structure.spec.ts` étendu aux trois nouvelles libs | +6 |
| racine | `tsconfig.base.json` et `eslint.config.mjs` étendus | — |

Le workspace passe de 8 à **11 projets**. C'est la première fois qu'on ajoute
un domaine complet : c'est l'occasion de rejouer le TP 1 pour de vrai, avec du
code dedans.

## La dérivation, sujet central

```
_lignes ──┬─→ nbArticles
          ├─→ estVide
          ├─→ sousTotal ──┬─→ remise ──┐
          │               │            ├─→ total
          └─→ fraisLivraison ──────────┘
```

Un seul signal en écriture. Six `computed`. Aucun montant stocké.

L'argument à faire passer : **un total stocké finit toujours par diverger de
son détail.** Pas par malveillance — parce qu'un jour quelqu'un ajoutera un
chemin de modification qui oublie de recalculer. Avec un `computed`, ce chemin
n'existe pas.

La question 1 de fin de TP est là pour ça : demandez-leur de comparer
mentalement avec une version où `total` serait un signal mis à jour par un
`effect`. Combien d'endroits à ne pas oublier ? Que se passe-t-il si deux
effets s'écrivent l'un dans l'autre ?

## Le seul `effect` légitime

```ts
effect(() => {
  localStorage.setItem(CLE_PERSISTANCE, JSON.stringify(this._lignes()));
});
```

Il synchronise un système extérieur avec l'état réactif. Il ne calcule rien, il
n'écrit dans aucun signal.

C'est le deuxième exemple de la formation, après celui du TP 4 (la surveillance
de stock). Les deux ont la même forme : **lire du réactif, écrire dans du non
réactif**. Si la flèche va dans l'autre sens, c'est un `computed`.

À ce stade, les stagiaires ont vu deux effets légitimes et zéro effet de
calcul. C'est la proportion qu'ils doivent retenir.

## `model()` : le seul usage justifié de la formation

```ts
readonly quantite = model.required<number>();
```

La quantité fait l'aller-retour : le composant l'affiche et la modifie.

Le critère à énoncer : si le parent ne fait que *réagir* (« il a cliqué sur
supprimer »), c'est un `output()`. Si la valeur appartient au parent mais que
l'enfant la modifie, c'est un `model()`.

Danger à signaler : `model()` est tentant partout, et il crée un couplage
bidirectionnel qui rend le flux de données plus difficile à suivre. Deux ou
trois par application, pas plus.

## Les règles métier qui surprennent

**Quantité 0 retire la ligne.** Ce n'est pas un raccourci technique : c'est le
geste attendu par l'utilisateur qui efface le champ. Le tester explicitement
évite un débat en revue de code six mois plus tard.

**Le prix est figé à l'ajout.** Le panier mémorise le prix remisé au moment de
l'ajout, pas une référence vers le produit. Si une promotion se termine pendant
que le produit est au panier, le client garde son prix. C'est une décision
commerciale, pas technique — et c'est le genre de règle qu'il faut faire
expliciter par le client avant de coder.

**`stockDisponible` est figé aussi**, et c'est un vrai problème : le stock peut
tomber à zéro pendant que le produit est au panier. La question 2 de fin de TP
la pose sans y répondre — la réponse est au TP 8, avec la vérification à la
commande (l'API renvoie un 409 `stock_insuffisant`).

**`versLignesLivrables` ne laisse rien fuiter.** La livraison n'a pas besoin du
nom ni de l'identifiant. Le test vérifie les clés produites. C'est la même
discipline que le mapping DTO du TP 2, appliquée entre deux domaines internes.

## Trois états, pas deux, pour le code promo

Code accepté, code refusé, panne de vérification.

Afficher « code invalide » quand l'API est en panne est un mensonge à
l'utilisateur, qui va réessayer le même code indéfiniment puis appeler le
support. C'est un exemple concret de ce que coûte un état manquant — et ça se
généralise à tous les appels réseau de l'application.

## Déroulé conseillé

| Temps | Étape |
| --- | --- |
| 0-5 | `nx graph` : montrer les trois nouvelles libs et les flèches autorisées |
| 5-20 | Étape 1 : le domaine. 21 tests, c'est le gros morceau mais il est mécanique |
| 20-35 | Étapes 2-3 : **la chaîne de dérivation**, le cœur du TP |
| 35-43 | Étapes 4-5 : persistance et code promo |
| 43-52 | Étape 6 : `model()` et la ligne modifiable |
| 52-58 | Étape 7 : branchement, vérification navigateur (rechargement de page) |
| 58-60 | Les deux questions de fin |

Si vous êtes en retard, l'étape 5 (code promo) se sacrifie sans dommage — elle
ne conditionne rien de la suite. L'étape 2 ne se sacrifie jamais.

## Points où ça coince

**Le test des frais de livraison sur panier vide échoue.**
Sans le cas limite `estVide() ? 0 : …`, `coutLivraison` reçoit une liste vide,
le montant total vaut 0, le franco ne s'applique pas, et aucune stratégie n'est
sollicitée. Le résultat est 0 par accident — mais sur un autre jeu de règles,
ça ne le serait pas.

**`localStorage is not defined`.**
Seulement si quelqu'un a mis le test du store en environnement `node`. Les libs
`data-access` tournent en `jsdom` : vérifier `vite.config.mts`.

**Le test de persistance ne voit rien dans `localStorage`.**
L'effet n'a pas été exécuté : il faut `TestBed.tick()`. Bonne occasion de
rappeler qu'un `effect` est planifié, pas synchrone — et que c'est précisément
pour ça qu'on ne l'utilise pas pour calculer.

**Le total ne se met pas à jour dans le navigateur.**
Presque toujours une mutation : `this._lignes().push(...)` au lieu de
`this._lignes.update(...)`. Même piège qu'au TP 4, sur un tableau. S'il
réapparaît ici, c'est que le message du TP 4 n'est pas passé — reprenez-le.

**Groupe mixte.** L'étape 1 est longue mais sans difficulté conceptuelle :
c'est le rattrapage naturel. Ceux qui avancent vite peuvent démarrer l'étape 6
en parallèle, elle ne dépend que des types du domaine.

## Ce que ce TP prépare

- **TP 6** : le tunnel de commande consomme `total()` et `lignes()`. Les Signal
  Forms reprendront la même discipline de dérivation.
- **TP 8** : la vérification du stock à la commande, et la réponse à la
  question 2.
- **TP 9** : `PanierStore` est l'exemple type du store testable **sans
  `TestBed`** — enfin, presque : il injecte les stratégies de livraison. Bonne
  discussion sur le coût réel de l'injection en test.

## Vérification du corrigé

```bash
npm install --legacy-peer-deps
npx nx run-many -t test      # 11 projets verts
npm run test:structure       # 42 verts
npx nx run-many -t lint      # vert
npx nx build boutique
```
