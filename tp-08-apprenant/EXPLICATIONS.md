# TP 7 — Corrigé et notes d'animation

**Durée cible** 45 min · **Rouge → vert** 11 tests

## Ce qui a été modifié

**Un seul fichier applicatif** : `catalogue.facade.ts`.

Plus le spec correspondant, réécrit, et la suppression de
`catalogue.facade.bonus.spec.ts` — les tests de reprise du TP 3 n'ont plus
d'objet.

C'est le résultat du TP, et il se montre en une commande :

```bash
git diff --stat
```

## L'argument que ce TP conclut

Depuis le TP 2, la façade a eu **trois implémentations** :

| TP | Implémentation | Composants modifiés |
| --- | --- | --- |
| 2 | promesses + `firstValueFrom` | — |
| 3 | pipeline RxJS + `toSignal` | 0 |
| 7 | `httpResource` | 0 |

Trois fois, la surface publique est restée identique. C'est la réponse à la
question posée en fin de TP 2 (« la façade a-t-elle apporté quelque chose ? »),
et il faut la ressortir explicitement.

## Les points à faire vivre

### `value()` lève en cas d'erreur

C'est **le** piège du TP, et il est vicieux : il ne se manifeste qu'en échec
réseau, donc jamais pendant le développement.

```ts
readonly produits = computed(() => this.page.value().items);        // plante
```

```ts
private readonly pageSure = computed(() =>
  this.page.hasValue() ? this.page.value() : PAGE_VIDE,
);
```

L'énoncé fait écrire la version naïve d'abord. Laissez le test tomber : le
message d'erreur (`Resource is currently in an error state`) est explicite, et
c'est celui qu'ils reverront en production.

*Je l'ai découvert en écrivant les tests de ce TP — j'attendais que
`defaultValue` serve de repli.*

### Le debounce reste en RxJS

Une ressource réagit à un changement de paramètre ; elle ne sait pas attendre.
C'est la frontière posée au jour 1 qui tient : **le temps est le domaine de
RxJS, l'état celui des signaux**.

À souligner : `toObservable` est ici parfaitement à sa place, alors qu'au TP 3
on lui avait préféré un `Subject`. La différence est dans l'intention — ici on
part bien d'un signal d'état pour en dériver un flux temporel.

### Ce qu'on perd

Le `retry` avec délai croissant disparaît. `httpResource` n'a pas d'équivalent.

Ne le passez pas sous silence. Les trois options (bouton « réessayer »,
intercepteur HTTP, `rxResource`) sont dans l'énoncé, et la troisième est
probablement la bonne quand la reprise est vraiment nécessaire — même signaux
en sortie, pipe complet à l'intérieur.

Le message à faire passer : *« la nouvelle API est plus simple » n'est une
bonne réponse que si on sait ce qu'on a abandonné.*

### Tester une ressource

```ts
async function laisserTravaillerLaRessource(): Promise<void> {
  TestBed.tick();              // déclenche l'effet qui porte la ressource
  await Promise.resolve();     // la résolution passe par une microtâche
  await Promise.resolve();
  TestBed.tick();              // propage la nouvelle valeur
}
```

Deux files d'attente distinctes, comme au TP 4 : les faux timers avancent les
`setTimeout`, pas les promesses. C'est le troisième TP où ça mord — à ce stade,
les stagiaires devraient le reconnaître seuls.

## Déroulé conseillé

| Temps | Étape |
| --- | --- |
| 0-8 | Étape 1 : la correspondance opérateur → ressource, à l'oral |
| 8-20 | Étapes 2-3 : la ressource et le debounce conservé |
| 20-30 | Étape 4 : **la version naïve d'abord**, puis la garde `hasValue` |
| 30-38 | Étape 5 : ce qu'on perd, discussion |
| 38-45 | Étape 6 : `git diff --stat` et le tableau comparatif |

L'étape 4 ne se sacrifie pas : c'est le seul moment où ils verront ce piège
dans des conditions contrôlées.

## Points où ça coince

**`Resource is currently in an error state`.**
C'est l'étape 4. Garde `hasValue()` manquante.

**Le test ne voit aucune requête.**
`TestBed.tick()` manquant : une ressource est portée par un effet, qui ne
s'exécute pas tout seul en test.

**La valeur n'arrive pas après le `flush`.**
Les microtâches n'ont pas été laissées passer.

**Deux requêtes au lieu d'une au démarrage.**
Souvent un `toSignal` dont la `initialValue` diffère de l'état initial des
filtres : la ressource part une fois sur l'initiale, une fois sur la vraie.

**Groupe mixte.** Le TP est court et très guidé. Ceux qui avancent vite ont la
piste `StockStore` en fin d'énoncé — elle est substantielle et ouvre le TP 10.

## Ce que ce TP prépare

- **TP 8** : les intercepteurs, dont l'un des usages légitimes est justement la
  reprise automatique évoquée à l'étape 5.
- **TP 10** : la question du coût de RxJS dans le bundle se posera ; ce TP
  montre qu'on peut en retirer une partie sans rien perdre de fonctionnel.

## Vérification du corrigé

```bash
npm install --legacy-peer-deps
npx nx run-many -t test      # 13 projets verts
npx nx run-many -t lint      # vert
npx nx build boutique        # ~289 kB brut / 80 kB transférés
```

Le bundle ne bouge pas : `@angular/common/http` embarquait déjà tout ce qu'il
faut, et les opérateurs RxJS retirés étaient déjà partagés avec le reste de
l'application. Bon point de départ pour le TP 10 — *retirer du code ne réduit
pas mécaniquement le bundle*.
