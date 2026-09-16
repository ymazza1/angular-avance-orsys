# TP 4 — Corrigé et notes d'animation

**Durée cible** 50 min · **Rouge → vert** 18 tests à faire passer

## Un mot sur la conception de ce TP

Le programme initial prévoyait « migrer l'application en zoneless et mesurer ».
**Ce n'est plus possible** : depuis Angular 21, les nouveaux projets sont
zoneless par défaut, et Maison&Co l'est depuis le TP 0. Fabriquer une
application Zone.js pour la migrer aurait été un exercice en costume.

L'exercice a donc été retourné : on ajoute une fonctionnalité qui, **écrite à
l'ancienne, ne se rafraîchit pas**. C'est exactement le problème que les
stagiaires rencontreront sur leurs projets migrés — et il arrive toujours par
là : un timer, un callback de librairie tierce, une mutation en place.

Si votre client a réellement une application Zone.js à migrer, la checklist de
migration reste dans le support (jour 2, section 02). Ce TP en donne la partie
difficile : diagnostiquer ce qui cesse de fonctionner.

## Ce qui a été ajouté

| Fichier | Contenu |
| --- | --- |
| `catalogue/data-access/stock.store.ts` | surveillance périodique du stock, état en `signal<Map>` |
| `catalogue/data-access/stock.store.spec.ts` | 11 tests : surveillance, immutabilité, robustesse, arrêt |
| `catalogue/ui/badge-stock.component.ts` | badge à quatre états |
| `catalogue/ui/badge-stock.component.spec.ts` | 7 tests, dont le rafraîchissement sans `detectChanges` |
| `catalogue/feature/catalogue.page.ts` | `effect` de surveillance + badge dans la grille |
| `tools/structure/zoneless.spec.ts` | **nouveau** : 4 garde-fous |

## Les points à faire vivre

### La mutation silencieuse

C'est **le** message du TP, et il faut le faire découvrir plutôt que l'énoncer.

```ts
this._stocks().set(id, etat);   // ne notifie personne
this._stocks.update((m) => new Map(m).set(id, etat));   // notifie
```

La première ligne compile, ne lève rien, met bien à jour la donnée — et l'écran
ne bouge pas. Aucune erreur, aucun avertissement. C'est le pire type de bug :
celui qui ne se signale pas.

L'étape 1 demande de l'écrire volontairement. Ne la sautez pas, même si vous
êtes en retard : un groupe qui n'a pas vu l'écran figé retiendra « il faut
utiliser update() » comme une règle arbitraire.

La question 3 de l'étape 1 est le cœur : **mettre la Map dans un signal ne
suffit pas**. Le signal surveille sa référence, pas le contenu de ce qu'il
contient. Beaucoup de stagiaires croient que le signal est « profond ».

### `quantite(id)` est une méthode, et c'est réactif quand même

Surprise fréquente. Une méthode qui lit un signal crée la dépendance quand elle
est appelée depuis un template ou un `computed`. Ce n'est pas la méthode qui est
réactive, c'est la lecture qu'elle effectue.

Contre-exemple utile : si `quantite()` renvoyait un **nouvel objet** à chaque
appel, chaque cycle de détection verrait une référence différente et le
composant serait revérifié en permanence. C'est la question posée à l'étape 7.

### Le seul `effect` légitime de la formation

```ts
effect(() => {
  const ids = this.facade.produits().map((p) => p.id);
  if (ids.length > 0) this.stocks.surveiller(ids);
});
```

Il ne calcule rien : il synchronise un service extérieur — une minuterie — avec
un état réactif. C'est exactement le cas d'usage prévu par la documentation
Angular.

Profitez-en pour énoncer le critère : **un `effect` qui appelle `set()` sur un
signal est presque toujours un `computed` déguisé.** On y reviendra au jour 2.

### Le nettoyage à côté de la ressource

```ts
constructor() {
  inject(DestroyRef).onDestroy(() => this.arreter());
}
```

Trois lignes plus haut que le `setInterval` qu'elles libèrent. Un `ngOnDestroy`
en bas de fichier, à quatre-vingts lignes de la ressource, est un nettoyage
qu'on oubliera de mettre à jour le jour où on ajoute une seconde minuterie.

### Quatre états, pas trois

`null` (pas encore chargé), `0` (rupture), `< 5` (tendu), `>= 5` (disponible).

Confondre `null` et `0` fait afficher « Rupture de stock » pendant le
chargement. C'est un bug d'affichage qui coûte des ventes réelles, et il est
extrêmement fréquent. Le premier test du badge le verrouille.

## Le temps virtuel, encore

`vi.useFakeTimers()` permet de tester quinze secondes de polling
instantanément. Nouveauté par rapport au TP 3 : le store utilise
`firstValueFrom`, donc la résolution passe par une **microtâche** que les faux
timers n'avancent pas. D'où le helper :

```ts
const laisserPasserLesPromesses = () => Promise.resolve().then(() => undefined);
```

C'est une subtilité qui vaut trois minutes d'explication : faux timers et
promesses sont deux files d'attente différentes.

## Déroulé conseillé

| Temps | Étape |
| --- | --- |
| 0-12 | Étape 1 : **écrire le mauvais code** et voir l'écran figé. Les 3 questions |
| 12-22 | Étape 2 : l'immutabilité de la Map |
| 22-32 | Étapes 3-4 : surveillance et nettoyage |
| 32-40 | Étape 5 : le badge, et ses quatre états |
| 40-46 | Étape 6 : branchement, vérification navigateur |
| 46-50 | Étape 7 : le Profiler |

Si vous êtes en retard, sacrifiez l'étape 7 (le Profiler revient au TP 10),
jamais l'étape 1.

## Points où ça coince

**« Mes tests de store échouent sur la quantité alors que le flush a eu lieu. »**
La microtâche de `firstValueFrom` n'a pas été laissée passer. `await` sur le
helper.

**Le test « réinterroge à chaque période » ne voit qu'une requête.**
`vi.useFakeTimers()` doit être appelé avant `TestBed.inject(StockStore)`.

**Le badge ne se rafraîchit pas dans le navigateur mais les tests passent.**
Presque toujours le branchement dans la page : `[quantite]="stocks.quantite(produit.id)"`
doit appeler la méthode, pas passer la référence de fonction.

**Les requêtes de stock continuent après avoir quitté la page.**
`StockStore` est `providedIn: 'root'` : il n'est détruit qu'à la fermeture de
l'application, donc `DestroyRef` ne suffit pas pour un changement de route.
C'est un vrai sujet — bonne question à laisser ouverte, la réponse est au TP 8
avec les providers de route.

**Groupe mixte.** L'étape 2 est courte et tout le monde y arrive. Ceux qui
avancent vite peuvent démarrer l'étape 5 (le badge) en parallèle : il ne dépend
pas du store.

## Ce que ce TP prépare

- **TP 5** : `PanierStore` reprend la même discipline d'immutabilité, sur un
  tableau cette fois.
- **TP 7** : `StockStore` est un candidat naturel à `resource()` — la
  surveillance périodique et le nettoyage disparaîtraient. Bonne question à
  poser en fin de TP.
- **TP 10** : les mesures du Profiler de l'étape 7 servent de point de départ.

## Vérification du corrigé

```bash
npm install --legacy-peer-deps
npx nx run-many -t test      # 8 projets verts (40 en data-access, 14 en ui)
npm run test:structure       # 34 verts
npx nx run-many -t lint      # vert
npx nx build boutique        # ~261 kB brut / 74 kB transférés
```

Bundle : 257 → 261 kB depuis le TP 3, pour le store et le badge.
