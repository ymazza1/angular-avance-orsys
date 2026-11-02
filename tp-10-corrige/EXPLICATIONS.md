# TP 10 — Corrigé et notes d'animation

**Durée cible** 45 min · **Rouge → vert** 3 tests sur 8

## Ce qui a été modifié

| Fichier | Modification |
| --- | --- |
| `libs/catalogue/feature/src/lib/catalogue.page.ts` | `produitsAvecStock` remplace l'appel de service dans le template |
| `libs/catalogue/ui/src/lib/carte-produit.component.ts` | `NgOptimizedImage` et `[ngSrc]` |
| `apps/boutique/project.json` | budgets resserrés : 320 / 350 ko |
| `tools/perf/perf.spec.ts` | **nouveau** — 8 garde-fous |
| `package.json` | script `test:perf` |

## Le défaut corrigé est réel, et il date du TP 4

```html
<mc-badge-stock [quantite]="stocks.quantite(produit.id)" />
```

Cette ligne a été écrite au TP 4 et elle est restée six TP durant. Personne ne
l'a signalée — ni en revue, ni dans les tests, ni au lint.

**C'est l'intérêt pédagogique du TP** : le défaut n'a pas été fabriqué pour
l'exercice, il s'est installé naturellement. Dites-le. C'est exactement
comme ça qu'ils arrivent en production.

Ce qu'elle coûte : une expression de template est réévaluée à **chaque**
vérification de la vue. Vingt produits, c'est vingt appels par cycle, pour une
valeur qui change toutes les quinze secondes.

La correction est un `computed`, c'est-à-dire la même leçon que le panier du
TP 5 : *ce qui est dérivable se dérive une fois, pas à chaque lecture.*

**Soyez honnête sur l'ordre de grandeur.** `quantite()` est une lecture de
`Map` : le gain réel est microscopique sur vingt produits. Le point n'est pas
le gain, c'est le motif — sur une liste de deux cents lignes avec un calcul de
prix, c'est une page qui rame.

## Le résultat contre-intuitif : le bundle grossit

Mesures réelles, vérifiées :

| | Initial total |
| --- | --- |
| Avant corrections | 302,6 ko |
| Après corrections | **308,1 ko** |

`NgOptimizedImage` ajoute 5,5 ko — c'est une directive avec sa logique de
`srcset` et de chargement paresseux.

**Ne masquez pas ce résultat, exploitez-le.** On a échangé 5,5 ko de JavaScript
contre une meilleure stabilité visuelle et des images chargées à la demande.
Sur un catalogue de mobilier où chaque fiche porte une photo de 200 ko,
l'échange est très favorable — mais il ne se lit pas dans le rapport de build.

C'est probablement la leçon la plus utile du TP : **le bundle n'est pas la
performance.** Il en est un indicateur parmi d'autres, et optimiser
l'indicateur plutôt que la chose est une erreur classique — celle qu'on
commet quand on a un seul chiffre à montrer en réunion.

Pour la correction 3a (le `computed`), le gain est réel mais **invisible au
build** : il se voit au Profiler, en exécutions évitées.

## Les budgets : le vrai sujet du bloc 4

Les budgets par défaut d'Angular sont à **500 ko / 800 ko**. Sur un bundle de
300 ko, ça laisse passer un triplement sans un mot.

Un budget utile est posé **juste au-dessus de la valeur mesurée** :

```json
{ "type": "initial", "maximumWarning": "320kB", "maximumError": "350kB" }
```

Faites-leur tester que ça mord : baisser `maximumError` à `200kB`, relancer le
build, voir l'échec. Un garde-fou qu'on n'a jamais vu se déclencher n'est pas
un garde-fou.

La question qui vient ensuite, et qui n'a pas de bonne réponse : **à quelle
fréquence relève-t-on ces seuils, et qui le remarque ?** Un budget augmenté à
chaque sprint sans discussion ne protège de rien non plus.

## Pourquoi des tests pour ça

`tools/perf/perf.spec.ts` ne mesure aucune performance. Il vérifie que les
garde-fous existent : budgets serrés, pas d'appel de service dans une liaison,
`track` partout, images avec dimensions.

C'est la troisième fois de la formation qu'on transforme une règle de revue en
test — après les frontières du TP 1 et les souscriptions du TP 3. Le fil
conducteur à rappeler :

> Une règle d'architecture qui n'est pas vérifiée par une machine n'existe pas.

## Déroulé conseillé

| Temps | Étape |
| --- | --- |
| 0-10 | Étape 1 : **mesurer, sans rien corriger** |
| 10-20 | Étape 2 : lire le rapport, les trois défauts |
| 20-35 | Étape 3 : corriger un point à la fois, re-mesurer |
| 35-45 | Étape 4 : les budgets, et la question de leur relèvement |

Si vous êtes en retard : gardez l'étape 1 et le rapport de build, sautez les
corrections, et finissez sur la checklist. **La méthode vaut plus que les
corrections.**

## Points où ça coince

**« Je ne vois aucune différence au Profiler. »**
Normal sur vingt produits. C'est l'occasion de dire que l'optimisation
prématurée existe aussi en front, et que le bon réflexe est de mesurer avant
de corriger — pas l'inverse.

**`NgOptimizedImage` refuse l'image.**
Il exige `width` et `height`, et refuse une `src` en `data:`. Nos images sont
des chemins relatifs vers des fichiers qui n'existent pas dans l'API de
démonstration : les images sont cassées de toute façon, et c'est sans
conséquence pour l'exercice. Signalez-le avant qu'on vous le demande.

**Le build échoue après avoir posé les budgets.**
C'est possible si leur bundle a dérivé pendant les TP précédents. Faire relever
la valeur réelle et poser le budget dessus, plutôt que de recopier la mienne.

**Un stagiaire veut optimiser le tunnel de commande (66 ko).**
Bonne intuition, mauvaise cible : ce poids est déjà payé en lazy loading, donc
seulement par ceux qui commandent. Le budget `initial` ne le compte pas.
Bonne occasion d'expliquer la différence entre poids initial et poids total.

## Ce que ce TP clôt

C'est le dernier. Les quatre messages à répéter en sortant :

1. **La façade a été réécrite trois fois, zéro composant touché.**
2. **Une règle non vérifiée par une machine n'existe pas.**
3. **`canMatch`, pas `canActivate`** — et le serveur tranche de toute façon.
4. **Un test qui passe ne prouve rien tant qu'on n'a pas vérifié qu'il sait
   échouer.**

## Vérification du corrigé

```bash
npm install --legacy-peer-deps
npm run test:perf            # 8 verts
npx nx run-many -t test      # 17 projets verts
npx nx build boutique        # passe sous 350 kB
```
