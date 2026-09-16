# TP 5 — Le panier en signals

**Durée** 60 min

## Le contexte

Le bouton « Ajouter au panier » du TP 2 écrit dans la console. Il est temps
qu'il fasse quelque chose.

Le panier est le cas d'école de la dérivation : un contenu, et une cascade de
montants qui en découlent — sous-total, remise, frais de livraison, total.
Chacun de ces montants pourrait être stocké. Aucun ne doit l'être.

## Comment savoir si vous avez fini

```bash
npx nx test panier-domaine        # 16 rouges au départ
npx nx test panier-data-access    # 14 rouges
npx nx test panier-ui             #  8 rouges
npm run test:structure            # 42 verts
```

38 tests à faire passer. Ils s'enchaînent : commencez par le domaine, le reste
en dépend.
## Les tests bonus

Certains tests sont dans des fichiers `*.bonus.spec.ts`, **exclus par défaut**.
Ils couvrent des cas limites intéressants mais non essentiels.

Pour les activer, retirez la ligne `exclude` du `vite.config.mts` de la
bibliothèque concernée :

```ts
exclude: ['**/*.bonus.spec.ts'],   // ← retirer cette ligne
```

Ne les activez que si vous avez terminé le reste.


## Un nouveau domaine, trois bibliothèques

```
libs/panier/domaine/       type:domaine,     domaine:panier
libs/panier/data-access/   type:data-access, domaine:panier
libs/panier/ui/            type:ui,          domaine:panier
```

Elles sont déjà créées, taguées, et la règle de frontières a été étendue :
`domaine:panier` peut atteindre `domaine:catalogue` (il lui faut `Produit`) et
`domaine:livraison` (il lui faut `coutLivraison`) — mais **pas l'inverse**. Le
catalogue n'a aucune raison de connaître le panier.

Vérifiez-le : `npx nx graph`, et cherchez la flèche qui n'existe pas.

## Étape 1 — Le domaine (16 tests)

`libs/panier/domaine/src/lib/panier.ts`

Huit fonctions, toutes pures, aucune ne modifie son argument. **Cinq vous sont
fournies** — elles sont mécaniques. Trois sont à écrire : `ajouter`,
`changerQuantite` et `versLignesLivrables`, qui portent toutes les règles
intéressantes.

Les règles métier à respecter, chacune couverte par un test :

| Règle | Détail |
| --- | --- |
| Fusion | Ajouter un produit déjà présent additionne les quantités |
| Stock | On ne dépasse jamais le stock disponible |
| Plafond | Ni `QUANTITE_MAX_PAR_LIGNE`, quel que soit le stock |
| Rupture | Un produit à stock nul n'entre pas dans le panier |
| Zéro | Mettre 0 dans le champ quantité **retire la ligne** |
| Prix | C'est le prix **remisé** qui est mémorisé, pas le prix catalogue |
| Traduction | `versLignesLivrables` ne laisse fuir ni le nom ni l'identifiant |

Cette dernière mérite une explication. La livraison n'a besoin que de poids,
volume, quantité et montant. Lui passer le `Produit` complet créerait une
dépendance qui n'a pas lieu d'être — et le test vérifie les clés produites.

Notez aussi que la ligne mémorise `stockDisponible` **au moment de l'ajout**.
Le stock a pu changer depuis : c'est le sujet du TP 8, pas celui-ci.

## Étape 2 — La chaîne de dérivation (le cœur du TP)

`libs/panier/data-access/src/lib/panier.store.ts`

Un seul signal en écriture, privé : `_lignes`. Tout le reste est `computed`.

```
_lignes ──┬─→ nbArticles
          ├─→ estVide
          ├─→ sousTotal ──┬─→ remise ──┐
          │               │            ├─→ total
          └─→ fraisLivraison ──────────┘
```

Aucun montant n'est stocké. Aucun n'est recalculé inutilement : un `computed`
ne s'exécute que si une de ses dépendances a changé, et seulement si quelqu'un
le lit.

Deux pièges que les tests attrapent :

- un panier **vide** ne coûte rien à livrer (sans le cas limite,
  `coutLivraison` reçoit une liste vide et le franco ne s'applique pas) ;
- le total est `sousTotal − remise + fraisLivraison`, arrondi au centime.

## Étape 3 — Les commandes

`ajouter`, `retirer`, `changerQuantite`, `vider`.

Chacune tient en une ligne :

```ts
ajouter(produit: Produit, quantite = 1): void {
  this._lignes.update((panier) => ajouter(panier, produit, quantite));
}
```

**Le store ne contient aucune règle métier.** Il porte un signal et délègue au
domaine. Si vous vous surprenez à écrire un `if` dans le store, la règle est
probablement au mauvais endroit.

Le test « produit une nouvelle référence à chaque modification » verrouille
l'immutabilité — même leçon qu'au TP 4, sur un tableau cette fois.

## Étape 4 — La persistance, et le seul effet du store

Restaurer au démarrage, écrire à chaque changement.

```ts
effect(() => {
  localStorage.setItem(CLE_PERSISTANCE, JSON.stringify(this._lignes()));
});
```

**C'est le seul `effect` du store, et il est légitime** : il synchronise un
système extérieur avec l'état réactif. Il ne calcule rien, il n'écrit dans
aucun signal.

Le critère, à retenir pour la suite : *un `effect` qui appelle `set()` sur un
signal est presque toujours un `computed` déguisé.*

Deux détails que les tests exigent :

- `localStorage` peut lever (navigation privée, quota) — le panier doit
  continuer de fonctionner en mémoire ;
- un contenu stocké illisible ne doit pas empêcher l'application de démarrer.

## Étape 5 — Le code promo (bonus)

> Les tests de cette étape sont dans `panier.store.bonus.spec.ts`, désactivés
> par défaut. Faites-la si vous avez le temps : elle ne conditionne rien de la
> suite.


`appliquerCodePromo(code)` interroge `GET /api/promotions/{code}`.

Trois issues, **trois états distincts** : code accepté, code refusé, panne de
vérification. Afficher « code invalide » quand l'API est en panne est un
mensonge à l'utilisateur, qui va réessayer le même code indéfiniment.

Codes valides pour tester : `BIENVENUE10`, `MEUBLE20`.

## Étape 6 — La ligne modifiable (8 tests)

`libs/panier/ui/src/lib/ligne-panier.component.ts`

C'est le seul endroit de la formation où **`model()`** est justifié :

```ts
readonly quantite = model.required<number>();
```

La quantité est une valeur que le composant lit **et** modifie. Le parent écrit
`[(quantite)]`, le composant appelle `this.quantite.set(...)`.

La règle reste : si le parent ne fait que *réagir* à un événement, un `output()`
suffit. `model()` sert quand la valeur fait l'aller-retour.

Le composant reste un composant de présentation : il ne connaît pas le
`PanierStore`, il reçoit une ligne. Une saisie vide doit produire `0`, pas
`NaN` — un test le vérifie.

## Étape 7 — Brancher

`libs/catalogue/feature/src/lib/catalogue.page.ts`

Remplacez le `console.log` du TP 2 par un vrai appel au store, et ajoutez un
récapitulatif du panier en haut de la page :

```ts
protected readonly panier = inject(PanierStore);

protected ajouterAuPanier(produit: Produit): void {
  this.panier.ajouter(produit);
}
```

```html
<aside class="panier" aria-label="Panier">
  <h2>Panier — {{ panier.nbArticles() }} article(s)</h2>

  @if (panier.estVide()) {
    <p>Votre panier est vide.</p>
  } @else {
    @for (ligne of panier.lignes(); track ligne.produitId) {
      <mc-ligne-panier
        [ligne]="ligne"
        [quantite]="ligne.quantite"
        (quantiteChange)="panier.changerQuantite(ligne.produitId, $event)"
        (supprimer)="panier.retirer($event)"
      />
    }
    <!-- sous-total, livraison, total -->
  }
</aside>
```

**Un mot sur `[quantite]` + `(quantiteChange)`.** C'est la forme décomposée de
`[(quantite)]`. Ici le parent ne garde pas la valeur dans un signal à lui : il
la relaie au store. Écrire `[(quantite)]="ligne.quantite"` ne compilerait pas —
`ligne.quantite` n'est pas un signal en écriture. C'est une bonne illustration
de ce que `model()` fait vraiment : deux liaisons, pas une.

**Une frontière à regarder.** `catalogue/feature` importe maintenant
`panier/data-access` et `panier/ui`. Cette dépendance a dû être autorisée
explicitement dans `eslint.config.mjs` :

```js
{ sourceTag: 'domaine:catalogue', onlyDependOnLibsWithTags: [..., 'domaine:panier', ...] },
```

Et elle ne va **que dans ce sens** : la règle `domaine:panier` ne mentionne pas
de retour vers le catalogue au niveau feature. Le catalogue peut déclencher un
ajout ; le panier n'a aucune raison d'aller afficher un catalogue.

Vérifiez-le : `npx nx graph`, et cherchez la flèche qui n'existe pas.

### Dans le navigateur

- ajouter deux fois le même produit incrémente au lieu de dupliquer ;
- le compteur d'articles se met à jour ;
- changer une quantité recalcule les trois montants ;
- mettre 0 retire la ligne ;
- **rechargez la page** : le panier est toujours là ;
- ajoutez un canapé (1 290 €) : la livraison passe à 0, franco atteint.

## Vérification finale

- [ ] `npx nx run-many -t test` : tout vert
- [ ] `npm run test:structure` : 42 verts
- [ ] `npx nx run-many -t lint` : vert
- [ ] Aucun montant n'est stocké dans un signal en écriture
- [ ] Un seul `effect` dans tout le store
- [ ] Le panier survit à un rechargement

## Les deux questions de fin

1. Combien de `computed` recalculés quand on change la quantité d'une ligne ?
   Et si `total` avait été un signal mis à jour par un `effect` ?
2. `stockDisponible` est figé au moment de l'ajout. Que se passe-t-il si le
   stock tombe à zéro pendant que le produit est au panier ? (réponse au TP 8)

## Pour ceux qui finissent en avance

1. Ajoutez `linkedSignal` pour la quantité affichée dans la page produit :
   elle doit se réinitialiser à 1 quand on change de produit. Comparez avec la
   solution `signal` + `effect` — laquelle a moins de pièges ?
2. Le `JSON.stringify` de l'effet de persistance s'exécute à chaque
   modification, même si le panier n'a pas réellement changé de contenu.
   Comment le savoir ? Faut-il s'en préoccuper ?
