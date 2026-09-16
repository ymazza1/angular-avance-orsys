# TP 2 — Corrigé et notes d'animation

**Durée cible** 60 min · **Rouge → vert** 60 tests à faire passer, 62 au total

## Ce qui a été ajouté

| Bibliothèque | Fichiers | Contenu |
| --- | --- | --- |
| `catalogue/domaine` | `produit.ts`, `filtres.ts` | 4 + 3 fonctions métier, aucun import framework |
| `catalogue/data-access` | `produit.dto.ts`, `catalogue.api.ts`, `catalogue.facade.ts` | mapping, adaptateur HTTP, façade |
| `catalogue/ui` | `carte-produit.component.ts` | template complété, 3 `computed` |
| `catalogue/feature` | `catalogue.page.ts`, `catalogue.routes.ts` | page routée |
| `livraison/domaine` | `strategies.ts` | 2 stratégies + `coutLivraison` |
| `livraison/data-access` | `strategies.providers.ts` | multi-providers |
| `apps/boutique` | `app.routes.ts` | route racine en lazy |

Répartition des tests : domaine catalogue 19, livraison 11, providers 3,
data-access 22, ui 7.

## Les quatre décisions à défendre

### 1. Le DTO ne ressemble pas au modèle — volontairement

C'est le point que les stagiaires trouvent le plus « gratuit ». L'argument qui
porte : demandez-leur ce qui se passe si l'API renomme `prix_ttc` en
`prix_ttc_eur`. Avec le mapping : un fichier. Sans : un `grep` dans toute
l'application, et un composant oublié.

Le dernier test de `produit.dto.spec.ts` verrouille ça explicitement.

### 2. La façade expose de l'état, pas des Observables

Trois conséquences concrètes, à énoncer :

- un composant ne peut pas s'abonner, donc ne peut pas fuiter ;
- un composant ne peut pas modifier l'état sans passer par une méthode nommée ;
- l'implémentation est remplaçable — ce qu'on fera au TP 7.

### 3. `charger()` ne rejette jamais

C'est la décision la plus discutable du TP, et il faut l'assumer comme telle.

Une erreur réseau sur un catalogue n'est pas exceptionnelle : c'est un état
d'affichage normal. La transformer en exception oblige chaque appelant à écrire
un `catch`, et le premier qui oublie casse la page.

Le contre-argument légitime : on perd la distinction entre « erreur 503 » et
« erreur 404 ». Réponse : si cette distinction devient nécessaire, l'erreur
exposée devient un objet typé, pas une exception qui remonte.

### 4. Le `switch` qu'on n'a pas écrit

Les stratégies de livraison auraient tenu en huit lignes :

```ts
if (ligne.poidsKg >= 50 || ligne.volumeM3 >= 1) return 49;
return 9.9 + (ligne.quantite - 1) * 2;
```

Il faut le dire. À ce niveau de complexité, le `switch` est plus simple et le
pattern Stratégie est sur-dimensionné. Ce qui le justifie, c'est la trajectoire :
un e-commerce de meubles finit toujours avec des règles par transporteur, par
région, par créneau. Et surtout, l'exercice montre **où** ce genre de règle doit
vivre.

La bascule à énoncer : on passe au pattern quand ajouter une règle oblige à
modifier du code déjà testé.

## Déroulé conseillé

| Temps | Étape |
| --- | --- |
| 0-5 | Lancer `npx nx run-many -t test`, montrer les 60 rouges, ouvrir un `--watch` |
| 5-15 | Étapes 1-2 : le domaine. Tout le monde y arrive, c'est voulu |
| 15-25 | Étape 3 : DTO et API. Le mapping surprend, prévoir la discussion |
| 25-40 | Étape 4 : la façade. **C'est le cœur du TP** |
| 40-48 | Étapes 5-6 : carte + page, puis vérification dans le navigateur |
| 48-58 | Étape 7 : les stratégies |
| 58-60 | La question de fin, en plénière |

Si vous prenez du retard, sacrifiez l'étape 7 : les stratégies sont autonomes
et se rattrapent au TP 5, quand le panier aura besoin du coût de livraison.

## Points où ça coince

**Le test d'arrondi échoue de quelques centimes.**
`Math.round(x * 100) / 100` et pas `toFixed(2)` — qui renvoie une chaîne.

**« Mon `appliquer` remet toujours en page 1. »**
Il faut distinguer « la modification contient `page` » de « la modification
contient autre chose ». L'opérateur `in` sur l'objet de modification est la clé.

**Le total de livraison donne 58.900000000000006.**
Le flottant. C'est un bon moment pour rappeler que tout montant monétaire
manipulé en `number` doit être arrondi à la sortie — ou stocké en centimes.

**La carte n'affiche rien alors que le template semble bon.**
Vérifier que `CurrencyPipe` est bien dans `imports` du composant. En standalone,
l'oubli est silencieux à la compilation mais visible au rendu.

**Le test de prix échoue sur les espaces.**
Le formatage français utilise U+202F (fine insécable). Le helper `texte()` du
spec normalise — c'est une bonne anecdote à raconter, beaucoup de suites de
tests se cassent là-dessus en production.

**Groupe mixte.** Les étapes 1-2 servent de rattrapage : si quelqu'un peine
encore à 20 minutes, donnez-lui le domaine et faites-le démarrer à l'étape 3,
sinon il ne verra jamais la façade — qui est le vrai sujet.

## Ce que ce TP prépare

- **TP 3** : la façade naïve est le point de départ. La course entre requêtes est
  reproductible dès maintenant : tapez vite dans la recherche avec l'API en mode
  `start:instable`.
- **TP 5** : `PanierStore` reprendra la même discipline (signal privé, dérivées
  en `computed`), et consommera `coutLivraison`.
- **TP 7** : `CatalogueFacade` sera réécrite avec `httpResource`. Gardez une
  copie du fichier : la comparaison avant/après est frappante.
- **TP 9** : les tests écrits ici constituent déjà la base de la suite.

## Vérification du corrigé

```bash
npm install --legacy-peer-deps
npx nx run-many -t test      # 62 verts sur 8 projets
npx nx run-many -t lint      # vert
npm run test:structure       # 28 verts
npx nx build boutique        # ~254 kB brut / 72 kB transférés
```

Le bundle est passé de 225 à 254 kB entre le TP 1 et le TP 2 : c'est le coût du
routeur, de `HttpClient` et des données de locale. À noter pour le TP 10.
