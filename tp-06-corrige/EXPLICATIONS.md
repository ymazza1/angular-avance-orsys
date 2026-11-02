# TP 6 — Corrigé et notes d'animation

**Durée cible** 50 min · **Rouge → vert** 22 tests

## Avertissement sur l'API

Signal Forms est **stable depuis Angular 22**, mais récente. Tout le code de ce
TP a été écrit contre `@angular/forms@22.1.6` et **compilé avec AOT et
`strictTemplates`** — les signatures sont vérifiées, pas supposées. Si vous
montez de version mineure, relancez `nx build` avant la session.

Points d'API confirmés :

| Élément | Forme exacte |
| --- | --- |
| Import | `@angular/forms/signals` |
| Création | `form(modeleSignal, schema)` → `FieldTree` |
| Schéma | `schema<T>((c) => { … })` |
| Directive | `FormField`, sélecteur `[formField]` |
| Champ | `commande.email` |
| État du champ | `commande.email()` → `.value()`, `.errors()`, `.touched()`, `.pending()`, `.valid()`, `.invalid()`, `.dirty()` |
| Erreur | un objet `{ kind, message? }` — pas de fabrique à importer |
| Asynchrone | `validateHttp(path, { request, onSuccess, onError })` |
| Soumission | `submit(form, action)` |

## Ce qui a été ajouté

| Bibliothèque | Fichiers | Tests |
| --- | --- | --- |
| `commande/domaine` (**nouvelle**) | `commande.ts` — 4 fonctions | 11 |
| `commande/feature` (**nouvelle**) | `commande.schema.ts`, `commande.page.ts`, `commande.routes.ts` | 11 |
| racine | `tsconfig.base.json`, `eslint.config.mjs`, `app.routes.ts` | — |

Le workspace passe à **13 projets**.

## Les points à faire vivre

### Le schéma vit hors du composant

C'est la décision structurante du TP. `commande.schema.ts` exporte une fonction
qui prend l'URL de base en paramètre — pas d'injection, pas de dépendance au
composant.

Conséquence, visible dans le spec : **la validation se teste sans monter
d'interface**. Pas de `createComponent`, pas de `fixture`, pas de clic. Onze
tests qui tournent en 130 ms.

Posez la question au groupe : *comment testeriez-vous la même chose avec un
`FormGroup` typé ?* La réponse honnête est qu'on peut le faire aussi — mais
qu'en pratique la construction du `FormGroup` finit dans le composant, et les
tests avec elle.

### Trois états, pas deux

Un formulaire complet dont la validation asynchrone est en cours :

```ts
champs.codePostal().pending()  // true
champs().valid()               // false
champs().invalid()             // false
```

Ni valide ni invalide. C'est ce qui permet de désactiver le bouton **sans**
afficher de message d'erreur — l'utilisateur n'a rien fait de mal, on attend.

J'ai découvert ce comportement en écrivant le test : j'attendais `valid()` à
`true` et j'ai eu `false`. C'est devenu le test le plus intéressant du TP.

### `required` ne marche pas sur un booléen

`required(c.accepteCgv)` ne fait rien d'utile : `false` n'est pas « vide ». Il
faut `validate` et renvoyer une erreur explicite. Les stagiaires tombent
systématiquement dessus, et c'est une bonne illustration de ce que « requis »
veut dire dans un système de validation — non nul, pas « vrai ».

### Le troisième `effect` légitime

```ts
effect(() => {
  const lignes = this.panier.lignes();
  this.modele.update((c) => ({ ...c, mode: modeCorrige(lignes, c.mode) }));
});
```

Il est d'une **autre nature** que les deux précédents (surveillance de stock au
TP 4, persistance au TP 5). Ceux-là synchronisaient un système extérieur.
Celui-ci **répare un état saisi par l'utilisateur** quand le contexte change
sous lui.

Et il écrit dans un signal — ce que j'ai présenté comme suspect depuis le jour 2.
Assumez la nuance : la règle n'est pas « un effet n'écrit jamais », c'est « un
effet ne **calcule** jamais ». Le mode est une donnée saisie, pas une donnée
dérivée : on ne peut pas la recalculer, seulement la corriger.

Si quelqu'un propose un `computed`, faites-lui écrire le code : il perdra la
sélection de l'utilisateur à chaque changement de panier.

### `onError` renvoie `undefined`

Si le service de vérification des codes postaux est en panne, on **n'empêche
pas** la commande. C'est une décision commerciale, pas technique : bloquer
100 % des commandes parce qu'un service auxiliaire est indisponible coûte plus
cher que livrer trois colis dans une zone mal desservie.

À faire dire au groupe plutôt qu'à énoncer — c'est le genre d'arbitrage qui ne
remonte jamais jusqu'au développeur dans la vraie vie.

## Déroulé conseillé

| Temps | Étape |
| --- | --- |
| 0-5 | Montrer l'API : `form`, `schema`, `[formField]`, les trois niveaux de lecture |
| 5-15 | Étape 1 : le domaine. 11 tests, mécaniques |
| 15-28 | Étapes 2-3 : le schéma, **le cœur du TP** |
| 28-40 | Étape 4 : le formulaire dans le navigateur |
| 40-46 | Étape 5 : l'effet de correction, et la discussion |
| 46-50 | Étape 6 : vérification, et la question du `FormGroup` |

## Points où ça coince

**`form() must be called in an injection context`.**
Dans un test, envelopper avec `runInInjectionContext(TestBed.inject(Injector), …)`.
C'est ce que fait le helper `unFormulaire` du spec.

**Le test asynchrone n'attend jamais.**
`validateHttp` s'appuie sur `httpResource` : sans `provideHttpClient()` **et**
`provideHttpClientTesting()`, la requête ne part pas du tout.

**« Mon champ n'est pas lié. »**
Oubli de `FormField` dans les `imports` du composant. En standalone, l'oubli est
silencieux à la compilation et visible seulement au rendu.

**Les messages d'erreur s'affichent d'emblée.**
Il manque le garde `@if (champ().touched())`.

**Groupe mixte.** L'étape 1 est le rattrapage. Ceux qui avancent vite peuvent
attaquer l'étape 2 directement : le schéma ne dépend du domaine que pour
`FORMAT_CODE_POSTAL`.

## Ce que ce TP prépare

- **TP 7** : `validateHttp` est un `httpResource` déguisé. Quand on réécrira la
  façade du catalogue, les stagiaires auront déjà vu le modèle à l'œuvre.
- **TP 8** : la soumission réelle vers `POST /api/commandes`, avec le 409
  `stock_insuffisant` — et la réponse à la question laissée ouverte au TP 5.

## Vérification du corrigé

```bash
npm install --legacy-peer-deps
npx nx run-many -t test      # 13 projets verts
npx nx run-many -t lint      # vert
npx nx build boutique
```
