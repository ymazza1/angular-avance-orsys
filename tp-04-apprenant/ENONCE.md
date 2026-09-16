# TP 4 — Le stock temps réel, et pourquoi il ne s'affiche pas

**Durée** 50 min

## Le contexte

Le catalogue affiche un stock figé : celui qui était en base au moment de la
requête. Sur un site de mobilier où il reste parfois trois exemplaires, ça ne
suffit pas.

On ajoute donc une surveillance du stock, rafraîchie à intervalle régulier. Et
c'est là que les choses deviennent intéressantes : **cette mise à jour se
produit en dehors de tout événement Angular**.

Sous Zone.js, ça marchait sans qu'on se pose de questions — Zone.js
interceptait le `setInterval` et déclenchait un cycle de détection global.
Notre application est zoneless. Rien n'intercepte plus rien.

## Comment savoir si vous avez fini

```bash
npx nx test catalogue-data-access    # 10 rouges au départ
npx nx test catalogue-ui             #  7 rouges au départ
npm run test:structure               # 34 verts, dont 4 nouveaux
```
## Les tests bonus

Certains tests sont dans des fichiers `*.bonus.spec.ts`, **exclus par défaut**.
Ils couvrent des cas limites intéressants mais non essentiels.

Pour les activer, retirez la ligne `exclude` du `vite.config.mts` de la
bibliothèque concernée :

```ts
exclude: ['**/*.bonus.spec.ts'],   // ← retirer cette ligne
```

Ne les activez que si vous avez terminé le reste.


Quatre tests de structure ont été ajoutés : ils vérifient que Zone.js n'est ni
une dépendance, ni un polyfill, qu'aucun `NgZone` n'est injecté, et qu'aucun
`detectChanges()` ne traîne dans le code applicatif. Ils passent déjà — à vous
de ne pas les casser, et l'étape 1 va vous en donner l'envie.

## Étape 1 — Voir le bug, pour de vrai

**Avant d'écrire le bon code, écrivez le mauvais.** Dix lignes suffisent, et
elles ne dépendent d'aucun code du TP : on les met directement dans
`CataloguePage`, on observe, on efface.

### Version 1 — un champ ordinaire

```ts
// dans CataloguePage, temporairement
protected compteurMutable = { valeur: 0 };

constructor() {
  this.facade.rafraichir();
  setInterval(() => {
    this.compteurMutable.valeur += 1;
    console.log('en mémoire :', this.compteurMutable.valeur);
  }, 1000);
}
```

```html
<p>Compteur : {{ compteurMutable.valeur }}</p>
```

Lancez l'application. **La console compte, l'écran reste à 0.**

C'est aussi la preuve que l'application est bien zoneless : sous Zone.js, ce
code se rafraîchirait — Zone.js intercepterait le `setInterval` et
déclencherait un cycle global.

### Version 2 — un signal, mais muté

```ts
protected compteurSignal = signal({ valeur: 0 });

setInterval(() => {
  this.compteurSignal().valeur += 1;    // mutation de l'objet contenu
}, 1000);
```

```html
<p>Compteur : {{ compteurSignal().valeur }}</p>
```

**L'écran reste à 0 lui aussi.** C'est le piège central du TP : mettre la
valeur dans un signal ne suffit pas. Le signal surveille **sa référence**, pas
le contenu de ce qu'il contient. `.valeur += 1` ne change pas la référence, le
signal n'a rien à notifier.

### Version 3 — une nouvelle référence

```ts
setInterval(() => {
  this.compteurSignal.update((c) => ({ valeur: c.valeur + 1 }));
}, 1000);
```

**L'écran compte.**

### Les trois questions

À traiter en binôme avant de continuer :

1. Pourquoi la version 1 fonctionnait-elle sous Zone.js ?
2. En zoneless, qu'est-ce qui aurait dû prévenir Angular ?
3. La version 2 échoue alors que la valeur est dans un signal. Formulez la
   raison en une phrase — c'est celle que vous répéterez à vos collègues.

**Effacez ensuite ces trois versions.** Elles ont servi ; le reste du TP
applique la leçon à `StockStore`, où la valeur mutée sera une `Map`.

## Étape 2 — L'état, correctement

`libs/catalogue/data-access/src/lib/stock.store.ts`

Écrivez `enregistrer`, `quantite` et `estDisponible`.

La règle : **chaque mise à jour produit une nouvelle Map.**

```ts
this._stocks.update((precedents) => new Map(precedents).set(etat.id, etat));
```

Le test « produit une nouvelle référence à chaque mise à jour » vérifie que
l'ancienne Map est intacte. C'est plus fort que « ça se rafraîchit » : ça
garantit qu'aucun code ne peut modifier l'état par un chemin détourné.

Notez que `quantite(id)` est une **méthode**, pas un signal — mais comme elle
lit `this._stocks()`, l'appeler dans un template crée bien la dépendance. C'est
un point qui surprend souvent.

## Étape 3 — La surveillance

`surveiller(ids)`, `rafraichir()` et `interroger(id)`.

- `surveiller` arrête la surveillance précédente, interroge immédiatement, puis
  programme un rafraîchissement toutes les `PERIODE_STOCK_MS`.
- Une erreur réseau ne doit **pas** effacer la dernière valeur connue : un
  badge qui repasse à « vérification » à chaque hoquet réseau est pire que pas
  de badge du tout.
- **Pas de `subscribe`** : le test de structure du TP 3 l'interdit toujours.
  `firstValueFrom` suffit pour une requête qui n'émet qu'une fois.

## Étape 4 — Le nettoyage

`arreter()`, et son appel automatique à la destruction.

Une minuterie qui survit à son service, c'est une requête HTTP toutes les
quinze secondes jusqu'à la fermeture de l'onglet.

```ts
inject(DestroyRef).onDestroy(() => this.arreter());
```

Déclarez-le dans le constructeur, **au même endroit que la ressource qu'il
libère**. Un nettoyage écrit à cinquante lignes de distance est un nettoyage
qu'on oubliera de mettre à jour.

## Étape 5 — Le badge

`libs/catalogue/ui/src/lib/badge-stock.component.ts`

Quatre états, et le premier est celui qu'on oublie toujours :

| Quantité | Affichage |
| --- | --- |
| `null` | Stock en cours de vérification |
| `0` | Rupture de stock |
| `< 5` | Plus que N en stock |
| `>= 5` | En stock (N) |

**`null` n'est pas `0`.** Afficher « Rupture de stock » pendant le chargement
est un bug d'affichage qui coûte des ventes.

Le niveau se calcule dans un `computed`, jamais dans le template.

Un test mérite votre attention : « se rafraîchit sans detectChanges quand
l'entrée change ». Aucun `detectChanges()`, juste `setInput` puis
`await whenStable()`. C'est tout ce que demande le zoneless : que le changement
passe par un signal.

## Étape 6 — Brancher dans la page

Dans `CataloguePage`, surveiller le stock des produits affichés et afficher le
badge.

```ts
effect(() => {
  const ids = this.facade.produits().map((produit) => produit.id);
  if (ids.length > 0) this.stocks.surveiller(ids);
});
```

**C'est un `effect` légitime** — et il y en a peu. Il ne calcule rien : il
synchronise un service extérieur (une minuterie) avec un état réactif. Si vous
vous surprenez à écrire un `effect` qui fait `set()` sur un autre signal, c'est
un `computed` qu'il vous faut.

Vérifiez dans le navigateur, API lancée : les badges se mettent à jour tout
seuls. Puis modifiez un stock directement côté API et attendez quinze secondes.

## Étape 7 — Mesurer

Ouvrez les **Angular DevTools**, onglet *Profiler*, et enregistrez trente
secondes d'inactivité sur la page catalogue.

Questions :

- combien de cycles de détection sont déclenchés par les rafraîchissements de
  stock ?
- quels composants sont revérifiés ? Uniquement les badges, ou toute la grille ?
- que se passerait-il si `quantite()` renvoyait un nouvel objet à chaque appel
  au lieu d'un nombre ?

Gardez ces chiffres : on les comparera au TP 10.

## Vérification finale

- [ ] `npx nx run-many -t test` : tout vert
- [ ] `npm run test:structure` : 34 verts
- [ ] Les badges se mettent à jour sans intervention
- [ ] Aucun `detectChanges()` ni `NgZone` dans le code
- [ ] En quittant la page catalogue, les requêtes de stock s'arrêtent
      (onglet Réseau)

## Pour ceux qui finissent en avance

1. Le `setInterval` continue de tourner quand l'onglet est en arrière-plan.
   Suspendez la surveillance sur l'événement `visibilitychange`. Où placer ce
   code pour qu'il reste testable ?
2. Remplacez le `setInterval` par un flux RxJS (`interval` + `switchMap`).
   Qu'est-ce que ça simplifie ? Qu'est-ce que ça complique ? Et le test de
   structure sur les `subscribe`, comment le respecter ?
