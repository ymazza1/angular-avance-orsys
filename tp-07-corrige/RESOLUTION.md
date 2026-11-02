# TP 7 — Résolution pas à pas

Fichier concerné : `libs/catalogue/data-access/src/lib/catalogue.facade.ts`

---

## Le point de départ

La version RxJS du TP 3, qui fonctionne :

```ts
private readonly demandes = new Subject<Filtres>();

private readonly etat = toSignal(
  this.demandes.pipe(
    filter((f) => rechercheExploitable(f.recherche)),
    debounceTime(DELAI_FRAPPE_MS),
    distinctUntilChanged(memesFiltres),
    switchMap((filtres) =>
      this.api.rechercher(filtres).pipe(
        retry({ count: TENTATIVES, delay: (_, t) => timer(200 * 2 ** (t - 1)) }),
        map((page): EtatCatalogue => ({ page, erreur: null, chargement: false })),
        catchError(() => of({ page: PAGE_VIDE, erreur: 'catalogue_indisponible', chargement: false })),
        startWith({ page: PAGE_VIDE, erreur: null, chargement: true }),
      ),
    ),
  ),
  { initialValue: ETAT_INITIAL },
);
```

Quatorze lignes, neuf opérateurs importés.

---

## Étape A — Garder le temps en RxJS

```ts
private readonly _filtres = signal<Filtres>(FILTRES_VIDES);
readonly filtres = this._filtres.asReadonly();

private readonly filtresApaises = toSignal(
  toObservable(this._filtres).pipe(
    filter((f) => rechercheExploitable(f.recherche)),
    debounceTime(DELAI_FRAPPE_MS),
    distinctUntilChanged(memesFiltres),
  ),
  { initialValue: FILTRES_VIDES },
);
```

Le `Subject` disparaît. On repart directement du signal de filtres.

**Pourquoi `toObservable` ici, alors qu'on l'avait écarté au TP 3 ?** Parce que
l'intention a changé. Au TP 3 on modélisait une *suite de demandes* — un
`Subject` était le bon outil. Ici on dérive un *flux temporel à partir d'un
état*, ce qui est exactement le rôle de `toObservable`.

`filtresApaises` est un signal comme un autre. C'est lui que la ressource va
lire.

---

## Étape B — La ressource

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

**La fonction de requête est réactive.** Elle lit `filtresApaises()` ; chaque
changement relance la requête et annule la précédente. Personne n'appelle
« charger » : c'est la lecture qui crée la dépendance, exactement comme dans un
`computed`.

**`parse` remplace le `map`.** Le DTO devient un objet de domaine avant d'entrer
dans la ressource. `versProduit`, écrit au TP 2, sert tel quel — le mapping n'a
pas été touché depuis.

**`versParams` aussi.** On avait pris soin de l'exporter séparément au TP 2 « pour
être réutilisable par httpResource au TP 7 ». C'est le moment.

À ce stade, `CatalogueApi` n'est même plus injecté par la façade. La ressource
parle directement à `HttpClient` — via les intercepteurs, qui continuent de
s'appliquer.

---

## Étape C — Le piège de `value()`

Version naïve, celle qu'on écrit naturellement :

```ts
readonly produits = computed(() => this.page.value().items);
```

Le test qui tombe :

> expose une erreur sans casser la façade

avec un message limpide :

```
Resource is currently in an error state (see Error.cause for details):
Http failure response for /api/produits: 503 indispo
```

**`value()` lève quand la ressource est en erreur.** Elle ne retombe **pas** sur
`defaultValue` — celui-ci ne sert que pour les états « inactif » et « en
chargement ».

C'est contre-intuitif, et surtout invisible pendant le développement : tant que
l'API répond, tout va bien.

La garde :

```ts
private readonly pageSure = computed<PageProduits>(() =>
  this.page.hasValue() ? this.page.value() : PAGE_VIDE,
);

readonly produits = computed<readonly Produit[]>(() => this.pageSure().items);
readonly total = computed<number>(() => this.pageSure().total);
readonly facettes = computed<Facettes>(() => this.pageSure().facettes);
```

Une seule dérivation protège les trois autres. C'est l'intérêt de dériver plutôt
que de répéter : la garde s'écrit une fois.

---

## Étape D — Les états, gratuits

```ts
readonly enChargement = this.page.isLoading;
readonly erreur = computed<string | null>(() =>
  this.page.error() ? 'catalogue_indisponible' : null,
);

rafraichir(): void {
  this.page.reload();
}
```

`isLoading` est exposé directement — pas besoin de le réexposer dans un
`computed`, c'est déjà un signal.

`erreur` traduit l'erreur HTTP en code métier. On pourrait exposer l'objet brut,
mais les composants n'ont pas à connaître `HttpErrorResponse` : c'est la même
discipline que le mapping DTO du TP 2.

`rafraichir` devient `reload()` — une ligne au lieu d'un `next` sur un Subject.

---

## Étape E — Ce qui a disparu, et ce qui manque

| Dans le pipeline | Devenu |
| --- | --- |
| `switchMap` | annulation intégrée à la ressource |
| `startWith` | `isLoading` |
| `catchError` | `error` |
| `map` | `parse` |
| `toSignal` | la ressource **est** un signal |
| `Subject` + `next` | lecture réactive du signal de filtres |
| `retry` | **rien** |

Le `retry` avec délai croissant n'a pas d'équivalent. Trois options :

1. **S'en passer** — un bouton « réessayer » branché sur `reload()` est souvent
   plus honnête : l'utilisateur sait qu'il a échoué, et décide.
2. **Un intercepteur HTTP** — la reprise devient une politique d'application,
   pas une décision par appel. C'est d'ailleurs souvent sa vraie place, et c'est
   le sujet du TP 8.
3. **`rxResource`** — mêmes signaux en sortie, chargement sous forme
   d'Observable, donc pipe complet conservé.

*« La nouvelle API est plus simple » n'est une bonne réponse que si on sait ce
qu'on a abandonné.*

---

## Le bilan

```bash
git diff --stat
```

Un fichier applicatif. Aucun composant, aucun template, aucun test de composant.

| | TP 3 (RxJS) | TP 7 (ressource) |
| --- | --- | --- |
| Lignes de pipeline | 14 | 6 |
| Opérateurs importés | 9 | 3 |
| Chargement | `startWith` manuel | `isLoading` |
| Erreur | `catchError` | `error` |
| Annulation | `switchMap` | intégrée |
| Reprise automatique | oui | non |

Et surtout : **troisième implémentation de la même façade depuis le TP 2, zéro
composant touché à chaque fois.** C'est la réponse définitive à la question
posée en fin de TP 2.

---

## Si un test résiste

| Symptôme | Cause la plus probable |
| --- | --- |
| `Resource is currently in an error state` | garde `hasValue()` manquante |
| Aucune requête dans le test | `TestBed.tick()` manquant : la ressource est portée par un effet |
| La valeur n'arrive pas après le `flush` | microtâches non consommées (`await Promise.resolve()`) |
| Deux requêtes au démarrage | `initialValue` de `toSignal` différente de l'état initial des filtres |
| Une requête par frappe | le `debounceTime` a été retiré avec le reste du pipeline |
| `params` refusé par le typage | `versParams` renvoie un `HttpParams`, accepté — vérifier l'import |
