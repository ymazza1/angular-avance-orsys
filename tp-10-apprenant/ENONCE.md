# TP 10 — Audit et optimisation

**Durée** 45 min

## Le contexte

L'application est complète. Elle fonctionne. Est-elle rapide ?

Ce TP n'est pas un TP de code : c'est un **audit**. On mesure, on diagnostique,
on corrige un point, on re-mesure, et on verrouille pour que la régression ne
revienne pas.

> Aucune optimisation sans mesure préalable. Sans chiffre de départ, il n'y a
> ni preuve d'amélioration, ni détection de régression.

## Comment savoir si vous avez fini

```bash
npm run test:perf        # 3 rouges au départ, 8 verts à la fin
npx nx build boutique    # doit passer sous les budgets que vous aurez posés
```

Les tests de `tools/perf/perf.spec.ts` ne mesurent pas la performance — ils
vérifient que les **garde-fous** sont en place. C'est la même démarche qu'au
TP 1 avec les frontières de modules : ce qui n'est pas vérifié par une machine
finit par ne plus être vrai.

---

## Étape 1 — La mesure de départ (10 min)

**Ne corrigez rien.** Relevez.

### Le bundle

```bash
npx nx build boutique
```

Notez dans un coin :

| Mesure | Votre valeur |
| --- | --- |
| Initial total (brut / transféré) | |
| `commande-page` | |
| `catalogue-page` | |
| `admin-page` | |

**Première question** : pourquoi le tunnel de commande pèse-t-il une vingtaine
de fois le back-office ? Cherchez ce que ce composant importe et que les
autres n'importent pas.

### Le rendu

```bash
npm run api            # dans un terminal dédié
npx nx serve boutique
```

Ouvrez les **Angular DevTools**, onglet *Profiler*, sur la page catalogue.
Enregistrez vingt secondes pendant lesquelles vous **ne touchez à rien**.

| Mesure | Votre valeur |
| --- | --- |
| Nombre de cycles de détection | |
| Composant le plus souvent revérifié | |
| Durée cumulée | |

L'application est zoneless : sans interaction, les seuls cycles viennent du
rafraîchissement de stock, toutes les quinze secondes. Si vous en voyez
beaucoup plus, notez-le — c'est votre premier suspect.

---

## Étape 2 — Lire le rapport (10 min)

Trois choses à chercher dans ce que vous avez relevé.

### Le poids du tunnel de commande

`@angular/forms/signals` représente l'essentiel des 66 ko. C'est le prix d'une
fonctionnalité réelle, pas du gaspillage — mais il est **payé au chargement de
la route**, pas au démarrage. C'est exactement ce que le lazy loading achète.

Question : que se passerait-il si `CommandePage` était importée statiquement
dans `app.routes.ts` ?

### L'appel de service dans un template

Ouvrez `libs/catalogue/feature/src/lib/catalogue.page.ts`, et regardez la
grille de produits :

```html
<mc-badge-stock [quantite]="stocks.quantite(produit.id)" />
```

**Une expression de template est réévaluée à chaque vérification de la vue.**
Cette ligne appelle donc `quantite()` une fois par produit et par cycle — vingt
appels par cycle, pour une valeur qui change toutes les quinze secondes.

Ce n'est pas catastrophique ici : la méthode est bon marché. Le problème est
qu'elle est invisible, qu'elle grossit avec la liste, et que personne ne la
remarque en revue.

### Les images

```html
<img [src]="produit().image" [alt]="produit().nom" width="320" height="240" />
```

Les dimensions sont là — bon réflexe — mais rien n'est optimisé : pas de
chargement paresseux, pas de jeu de sources, pas de priorité sur l'image
principale. Sur un site de mobilier, les visuels dominent le poids des pages.

---

## Étape 3 — Corriger, et mesurer le gain (15 min)

Trois corrections, dans cet ordre.

### 3a — Remplacer l'appel de service par une dérivation

Dans `catalogue.page.ts`, apparier les produits et leur stock **une fois par
changement** plutôt qu'une fois par cycle :

```ts
protected readonly produitsAvecStock = computed(() =>
  this.facade.produits().map((produit) => ({
    produit,
    quantite: this.stocks.quantite(produit.id),
  })),
);
```

Et dans le template :

```html
@for (entree of produitsAvecStock(); track entree.produit.id) {
  <li>
    <mc-carte-produit [produit]="entree.produit" (ajouter)="ajouterAuPanier($event)" />
    <mc-badge-stock [quantite]="entree.quantite" />
  </li>
}
```

Un `computed` ne recalcule que si une de ses dépendances a changé. Relancez le
Profiler sur le même scénario et comparez.

### 3b — Passer les images par NgOptimizedImage

Dans `libs/catalogue/ui/src/lib/carte-produit.component.ts` :

```ts
import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
// …
imports: [CurrencyPipe, NgOptimizedImage],
```

```html
<img [ngSrc]="produit().image" [alt]="produit().nom" width="320" height="240" />
```

`NgOptimizedImage` **exige** `width` et `height` — c'est volontaire : une image
sans dimensions décale la page quand elle arrive, et dégrade le CLS.

### 3c — Mesurer, et accepter le résultat

Rejouez le build.

**Surprise : le bundle a grossi.** De 302,6 ko à environ 308 ko. `NgOptimizedImage`
est du code en plus — une directive, sa logique de `srcset`, son chargement
paresseux.

Ne masquez pas ce résultat, interprétez-le. On a échangé **5,5 ko de JavaScript
contre une meilleure stabilité visuelle et des images chargées à la demande**.
Sur un site de mobilier où chaque fiche porte une photo de 200 ko, l'échange
est très favorable — mais il ne se lit pas dans le rapport de build.

C'est la leçon la plus utile du TP : **le bundle n'est pas la performance**.
Il en est un indicateur, parmi d'autres, et optimiser l'indicateur plutôt que
la chose est une erreur classique.

Pour la correction 3a en revanche, le gain est réel mais invisible au build :
il se voit au Profiler, en nombre d'exécutions évitées.

**Un point à la fois, une mesure avant, une mesure après.** Un audit où l'on
corrige cinq choses d'un coup ne prouve rien.

---

## Étape 4 — Verrouiller (10 min)

Une correction non verrouillée revient. Dans
`apps/boutique/project.json`, configuration `production` :

```json
"budgets": [
  { "type": "initial", "maximumWarning": "320kB", "maximumError": "350kB" },
  { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
]
```

Les budgets par défaut étaient à 500 ko / 800 ko. Sur un bundle de 300 ko, ça
laisse passer un **triplement** sans rien dire. Un budget utile est posé juste
au-dessus de la valeur mesurée — ici 308 ko après vos corrections, donc 320 en
avertissement et 350 en erreur.

Vérifiez qu'il mord :

```bash
npx nx build boutique
```

Puis essayez de le faire échouer volontairement — baissez `maximumError` à
`200kB` et relancez. Le build doit refuser. Remettez la bonne valeur ensuite.

**La question à se poser** : à quelle fréquence faudra-t-il relever ces
seuils, et qui le remarquera ? Un budget qu'on augmente à chaque sprint sans
discussion ne protège de rien non plus.

---

## Vérification finale

- [ ] `npm run test:perf` : 8 verts
- [ ] `npx nx build boutique` : passe sous les budgets
- [ ] `npx nx run-many -t test` : toujours vert
- [ ] Vous avez un chiffre avant et un chiffre après pour chaque correction

---

## La checklist à emporter

C'est le vrai livrable de ce TP. À appliquer sur vos projets, dans cet ordre.

| Point | Vérification |
| --- | --- |
| **Mesure** | Un chiffre avant, un chiffre après, **même scénario** |
| **Détection** | Aucun composant revérifié sans raison au Profiler |
| **Templates** | Aucun appel de fonction coûteuse dans une liaison |
| **Listes** | `track` systématique ; pagination ou virtualisation au-delà du seuil |
| **Bundle** | Budgets actifs et serrés, chunks de routes cohérents |
| **Images** | `NgOptimizedImage`, dimensions fixées, `priority` sur le LCP |
| **Requêtes** | Pas de cascade, annulation des requêtes obsolètes |
| **Tests** | La suite tourne en quelques minutes, pas en quinze |

Ce dernier point n'est pas un détail : une suite lente n'est plus lancée, et
une suite qu'on ne lance plus ne protège plus rien.

---

## Pour ceux qui finissent en avance

1. **`source-map-explorer`** sur `dist/apps/boutique` : qu'est-ce qui pèse
   réellement dans le bundle initial ? La réponse surprend souvent.
2. Ajoutez `priority` sur la première image de la grille uniquement. Comment
   savoir laquelle est responsable du LCP ? (indice : onglet Performance,
   marqueur LCP)
3. Mesurez le temps d'exécution de `npx nx run-many -t test --skip-nx-cache`,
   puis comparez avec `npx nx affected -t test`. Sur quel commit l'écart est-il
   le plus grand ?
