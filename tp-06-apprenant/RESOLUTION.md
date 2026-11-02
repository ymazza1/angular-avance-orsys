# TP 5 — Résolution pas à pas

Fichiers concernés :
`libs/panier/domaine/src/lib/panier.ts`
`libs/panier/data-access/src/lib/panier.store.ts`
`libs/panier/ui/src/lib/ligne-panier.component.ts`

---

## Étape A — `ajouter` : trois règles dans huit lignes

```ts
export function ajouter(panier: Panier, produit: Produit, quantite = 1): Panier {
  if (produit.stock <= 0) return panier;                                   // 1

  const existante = panier.find((ligne) => ligne.produitId === produit.id);
  if (!existante) return [...panier, ligneDepuisProduit(produit, quantite)]; // 2

  return remplacer(panier, produit.id, {                                    // 3
    ...existante,
    quantite: borner(existante.quantite + quantite, produit.stock),
  });
}
```

1. **Rupture** — un produit à stock nul n'entre pas. On renvoie le panier
   *reçu*, pas une copie : rien n'a changé, autant préserver la référence.
2. **Nouvelle ligne** — `[...panier, ...]` produit un nouveau tableau. Jamais
   `panier.push(...)`.
3. **Fusion** — un produit déjà présent additionne les quantités. C'est le
   comportement attendu par l'utilisateur qui clique deux fois ; dupliquer la
   ligne serait perçu comme un bug.

`borner` (fourni) fait le double plafonnement : stock disponible **et**
`QUANTITE_MAX_PAR_LIGNE`. Deux tests distincts le vérifient, parce que ce sont
deux règles différentes qui se trouvent partager une implémentation.

**Test à ne pas rater** : « ne modifie pas le panier reçu ». Il est là pour
attraper le `push` réflexe.

---

## Étape B — `changerQuantite` : le zéro qui supprime

```ts
export function changerQuantite(panier: Panier, produitId: string, quantite: number): Panier {
  if (quantite <= 0) return retirer(panier, produitId);          // 1

  const existante = panier.find((ligne) => ligne.produitId === produitId);
  if (!existante) return panier;                                 // 2

  return remplacer(panier, produitId, {
    ...existante,
    quantite: borner(quantite, existante.stockDisponible),       // 3
  });
}
```

1. **Zéro retire la ligne.** Ce n'est pas un raccourci technique : c'est le
   geste de l'utilisateur qui efface le champ quantité. Le tester explicitement
   évite un débat en revue de code six mois plus tard. Les valeurs négatives
   sont traitées pareil — elles ne devraient pas arriver, mais un `<input
   type="number">` en produit très bien.
2. **Produit absent** : on ne crée rien, on renvoie le panier tel quel.
3. **Le plafond vient de la ligne**, pas du produit : `existante.stockDisponible`.
   La ligne a mémorisé le stock au moment de l'ajout, et on n'a pas le produit
   sous la main ici.

---

## Étape C — `versLignesLivrables` : une frontière entre deux domaines

```ts
export function versLignesLivrables(panier: Panier): readonly LigneLivrable[] {
  return panier.map((ligne) => ({
    poidsKg: ligne.poidsKg,
    volumeM3: ligne.volumeM3,
    quantite: ligne.quantite,
    montant: arrondirCentimes(ligne.prixUnitaire * ligne.quantite),
  }));
}
```

La tentation est d'écrire `return panier;` — les `LignePanier` ont déjà tous les
champs nécessaires, TypeScript ne dirait rien.

Le test l'interdit :

```ts
expect(Object.keys(lignes[0]).sort()).toEqual(['montant', 'poidsKg', 'quantite', 'volumeM3']);
```

**Pourquoi ?** La livraison n'a pas besoin du nom ni de l'identifiant du
produit. Les lui donner crée une dépendance qui n'a pas lieu d'être, et le jour
où quelqu'un écrira une règle de livraison basée sur le nom du produit, personne
ne l'arrêtera.

C'est la même discipline que le mapping DTO du TP 2, appliquée cette fois entre
deux domaines internes.

---

## Étape D — La chaîne de dérivation (le cœur du TP)

```ts
private readonly _lignes = signal<Panier>(PANIER_VIDE);

readonly nbArticles   = computed(() => nbArticles(this._lignes()));
readonly estVide      = computed(() => this._lignes().length === 0);
readonly sousTotal    = computed(() => sousTotal(this._lignes()));

readonly fraisLivraison = computed(() =>
  this.estVide() ? 0 : coutLivraison(versLignesLivrables(this._lignes()), this.strategies),
);

readonly remise = computed(() => remise(this.sousTotal(), this._remisePourcent()));

readonly total = computed(() =>
  arrondirCentimes(this.sousTotal() - this.remise() + this.fraisLivraison()),
);
```

Un seul signal en écriture. Six `computed`. **Aucun montant stocké.**

```
_lignes ──┬─→ nbArticles
          ├─→ estVide
          ├─→ sousTotal ──┬─→ remise ──┐
          │               │            ├─→ total
          └─→ fraisLivraison ──────────┘
```

Deux points d'attention :

**Le cas du panier vide.** Sans `estVide() ? 0 : …`, `coutLivraison` reçoit une
liste vide : le montant total vaut 0, le franco ne s'applique pas, aucune
stratégie n'est sollicitée, et le résultat est 0 **par accident**. Sur un autre
jeu de règles de livraison, ça ne le serait pas.

**Un `computed` qui lit un `computed`.** `total` lit `sousTotal`, `remise` et
`fraisLivraison`, qui lisent eux-mêmes `_lignes`. Angular résout le graphe en
profondeur avant toute lecture : on ne peut jamais observer un `total` calculé
avec un `sousTotal` périmé.

### La question à poser au groupe

*Et si `total` était un signal mis à jour par un `effect` ?*

Réponses attendues : il faudrait penser à le recalculer dans chaque chemin de
modification ; deux effets pourraient s'écrire l'un dans l'autre ; et le jour où
quelqu'un ajoute une méthode qui modifie `_lignes` sans passer par les
existantes, le total diverge silencieusement de son détail.

Avec un `computed`, ce chemin n'existe pas.

---

## Étape E — Les commandes, une ligne chacune

```ts
ajouter(produit: Produit, quantite = 1): void {
  this._lignes.update((panier) => ajouter(panier, produit, quantite));
}

retirer(produitId: string): void {
  this._lignes.update((panier) => retirer(panier, produitId));
}

changerQuantite(produitId: string, quantite: number): void {
  this._lignes.update((panier) => changerQuantite(panier, produitId, quantite));
}

vider(): void {
  this._lignes.set(PANIER_VIDE);
  this.retirerCodePromo();
}
```

**Le store ne contient aucune règle métier.** Il porte un signal et délègue au
domaine.

Si vous vous surprenez à écrire un `if` ici, la règle est au mauvais endroit :
elle appartient au domaine, où elle sera testable sans Angular.

`vider()` retire aussi le code promo — une remise qui survit à un panier vidé
est un bug de caisse.

---

## Étape F — La persistance, et le seul effet du store

```ts
constructor() {
  this.restaurer();

  effect(() => {
    const contenu = JSON.stringify(this._lignes());
    try {
      localStorage.setItem(CLE_PERSISTANCE, contenu);
    } catch {
      // stockage plein ou navigation privée : le panier reste en mémoire
    }
  });
}

private restaurer(): void {
  try {
    const brut = localStorage.getItem(CLE_PERSISTANCE);
    if (brut) this._lignes.set(JSON.parse(brut) as Panier);
  } catch {
    // contenu illisible : on repart d'un panier vide plutôt que de planter
  }
}
```

**Pourquoi cet `effect` est légitime** : il lit du réactif et écrit dans du non
réactif. Il ne calcule rien, il n'écrit dans aucun signal. C'est exactement la
forme du deuxième effet vu au TP 4 (la surveillance de stock).

**Les deux `try/catch` ne sont pas de la paranoïa.** `localStorage.setItem` lève
en navigation privée Safari et quand le quota est atteint. `JSON.parse` lève dès
qu'un autre onglet, une ancienne version de l'application ou une extension a
écrit n'importe quoi sous cette clé. Dans les deux cas, le panier doit continuer
de fonctionner.

**En test** : l'effet est *planifié*, pas synchrone. D'où le `TestBed.tick()` :

```ts
store.ajouter(ETAGERE, 2);
TestBed.tick();                    // laisse passer l'effet
expect(JSON.parse(localStorage.getItem(CLE_PERSISTANCE) ?? '[]')).toHaveLength(1);
```

C'est précisément parce qu'un `effect` est planifié qu'on ne s'en sert jamais
pour calculer.

---

## Étape G — `model()` et la ligne modifiable

```ts
readonly ligne = input.required<LignePanier>();
readonly quantite = model.required<number>();
readonly supprimer = output<string>();

protected readonly totalLigne = computed(() => this.ligne().prixUnitaire * this.quantite());
protected readonly stockAtteint = computed(() => this.quantite() >= this.ligne().stockDisponible);

protected surSaisie(valeur: string): void {
  const quantite = Number(valeur);
  this.quantite.set(Number.isFinite(quantite) ? quantite : 0);
}
```

**Trois API, trois usages** — et c'est la distinction à faire passer :

| API | Quand | Ici |
| --- | --- | --- |
| `input()` | le parent donne, l'enfant lit | `ligne` — l'enfant ne la modifie pas |
| `output()` | l'enfant signale, le parent réagit | `supprimer` — le parent décide quoi faire |
| `model()` | la valeur fait l'aller-retour | `quantite` — l'enfant l'affiche et la modifie |

Le parent écrit `[(quantite)]="…"`, l'enfant appelle `this.quantite.set(...)`.

**Le piège** : `Number('')` vaut `0`, mais `Number('abc')` vaut `NaN`. D'où le
`Number.isFinite`. Un `NaN` qui remonte dans le store donne un sous-total `NaN`,
et tous les montants de la page deviennent « NaN € ». Un test le verrouille.

**Avertissement à donner** : `model()` est tentant partout, et il crée un
couplage bidirectionnel qui rend le flux de données difficile à suivre. Deux ou
trois par application, pas plus. C'est le seul de toute la formation.

---

## Étape H — Le branchement, et la frontière qu'il ouvre

```ts
protected readonly panier = inject(PanierStore);

protected ajouterAuPanier(produit: Produit): void {
  this.panier.ajouter(produit);
}
```

### `[quantite]` + `(quantiteChange)` plutôt que `[(quantite)]`

```html
<mc-ligne-panier
  [ligne]="ligne"
  [quantite]="ligne.quantite"
  (quantiteChange)="panier.changerQuantite(ligne.produitId, $event)"
  (supprimer)="panier.retirer($event)"
/>
```

La forme courte `[(quantite)]="ligne.quantite"` ne compile pas : `ligne.quantite`
est un nombre lu dans un tableau, pas un signal en écriture. Le parent ne
*possède* pas cette valeur — il la relaie au store, qui est la seule source de
vérité.

C'est une bonne occasion de montrer ce que `model()` est réellement : **deux
liaisons, pas une**. Le sucre `[(x)]` n'existe que quand les deux côtés
correspondent.

### La frontière qu'on vient d'ouvrir

`catalogue/feature` importe désormais `panier/data-access` et `panier/ui`. La
règle de lint a dû être étendue :

```js
{ sourceTag: 'domaine:catalogue',
  onlyDependOnLibsWithTags: ['domaine:catalogue', 'domaine:panier', 'domaine:livraison', 'domaine:partage'] },
```

**C'est une décision d'architecture, pas un contournement**, et elle mérite
trois minutes en salle.

Pour : « ajouter au panier » depuis une fiche produit est une interaction métier
normale ; l'interdire obligerait à faire remonter un événement jusqu'à un
composant parent qui, lui, aurait le droit — pour le même résultat, en plus
compliqué.

Contre : chaque autorisation de ce type rapproche le workspace du « tout le
monde importe tout le monde ». Le garde-fou est la **direction** : la règle
`domaine:panier` ne mentionne pas de retour vers le catalogue. Le catalogue
déclenche, le panier ne va jamais afficher de catalogue.

La question à poser : *dans six mois, quelle sera la prochaine flèche demandée,
et sur quel critère l'acceptera-t-on ?* S'il n'y a pas de réponse, la matrice
finira permissive.

---

## Si un test résiste

| Symptôme | Cause la plus probable |
| --- | --- |
| « ne modifie pas le panier reçu » échoue | un `push` ou un `.sort()` quelque part |
| Les frais de livraison valent 0 sur un panier non vide | le franco s'applique — c'est peut-être correct, vérifiez le montant |
| Les frais échouent sur panier vide | le cas limite `estVide()` manque |
| `localStorage is not defined` | test lancé en environnement `node` au lieu de `jsdom` |
| Rien dans `localStorage` après un ajout | `TestBed.tick()` manquant : l'effet est planifié |
| Le total ne bouge pas dans le navigateur | une mutation : `this._lignes().push(...)` au lieu de `update` |
| « NaN € » partout | `surSaisie` sans `Number.isFinite` |

---

## Ce qu'on garde pour la suite

- `stockDisponible` est figé au moment de l'ajout. Si le stock tombe à zéro
  pendant que le produit est au panier, rien ne le détecte. **TP 8** : l'API
  renvoie un 409 `stock_insuffisant` à la commande.
- Le `PanierStore` injecte les stratégies de livraison, donc son test a besoin
  d'un `TestBed`. **TP 9** : bonne discussion sur ce que coûte vraiment
  l'injection en test, et sur ce qu'on aurait gagné à passer les stratégies en
  argument.
