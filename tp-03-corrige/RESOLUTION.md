# TP 3 — Résolution pas à pas

Document de démonstration. Chaque section donne le code à écrire, **et la
raison de l'écrire ainsi**. À projeter en direct ou à distribuer après coup.

Fichier concerné : `libs/catalogue/data-access/src/lib/catalogue.facade.ts`

---

## Le point de départ

Le projet contient la façade **naïve** du TP 2, qui fonctionne. Elle porte son
état dans trois signaux privés, et chaque commande déclenche un appel direct :

```ts
private readonly _page = signal<PageProduits>(PAGE_VIDE);
private readonly _chargement = signal(false);
private readonly _erreur = signal<string | null>(null);

rafraichir(): void {
  void this.charger();
}

private async charger(): Promise<void> {
  this._chargement.set(true);
  this._erreur.set(null);
  try {
    this._page.set(await firstValueFrom(this.api.rechercher(this._filtres())));
  } catch {
    this._page.set(PAGE_VIDE);
    this._erreur.set('catalogue_indisponible');
  } finally {
    this._chargement.set(false);
  }
}
```

Trois défauts, et c'est l'étape 1 de l'énoncé que de les voir à l'écran :

1. **une requête par frappe** — `modifier()` appelle `rafraichir()` à chaque
   caractère ;
2. **aucune annulation** — une réponse lente écrase une réponse récente ;
3. **aucune reprise** — une 503 vide la liste, point final.

**Ce qui ne change pas** : les six membres publics (`filtres`, `produits`,
`total`, `facettes`, `enChargement`, `erreur`) et les sept commandes. Aucun
composant ne sera modifié de tout le TP — c'est la démonstration de l'intérêt
de la façade.

---

## Étape A — Remplacer l'état par un état unique

Les trois signaux privés disparaissent au profit d'un seul, qui porte l'état
complet d'un chargement :

```ts
interface EtatCatalogue {
  readonly page: PageProduits;
  readonly erreur: string | null;
  readonly chargement: boolean;
}

const ETAT_INITIAL: EtatCatalogue = { page: PAGE_VIDE, erreur: null, chargement: false };
```

**Pourquoi un seul objet ?** Parce que les trois valeurs changent *ensemble*,
toujours. Avec trois signaux séparés, il existe des combinaisons impossibles —
« en chargement **et** en erreur **et** avec des résultats » — qu'il faut
penser à éviter à la main. Avec un seul objet, ces états n'existent pas.

C'est le même raisonnement que pour le `total` du panier au TP 5 : ce qui peut
être rendu impossible par construction ne se teste pas.

Les six membres publics deviennent des dérivations :

```ts
readonly produits = computed<readonly Produit[]>(() => this.etat().page.items);
readonly total = computed<number>(() => this.etat().page.total);
readonly facettes = computed<Facettes>(() => this.etat().page.facettes);
readonly enChargement = computed<boolean>(() => this.etat().chargement);
readonly erreur = computed<string | null>(() => this.etat().erreur);
```

`filtres` ne bouge pas : il reste `this._filtres.asReadonly()`.

---

## Étape B — Introduire la source d'événements

```ts
private readonly demandes = new Subject<Filtres>();

rafraichir(): void {
  this.demandes.next(this._filtres());
}
```

`charger()` est supprimée : c'est le pipeline qui prendra le relais.

**Pourquoi un `Subject` et pas `toObservable(this._filtres)` ?**

On modélise une *suite de demandes dans le temps*, pas la valeur courante des
filtres — celle-ci est déjà un signal, et elle reste lisible via `filtres()`.

Accessoirement, `toObservable` émet via un `effect`, dont la planification en
zoneless rend les tests non déterministes. Si un stagiaire propose
`toObservable`, c'est une bonne réponse — faites-lui écrire le test et laissez-le
buter sur le flush des effets.

Les sept commandes ne changent pas : elles appellent toujours `modifier()`, qui
appelle toujours `rafraichir()`.

---

## Étape C — Écarter ce qui ne doit pas partir

```ts
this.demandes.pipe(
  filter((f) => rechercheExploitable(f.recherche)),
)
```

**Test visé** : « ne part pas pour une seule lettre ».

`rechercheExploitable` vient du domaine, écrite au TP 2. La règle « on
n'interroge pas le serveur pour une seule lettre » est **métier**, pas
technique : elle n'a rien à faire dans la façade.

Si vous avez réécrit la condition ici, vous avez maintenant deux endroits à
modifier le jour où le seuil passe à trois caractères.

---

## Étape D — Une seule requête par rafale de frappe

```ts
  debounceTime(DELAI_FRAPPE_MS),
  distinctUntilChanged(memesFiltres),
```

**Tests visés** : « ne part qu'une fois pour une frappe rapide » et « ignore une
demande identique à la précédente ».

Le premier test pousse quatre recherches d'affilée (`ca`, `can`, `cana`,
`canapé`), avance le temps de 300 ms, et n'attend **qu'une** requête — portant
le dernier terme.

`debounceTime` n'émet que quand la source **se tait** pendant la durée donnée.
C'est différent de `throttleTime`, qui émet à intervalles réguliers pendant que
ça parle. Pour une saisie clavier, c'est bien le silence qui signale la fin du
mot.

`memesFiltres` est fourni en bas de fichier et compare champ par champ.

**Pourquoi pas `JSON.stringify(a) === JSON.stringify(b)` ?** Ça marche
aujourd'hui. Ça cassera silencieusement le jour où quelqu'un réordonnera les
champs du type `Filtres`, ou y ajoutera une date. Un comparateur explicite
échoue à la compilation quand le type change ; un `stringify` continue de
tourner en donnant de mauvaises réponses.

---

## Étape E — Annuler ce qui est devenu inutile

```ts
  switchMap((filtres) => this.api.rechercher(filtres)),
```

**Tests visés** : « annule la requête précédente au lieu de l'ignorer » et
« n'affiche jamais le résultat d'une recherche abandonnée ».

C'est le cœur du TP. `switchMap` se désabonne du flux interne précédent quand
un nouveau arrive — et pour une requête HTTP Angular, se désabonner **annule la
requête**.

Le second test le montre de façon frappante :

```ts
expect(() => premiere.flush(unePageDto([unDto({ nom: 'PÉRIMÉ' })], 99))).toThrow();
```

Une requête annulée ne peut même plus délivrer sa réponse. Ce n'est pas « on
ignore le résultat », c'est « le résultat n'existe pas ».

**Pourquoi pas `mergeMap` ?** Il laisserait les deux requêtes vivre. La plus
lente arriverait en dernier et écraserait la plus récente — exactement le bug
reproduit à l'étape 1.

**Où `switchMap` serait-il dangereux ?** Sur une action à effet de bord :
valider une commande, envoyer un paiement. Annuler une requête déjà partie ne
garantit pas que le serveur ne l'a pas traitée. Là, c'est `exhaustMap`.

---

## Étape F — Les états, à l'intérieur du switchMap

```ts
  switchMap((filtres) =>
    this.api.rechercher(filtres).pipe(
      retry({ count: TENTATIVES, delay: (_, tentative) => timer(200 * 2 ** (tentative - 1)) }),
      map((page): EtatCatalogue => ({ page, erreur: null, chargement: false })),
      catchError(() =>
        of<EtatCatalogue>({ page: PAGE_VIDE, erreur: 'catalogue_indisponible', chargement: false }),
      ),
      startWith<EtatCatalogue>({ page: PAGE_VIDE, erreur: null, chargement: true }),
    ),
  ),
```

Quatre opérateurs, chacun pour un test.

**`retry`** — test « réessaie deux fois avant d'abandonner ». Le délai croît
(200 ms, 400 ms) : réessayer trois fois en 30 ms sur un serveur qui sature ne
fait qu'aggraver la situation. Notez `tentative - 1` : la première reprise porte
le numéro 1, on veut donc `2 ** 0 = 1`.

**`map`** — traduit une page en état chargé. C'est ici que les trois anciens
`set()` de la version naïve se retrouvent condensés en un seul objet.

**`catchError`** — test « expose l'erreur quand toutes les tentatives
échouent ». Il renvoie un **état**, pas une exception.

**`startWith`** — test « signale le chargement puis le termine ». Placé en
dernier dans le `pipe` interne, il émet **avant** tout le reste, à chaque
nouvelle requête. C'est contre-intuitif : dans un `pipe`, `startWith` s'applique
au flux tel que construit jusque-là, donc il préfixe l'ensemble.

### Le point à démontrer en direct

Déplacez `catchError` **hors** du `switchMap` :

```ts
    switchMap((filtres) => this.api.rechercher(filtres).pipe(retry(…), map(…), startWith(…))),
    catchError(() => of(ETAT_ERREUR)),   // ← à l'extérieur
```

Lancez les tests. Celui qui tombe :

> survit à l'erreur : la recherche suivante fonctionne

Pourquoi ? Une erreur non interceptée remonte le flux et le **termine
définitivement**. Le `Subject` continue d'émettre dans le vide, plus aucune
frappe ne produit quoi que ce soit, et l'utilisateur doit recharger la page.

En production, ça se traduit par « il faut que je rafraîchisse de temps en
temps » — la plainte la plus difficile à diagnostiquer qui soit.

---

## Étape G — Sortir du monde des flux

```ts
private readonly etat = toSignal(
  this.demandes.pipe(/* … */),
  { initialValue: ETAT_INITIAL },
);
```

`toSignal` souscrit **une seule fois**, et se désabonne avec l'injecteur. Il n'y
a aucun `subscribe` manuel dans l'application — le test de structure
`souscriptions.spec.ts` le vérifie.

À partir d'ici, tout est signal. C'est la frontière : RxJS à l'entrée, signals
au centre, template à la sortie. On ne repasse jamais dans l'autre sens.

---

## Le résultat

```ts
private readonly demandes = new Subject<Filtres>();

private readonly etat = toSignal(
  this.demandes.pipe(
    filter((f) => rechercheExploitable(f.recherche)),
    debounceTime(DELAI_FRAPPE_MS),
    distinctUntilChanged(memesFiltres),
    switchMap((filtres) =>
      this.api.rechercher(filtres).pipe(
        retry({ count: TENTATIVES, delay: (_, tentative) => timer(200 * 2 ** (tentative - 1)) }),
        map((page): EtatCatalogue => ({ page, erreur: null, chargement: false })),
        catchError(() =>
          of<EtatCatalogue>({ page: PAGE_VIDE, erreur: 'catalogue_indisponible', chargement: false }),
        ),
        startWith<EtatCatalogue>({ page: PAGE_VIDE, erreur: null, chargement: true }),
      ),
    ),
  ),
  { initialValue: ETAT_INITIAL },
);
```

Quatorze lignes remplacent les trois signaux privés et la méthode `charger()`.

**Le bilan à montrer à l'écran** :

| | Avant (TP 2) | Après (TP 3) |
| --- | --- | --- |
| Signaux privés d'état | 3 | 1 |
| Requêtes pour « canapé » | 6 | 1 |
| Requêtes obsolètes | affichées | annulées |
| Erreur réseau | liste vidée | 2 reprises, puis état d'erreur |
| Composants modifiés | — | **0** |

La dernière ligne est le vrai résultat du TP.

Gardez ce fichier. Au TP 7, on le remplacera par `httpResource` — debounce,
annulation et états de chargement compris.

---

## Si un test résiste

| Symptôme | Cause la plus probable |
| --- | --- |
| `debounceTime` ne se déclenche jamais en test | `vi.useFakeTimers()` appelé **après** `TestBed.inject` |
| Les requêtes ne sont pas annulées | un `mergeMap` déguisé, ou un `subscribe` dans le `switchMap` |
| La deuxième recherche ne part pas | `memesFiltres` compare un champ de trop |
| Le flux meurt après une erreur | `catchError` à l'extérieur du `switchMap` |
| L'état de chargement n'apparaît jamais | `startWith` placé dans le pipe **externe** |
| `charger is not a function` | il reste un appel à l'ancienne méthode, supprimée à l'étape B |
| Rien ne part au premier affichage | `rafraichir()` ne pousse pas dans le `Subject` |
