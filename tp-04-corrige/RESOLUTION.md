# TP 4 — Résolution pas à pas

Fichiers concernés :
`libs/catalogue/data-access/src/lib/stock.store.ts`
`libs/catalogue/ui/src/lib/badge-stock.component.ts`

---

## Étape A — Le piège, démontré hors du TP

L'énoncé fait écrire trois versions d'un compteur dans `CataloguePage`, sans
toucher à `StockStore`. C'est volontaire : la démonstration doit tenir en dix
lignes et fonctionner immédiatement, sans dépendre du code que les stagiaires
n'ont pas encore écrit.

### Version 1 — champ ordinaire

```ts
protected compteurMutable = { valeur: 0 };
setInterval(() => { this.compteurMutable.valeur += 1; }, 1000);
```

La console compte, l'écran reste à 0.

**Sous Zone.js, ça marchait.** Zone.js interceptait le `setInterval`, et à la
fin de la tâche asynchrone il déclenchait un cycle de détection **global**.
Angular revérifiait tout et voyait la nouvelle valeur. Le rafraîchissement était
accidentel : Angular ne savait pas *quoi* avait changé, il revérifiait par
précaution.

C'est aussi, accessoirement, la preuve que l'application est bien zoneless.

### Version 2 — signal, mais muté

```ts
protected compteurSignal = signal({ valeur: 0 });
setInterval(() => { this.compteurSignal().valeur += 1; }, 1000);
```

L'écran reste à 0 **aussi**. C'est l'erreur que presque tout le monde commet.

Mettre la valeur dans un signal ne suffit pas : **le signal surveille sa
référence, pas le contenu de ce qu'il contient.** `.valeur += 1` modifie
l'objet ; la référence que le signal détient est la même qu'avant ; le signal
n'a rien à notifier.

Le signal n'est pas « profond ». Il ne l'a jamais été.

### Version 3 — nouvelle référence

```ts
setInterval(() => {
  this.compteurSignal.update((c) => ({ valeur: c.valeur + 1 }));
}, 1000);
```

L'écran compte.

### La transposition à StockStore

La même erreur, appliquée à une `Map` :

```ts
this._stocks().set(etat.id, etat);                                    // muet
this._stocks.update((m) => new Map(m).set(etat.id, etat));            // notifie
```

`update` reçoit l'ancienne valeur et **doit renvoyer une nouvelle référence**.
`new Map(precedents)` recopie, `.set(...)` renvoie la Map — donc l'expression
produit bien la nouvelle Map.

**Test visé** : « produit une nouvelle référence à chaque mise à jour ». Il
vérifie en plus que l'ancienne Map est intacte :

```ts
expect(store.stocks()).not.toBe(avant);
expect(avant.get('p-001')?.quantite).toBe(12);   // l'ancienne n'a pas bougé
```

C'est plus fort que « ça se rafraîchit » : ça garantit qu'aucun code ne peut
modifier l'état par un chemin détourné.

---

## Étape B — La lecture réactive

```ts
quantite(id: string): number | null {
  return this._stocks().get(id)?.quantite ?? null;
}

estDisponible(id: string): boolean | null {
  return this._stocks().get(id)?.disponible ?? null;
}
```

**Point qui surprend** : c'est une *méthode*, pas un signal — et c'est réactif
quand même. Ce n'est pas la méthode qui est réactive, c'est la **lecture**
`this._stocks()` qu'elle effectue. Appelée depuis un template ou un `computed`,
elle crée la dépendance.

**Contre-exemple utile à donner** : si `quantite()` renvoyait un *nouvel objet*
à chaque appel, chaque cycle de détection verrait une référence différente, et
le composant serait revérifié en permanence. Renvoyer une valeur primitive n'est
pas un détail.

`null` pour « pas encore interrogé » — distinct de `0`. On y revient à
l'étape E.

---

## Étape C — La surveillance périodique

```ts
surveiller(ids: readonly string[]): void {
  this.arreter();                                            // 1
  this._surveilles.set([...ids]);                            // 2
  this.rafraichir();                                         // 3
  this.minuterie = setInterval(() => this.rafraichir(), PERIODE_STOCK_MS);
}

rafraichir(): void {
  for (const id of this._surveilles()) {
    void this.interroger(id);
  }
}
```

Trois décisions dans `surveiller` :

1. **`arreter()` d'abord** — sinon appeler `surveiller` deux fois laisse deux
   minuteries tourner en parallèle. Test visé : « repart de zéro quand on change
   la liste surveillée ».
2. **Copier le tableau** (`[...ids]`) — même raison qu'à l'étape A : on ne
   stocke pas une référence que l'appelant pourrait muter.
3. **Interroger tout de suite** — sinon le premier affichage attend quinze
   secondes. Test visé : « interroge immédiatement chaque produit surveillé ».

```ts
private async interroger(id: string): Promise<void> {
  try {
    this.enregistrer(await firstValueFrom(this.http.get<EtatStock>(`${this.base}/stocks/${id}`)));
  } catch {
    // volontairement ignoré : le badge garde sa dernière valeur connue
  }
}
```

**Pourquoi `firstValueFrom` et pas `subscribe` ?** Parce que le test de
structure du TP 3 interdit `.subscribe(` dans le code applicatif. La contrainte
posée il y a une heure mord ici pour de vrai — c'est volontaire.

**Pourquoi avaler l'erreur ?** Test visé : « ignore une erreur réseau sans
perdre la valeur connue ». Un badge qui repasse à « vérification » à chaque
hoquet réseau est pire que pas de badge du tout.

---

## Étape D — Le nettoyage

```ts
constructor() {
  inject(DestroyRef).onDestroy(() => this.arreter());
}

arreter(): void {
  if (this.minuterie === null) return;
  clearInterval(this.minuterie);
  this.minuterie = null;
}
```

Une minuterie qui survit à son service, c'est une requête HTTP toutes les
quinze secondes jusqu'à la fermeture de l'onglet.

**Où l'écrire compte.** `DestroyRef.onDestroy` dans le constructeur place le
nettoyage à trois lignes de la ressource qu'il libère. Un `ngOnDestroy` en bas
de fichier, à quatre-vingts lignes de distance, est un nettoyage qu'on oubliera
de mettre à jour le jour où on ajoute une seconde minuterie.

**La limite, à signaler** : `StockStore` est `providedIn: 'root'`. Il n'est
détruit qu'à la fermeture de l'application — pas en quittant la route. Les
requêtes continuent donc si on navigue ailleurs. La solution (providers de
route) est au TP 8.

---

## Étape E — Le badge, et le quatrième état

```ts
protected readonly niveau = computed<NiveauStock>(() => {
  const quantite = this.quantite();
  if (quantite === null) return 'inconnu';
  if (quantite === 0) return 'rupture';
  return quantite < SEUIL_STOCK_TENDU ? 'tendu' : 'dispo';
});
```

L'ordre des conditions est le sujet. `null` **avant** `0`, sinon un
`if (!quantite)` traiterait les deux ensemble.

**Afficher « Rupture de stock » pendant le chargement est un bug qui coûte des
ventes.** C'est extrêmement fréquent, et le premier test du badge le verrouille.

Le template suit le `computed`, jamais l'inverse :

```html
<span class="badge" [class]="'badge--' + niveau()" role="status">
  @switch (niveau()) {
    @case ('inconnu') { Stock en cours de vérification }
    @case ('rupture') { Rupture de stock }
    @case ('tendu')   { Plus que {{ quantite() }} en stock }
    @default          { En stock ({{ quantite() }}) }
  }
</span>
```

---

## Étape F — Le test qui résume le TP

```ts
it('se rafraîchit sans detectChanges quand l entrée change', async () => {
  const fixture = await monter(12);
  expect(texte(fixture)).toContain('En stock (12)');

  fixture.componentRef.setInput('quantite', 0);
  await fixture.whenStable();

  expect(texte(fixture)).toContain('Rupture');
});
```

Aucun `detectChanges()`. `setInput` modifie une entrée signal, ce qui marque la
vue ; `whenStable()` attend que le rendu soit passé.

C'est tout ce que demande le zoneless : **que le changement passe par un
signal**. Si ce test échoue, ce n'est jamais un problème de test — c'est que
quelque part, une valeur change sans qu'un signal le sache.

---

## Le branchement dans la page

```ts
effect(() => {
  const ids = this.facade.produits().map((produit) => produit.id);
  if (ids.length > 0) this.stocks.surveiller(ids);
});
```

**C'est un `effect` légitime**, et il y en a peu. Il ne calcule rien : il
synchronise un système extérieur (une minuterie) avec un état réactif.

Le critère à retenir : *un `effect` qui appelle `set()` sur un signal est
presque toujours un `computed` déguisé.*

---

## Si un test résiste

| Symptôme | Cause la plus probable |
| --- | --- |
| La quantité reste `null` après le `flush` | la microtâche de `firstValueFrom` n'a pas été laissée passer (`await laisserPasserLesPromesses()`) |
| « réinterroge à chaque période » ne voit qu'une requête | `vi.useFakeTimers()` appelé après `TestBed.inject` |
| L'écran ne bouge pas, les tests passent | le branchement dans la page : `[quantite]="stocks.quantite(produit.id)"` doit **appeler** la méthode |
| Deux séries de requêtes en parallèle | `arreter()` oublié en tête de `surveiller` |
| Le badge dit « Rupture » au chargement | `null` traité avant `0` dans `niveau()` |
