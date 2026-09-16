# TP 3 — Corrigé et notes d'animation

**Durée cible** 60 min · **Rouge → vert** 16 tests à faire passer, 29 au total

## Ce qui a été ajouté

| Fichier | Modification |
| --- | --- |
| `catalogue.api.ts` | `Promise` → `Observable` sur les deux méthodes ; `firstValueFrom` supprimé |
| `catalogue.facade.ts` | `charger()` remplacé par un pipeline RxJS sur un `Subject<Filtres>` |
| `catalogue.facade.spec.ts` | réécrit : 16 tests, temps virtualisé par `vi.useFakeTimers()` |
| `catalogue.api.spec.ts` | consommation par `firstValueFrom` — rien d'autre ne change |
| `catalogue.page.ts` | `charger()` → `rafraichir()` |
| `tools/structure/souscriptions.spec.ts` | **nouveau** : interdit les `subscribe` manuels |

**La surface publique de la façade n'a pas bougé d'un caractère.** Aucun
composant n'est modifié par ce refactor. C'est l'argument à sortir à ceux qui
trouvaient la façade superflue au TP 2 — et il sera encore plus net au TP 7.

## Les décisions à défendre

### Un `Subject`, pas `toObservable(this._filtres)`

Les deux fonctionnent. Le `Subject` a été retenu pour deux raisons :

1. **Conceptuelle** : ce qu'on modélise est une *suite de demandes dans le
   temps*, pas la valeur courante des filtres — celle-ci est déjà un signal.
   Un flux pour les événements, un signal pour l'état : c'est la frontière
   qu'on installera définitivement au jour 2.
2. **Pratique** : `toObservable` émet via un `effect`, dont la planification en
   zoneless rend les tests non déterministes. Avec un `Subject`, le test
   contrôle exactement quand une demande part.

Si un stagiaire propose `toObservable`, c'est une bonne réponse — faites-lui
écrire le test et laissez-le buter sur le flush des effets. Puis expliquez.

### `catchError` à l'intérieur du `switchMap`

C'est **le** point du TP. Faites-le vivre plutôt que de l'énoncer : demandez à
tout le monde de le placer à l'extérieur, de lancer les tests, et de lire lequel
échoue (« survit à l erreur : la recherche suivante fonctionne »).

L'explication : une erreur non interceptée termine définitivement l'observable.
Le flux externe est mort, le `Subject` continue d'émettre dans le vide, et
l'application semble figée jusqu'au rechargement. En production, ça se traduit
par « il faut que je rafraîchisse de temps en temps » — la plainte la plus
difficile à diagnostiquer qui soit.

### Le délai croissant du `retry`

`timer(200 * 2 ** (tentative - 1))` donne 200 ms puis 400 ms. Trois tentatives
immédiates sur un serveur qui sature ne font qu'aggraver la charge. C'est une
question de politesse envers l'infrastructure, pas d'optimisation client.

### Un test de structure pour les souscriptions

`tools/structure/souscriptions.spec.ts` interdit `.subscribe(` hors des specs.

C'est le deuxième exemple, après les frontières du TP 1, d'une règle
d'architecture transformée en test. Le message à faire passer : quand une règle
revient systématiquement en revue de code, elle mérite d'être automatisée.

## Le temps virtuel dans les tests

`vi.useFakeTimers()` puis `vi.advanceTimersByTime(300)`.

Un `debounceTime(300)` se teste instantanément : le temps devient une variable
qu'on pilote. Sans ça, la suite durerait des dizaines de secondes et serait
instable sur une machine chargée.

À dire explicitement : **jamais de `setTimeout` arbitraire dans un test**. Si un
test attend une durée fixe pour « laisser le temps », il est déjà instable.

Le corollaire est visible dans le test d'annulation : `premiere.flush(...)` lève
une exception, parce qu'une requête annulée ne peut plus répondre. On l'assert
avec `toThrow()` — c'est la démonstration la plus directe de ce que fait
`switchMap`.

## Déroulé conseillé

| Temps | Étape |
| --- | --- |
| 0-10 | Étape 1 : **reproduire le bug** en plénière, API en mode instable |
| 10-15 | Étape 2 : repasser l'API en Observable |
| 15-27 | Étape 3 : filter, debounce, distinct. Compter les requêtes dans le Réseau |
| 27-38 | Étape 4 : `switchMap`, et les deux questions en binôme |
| 38-50 | Étape 5 : retry et **catchError aux deux positions** |
| 50-55 | Étape 6 : `toSignal`, vérification des souscriptions |
| 55-60 | Étape 7 : vérification navigateur, et la question pour le TP 7 |

Ne sacrifiez pas l'étape 1. Un groupe qui n'a pas vu le bug applique
`switchMap` comme une incantation.

## Points où ça coince

**Les tests « expectNone » passent dès le départ.**
Trois des treize tests verts au démarrage le sont pour une mauvaise raison :
aucune requête ne part puisque rien ne fonctionne. Ce n'est pas grave, mais si
un stagiaire le remarque, félicitez-le — c'est exactement le réflexe qu'on veut.
C'est aussi l'occasion de rappeler qu'un test qui passe n'est pas forcément un
test qui teste.

**« Mes requêtes ne sont pas annulées dans le Réseau. »**
Presque toujours un `mergeMap` déguisé, ou un `subscribe` dans le `switchMap`.

**Le `debounceTime` ne se déclenche jamais en test.**
`vi.useFakeTimers()` doit être appelé **avant** `TestBed.inject(CatalogueFacade)` :
le pipeline est construit à l'injection.

**`distinctUntilChanged` bloque une recherche légitime.**
Si la comparaison inclut un champ qui ne devrait pas compter, ou en oublie un,
le symptôme est « ma deuxième recherche ne part pas ». Le test « ignore une
demande identique » et celui sur la page 1 encadrent ça.

**Groupe mixte.** L'étape 3 est le rattrapage naturel : donnez les trois
opérateurs à ceux qui peinent et faites-les démarrer à l'étape 4, qui est le
vrai sujet. Personne ne doit rater `switchMap`.

## Ce que ce TP prépare

- **TP 4** : cette façade est le premier candidat au passage zoneless. Elle
  n'utilise déjà que des signaux en sortie.
- **TP 7** : le pipeline entier sera remplacé par `httpResource` — debounce,
  annulation et états de chargement compris. Demandez-leur de garder ce fichier.
- **TP 9** : `vi.useFakeTimers()` et le `TestScheduler` reviendront ; les
  stagiaires auront déjà le réflexe du temps virtuel.

## Vérification du corrigé

```bash
npm install --legacy-peer-deps
npx nx run-many -t test      # 8 projets verts
npm run test:structure       # 30 verts
npx nx run-many -t lint      # vert
npx nx build boutique        # ~257 kB brut / 73 kB transférés
```

Le bundle passe de 254 à 257 kB entre le TP 2 et le TP 3 : trois kilo-octets
pour tout l'outillage de flux, parce que RxJS était déjà embarqué par
`HttpClient` et que seuls les opérateurs utilisés s'ajoutent. À ressortir au
TP 10, quand la question « combien coûte RxJS ? » se posera.
