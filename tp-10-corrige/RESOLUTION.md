# TP 10 — Résolution pas à pas

Fichiers : `libs/catalogue/feature/src/lib/catalogue.page.ts`,
`libs/catalogue/ui/src/lib/carte-produit.component.ts`,
`apps/boutique/project.json`

---

## Étape A — Mesurer d'abord

```bash
npx nx build boutique
```

Chiffres de départ, mesurés sur le projet apprenant :

```
Initial total        302.63 kB brut  |  86.34 kB transféré

Lazy chunk files
  commande-page       68.19 kB
  catalogue-page      13.59 kB
  admin-page           3.09 kB
```

**La question à poser avant toute correction** : pourquoi `commande-page`
pèse-t-il vingt fois `admin-page` ?

Réponse : `@angular/forms/signals`. Et le point important est que **ce poids
n'est pas dans le bundle initial** — il n'est payé que par les utilisateurs
qui ouvrent le tunnel de commande. C'est exactement ce que le lazy loading
achète, et c'est pour ça que le budget `initial` ne le compte pas.

---

## Étape B — Le défaut qui date du TP 4

Dans `catalogue.page.ts` :

```html
<mc-badge-stock [quantite]="stocks.quantite(produit.id)" />
```

Cette ligne a été écrite au TP 4 et elle est restée six TP durant. Ni la revue,
ni les tests, ni le lint ne l'ont signalée.

**Ce qu'elle coûte** : une expression de template est réévaluée à *chaque*
vérification de la vue. Vingt produits, c'est vingt appels par cycle, pour une
valeur qui ne change que toutes les quinze secondes.

### La correction

```ts
protected readonly produitsAvecStock = computed(() =>
  this.facade.produits().map((produit) => ({
    produit,
    quantite: this.stocks.quantite(produit.id),
  })),
);
```

```html
@for (entree of produitsAvecStock(); track entree.produit.id) {
  <li>
    <mc-carte-produit [produit]="entree.produit" (ajouter)="ajouterAuPanier($event)" />
    <mc-badge-stock [quantite]="entree.quantite" />
  </li>
}
```

Un `computed` ne recalcule que si `produits()` ou `stocks()` ont changé. C'est
la même leçon que le panier du TP 5 : **ce qui est dérivable se dérive une
fois, pas à chaque lecture.**

### À dire honnêtement

`quantite()` est une lecture de `Map` : sur vingt produits, le gain réel est
microscopique. **Le point n'est pas le gain, c'est le motif.** Sur une liste de
deux cents lignes avec un calcul de prix dans la liaison, c'est une page qui
rame — et le code a exactement la même forme.

---

## Étape C — Les images

```ts
import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
// …
imports: [CurrencyPipe, NgOptimizedImage],
```

```html
<img [ngSrc]="produit().image" [alt]="produit().nom" width="320" height="240" />
```

`[src]` devient `[ngSrc]`. La directive **exige** `width` et `height` — et c'est
volontaire : une image sans dimensions décale la page quand elle arrive, ce qui
dégrade le CLS.

Elle apporte aussi le chargement paresseux par défaut et la génération des jeux
de sources.

---

## Étape D — Le résultat qui surprend

```bash
npx nx build boutique
```

| | Initial total |
| --- | --- |
| Avant | 302,63 ko |
| Après | **308,12 ko** |

**Le bundle a grossi de 5,5 ko.**

C'est `NgOptimizedImage` : une directive, sa logique de `srcset`, son
chargement paresseux. On a échangé du JavaScript contre de la stabilité
visuelle et des images chargées à la demande.

Sur un catalogue de mobilier où chaque fiche porte une photo de 200 ko,
l'échange est très favorable. **Mais il ne se lit pas dans le rapport de
build.**

> Le bundle n'est pas la performance. Il en est un indicateur, parmi d'autres.

Optimiser l'indicateur plutôt que la chose est l'erreur classique — celle qu'on
commet quand on n'a qu'un seul chiffre à montrer en réunion.

Et pour la correction de l'étape B, le gain est réel mais **invisible ici** :
il se mesure au Profiler, en exécutions évitées, pas en kilo-octets.

---

## Étape E — Verrouiller

```json
"budgets": [
  { "type": "initial", "maximumWarning": "320kB", "maximumError": "350kB" },
  { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
]
```

Les défauts d'Angular sont à **500 ko / 800 ko**. Sur un bundle de 308 ko, ça
laisse passer un triplement sans un mot.

Un budget utile est posé **juste au-dessus de la valeur mesurée** : 320 en
avertissement, 350 en erreur.

### Le faire mordre

Baissez `maximumError` à `200kB` et relancez le build. Il doit refuser.
Remettez ensuite la bonne valeur.

**Un garde-fou qu'on n'a jamais vu se déclencher n'est pas un garde-fou** —
c'est une ligne de configuration dont personne ne sait si elle fonctionne.

### La question sans bonne réponse

À quelle fréquence relève-t-on ces seuils, et qui le remarque ? Un budget
augmenté à chaque sprint sans discussion ne protège pas davantage qu'un budget
à 800 ko.

La pratique qui marche : le relèvement passe en revue de code, avec une phrase
d'explication. Pas de relèvement silencieux.

---

## Les tests de garde-fou

`tools/perf/perf.spec.ts` ne mesure **aucune** performance. Il vérifie que les
garde-fous sont en place :

| Test | Ce qu'il empêche |
| --- | --- |
| budget initial déclaré et **serré** | un budget décoratif |
| avertissement avant erreur | découvrir le dépassement en CI |
| aucun appel **avec argument** dans une liaison | le défaut de l'étape B |
| `track` sur chaque `@for` | la recréation complète du DOM |
| `NgOptimizedImage` sur les images produit | le décalage de mise en page |
| dimensions déclarées | idem |

Notez la précision du troisième : un **signal en lecture** (`facade.filtres()`)
ne prend pas d'argument et ne coûte rien. C'est l'appel **avec argument** qui
refait un calcul à chaque cycle. La première version de ce test les confondait
et produisait un faux positif.

C'est la troisième fois de la formation qu'une règle de revue devient un test —
après les frontières du TP 1 et les souscriptions du TP 3.

---

## Si un test résiste

| Symptôme | Cause |
| --- | --- |
| « budget serré » échoue | `maximumError` encore à 800 ko |
| « appel de méthode » échoue | il reste un `[x]="service.methode(arg)"` dans un template |
| « NgOptimizedImage » échoue | import oublié dans `imports: []`, ou `[src]` au lieu de `[ngSrc]` |
| Le build échoue après les budgets | relevez **votre** valeur et posez le budget dessus |
| Aucune différence au Profiler | normal sur vingt produits — c'est le motif qui compte |
