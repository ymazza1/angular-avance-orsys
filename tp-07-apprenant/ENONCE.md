# TP 7 — Le catalogue en signal-first

**Durée** 45 min

## Le contexte

Souvenez-vous de la question laissée ouverte au TP 3 :

> Comptez les lignes du pipeline. Toute cette mécanique — debounce, annulation,
> retry, états de chargement — existe pour une seule chose : afficher une liste
> de produits qui correspond aux filtres courants.

On va en remplacer l'essentiel par `httpResource`, stable depuis Angular 22.

**Et on ne touchera à aucun composant.** C'est la troisième implémentation de
la même façade depuis le TP 2 ; sa surface publique n'a jamais bougé.

## Comment savoir si vous avez fini

```bash
npx nx test catalogue-data-access    # 11 rouges au départ, 35 verts à la fin
npx nx run-many -t lint              # doit rester vert
git diff --stat                      # un seul fichier applicatif modifié
```

La dernière commande est le vrai résultat du TP. Gardez-la pour la fin.

## Le point de départ

`catalogue.facade.ts` contient la version RxJS du TP 3, qui **fonctionne**.
Ouvrez-la et comptez : quatorze lignes de pipeline, six opérateurs.

## Étape 1 — Ce qui disparaît, et pourquoi

Avant de coder, faites la correspondance à l'oral :

| Dans le pipeline RxJS | Dans la ressource |
| --- | --- |
| `switchMap` | annulation automatique quand le paramètre change |
| `startWith({ chargement: true })` | `isLoading` |
| `catchError` | `error` |
| `map(versProduit)` | option `parse` |
| `toSignal` | la ressource **est** un signal |
| `retry` | **rien** — voir l'étape 5 |

## Étape 2 — La ressource

```ts
private readonly page = httpResource<PageProduits>(
  () => ({ url: `${this.base}/produits`, params: versParams(this.filtresApaises()) }),
  {
    defaultValue: PAGE_VIDE,
    parse: (brut) => {
      const dto = brut as PageDto<ProduitDto>;
      return { items: dto.items.map(versProduit), total: dto.total, facettes: dto.facettes };
    },
  },
);
```

Deux choses à comprendre :

**La fonction de requête est réactive.** Elle lit un signal ; chaque fois que
ce signal change, la requête repart et la précédente est annulée. Personne
n'appelle « charger » — c'est la lecture qui crée la dépendance, comme dans un
`computed`.

**`parse` est le mapping.** Le DTO du serveur devient un objet de domaine avant
même d'entrer dans la ressource. `versProduit`, écrit au TP 2, est réutilisé tel
quel.

## Étape 3 — Le debounce reste en RxJS

```ts
private readonly filtresApaises = toSignal(
  toObservable(this._filtres).pipe(
    filter((f) => rechercheExploitable(f.recherche)),
    debounceTime(DELAI_FRAPPE_MS),
    distinctUntilChanged(memesFiltres),
  ),
  { initialValue: FILTRES_VIDES },
);
```

C'est le seul morceau de pipeline qui survit, et c'est volontaire.

Une ressource réagit à un **changement de paramètre**. Elle ne sait pas
attendre que l'utilisateur ait fini de taper. **Le temps reste le domaine de
RxJS** — c'est la frontière qu'on a posée au jour 1 et qui tient toujours.

Notez que `toObservable` est ici parfaitement à sa place : on part d'un signal
d'état pour construire un flux temporel. C'est l'inverse du TP 3, où on
modélisait une suite de demandes.

## Étape 4 — Le piège de `value()`

Faites d'abord la version naïve :

```ts
readonly produits = computed(() => this.page.value().items);
```

Lancez les tests. Celui qui tombe :

> expose une erreur sans casser la façade

**`value()` lève une exception quand la ressource est en erreur.** Elle ne
retombe pas sur `defaultValue`. C'est contre-intuitif, et ça ne se voit qu'en
situation d'échec réseau — donc jamais pendant le développement.

La garde :

```ts
private readonly pageSure = computed<PageProduits>(() =>
  this.page.hasValue() ? this.page.value() : PAGE_VIDE,
);

readonly produits = computed(() => this.pageSure().items);
readonly total = computed(() => this.pageSure().total);
readonly facettes = computed(() => this.pageSure().facettes);
```

Une seule dérivation protège les trois autres.

## Étape 5 — Ce qu'on perd

Le `retry` avec délai croissant n'a pas d'équivalent dans `httpResource`.

Trois réponses possibles, à discuter :

1. **S'en passer.** Un bouton « réessayer » branché sur `reload()` suffit dans
   beaucoup de cas, et il est plus honnête vis-à-vis de l'utilisateur.
2. **Un intercepteur HTTP** qui gère la reprise pour toute l'application — c'est
   d'ailleurs souvent sa vraie place.
3. **`rxResource`** : mêmes signaux en sortie, mais le chargement est un
   Observable, donc on garde un pipe complet.

Ne tranchez pas trop vite. « La nouvelle API est plus simple » n'est une bonne
réponse que si on sait ce qu'on a abandonné.

## Étape 6 — Le bilan

```bash
git diff --stat
```

Un seul fichier applicatif modifié. Aucun composant, aucun test de composant,
aucun template.

Comparez aussi les deux versions côte à côte :

| | TP 3 (RxJS) | TP 7 (ressource) |
| --- | --- | --- |
| Lignes de pipeline | 14 | 6 |
| Opérateurs importés | 9 | 3 |
| Gestion du chargement | `startWith` manuel | `isLoading` |
| Gestion de l'erreur | `catchError` | `error` |
| Reprise automatique | oui | **non** |
| Annulation | `switchMap` | intégrée |

## Vérification finale

- [ ] `npx nx test catalogue-data-access` : 35 verts
- [ ] `npx nx run-many -t lint` : vert
- [ ] `git diff --stat` ne montre qu'un fichier applicatif
- [ ] Dans le navigateur : taper vite ne déclenche qu'une requête, les
      obsolètes sont annulées
- [ ] Couper l'API : le message d'erreur s'affiche, l'application ne plante pas

## Pour ceux qui finissent en avance

1. `StockStore` (TP 4) est un autre candidat. La surveillance périodique et le
   `DestroyRef` disparaîtraient-ils complètement ? Qu'est-ce qui remplacerait le
   `setInterval` ?
2. Réintroduisez la reprise automatique avec `rxResource`. Combien de lignes
   cela coûte-t-il, et qu'est-ce que ça change à la lisibilité ?
