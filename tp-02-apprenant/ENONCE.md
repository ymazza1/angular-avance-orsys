# TP 2 — Architecture du catalogue

**Durée** 60 min

## Le contexte

Les frontières sont posées (TP 1), les bibliothèques sont vides. On va les
remplir — et vérifier que les règles tiennent sous la charge d'une vraie
fonctionnalité.

À la fin, le catalogue Maison&Co s'affiche dans le navigateur, alimenté par
l'API, sans qu'aucun composant ne connaisse `HttpClient`.

## Comment savoir si vous avez fini

```bash
npx nx run-many -t test      # 60 tests rouges au départ, tous verts à la fin
npx nx run-many -t lint      # doit rester vert en permanence
```

Les fichiers `*.spec.ts` ne sont pas à modifier : ce sont vos spécifications.
Les fichiers à compléter contiennent des `TODO TP 2` et lèvent une erreur
explicite tant qu'ils ne sont pas écrits.

Lancez les tests en continu pendant tout le TP :

```bash
npx nx test catalogue-domaine --watch
```

> Les **types** vous sont fournis (sinon les tests ne compileraient pas). Ce
> qui est à écrire, c'est le comportement, le mapping et la composition.

## Étape 1 — Le domaine : produit (19 tests)

`libs/catalogue/domaine/src/lib/produit.ts`

Quatre fonctions : `prixEffectif`, `estDisponible`, `estEnPromotion`,
`estVolumineux`.

Contrainte vérifiée par les tests de structure : **aucun import d'Angular ni de
RxJS dans ce fichier**. Si vous en avez besoin, c'est que la règle n'est pas à
sa place.

Deux pièges que les tests attrapent :

- l'arrondi au centime (`249,90 € − 10 %` ne fait pas `224,91` par hasard) ;
- les seuils de `estVolumineux` sont **inclusifs** : 50 kg pile bascule déjà.

## Étape 2 — Le domaine : filtres

`libs/catalogue/domaine/src/lib/filtres.ts`

`appliquer`, `estVide`, `rechercheExploitable`.

La règle importante est dans `appliquer` : **toute modification de la sélection
ramène en page 1**, alors que changer uniquement de page conserve la sélection.
Sans ça, filtrer sur « chambre » depuis la page 3 affiche une liste vide.

`rechercheExploitable` est aussi du métier, pas de la technique : c'est la règle
« on n'interroge pas le serveur pour une seule lettre ». Elle vit donc dans le
domaine, pas dans le composant de recherche. Le TP 3 la réutilisera telle
quelle.

## Étape 3 — L'accès aux données (22 tests)

`libs/catalogue/data-access/`

**`produit.dto.ts`** — `versProduit(dto)`. Regardez le `ProduitDto` : `prix_ttc`,
`poids_kg`, `nb_avis`. Il ne ressemble pas au `Produit` du domaine, et c'est
voulu. Le dernier test vérifie qu'aucun nom de champ du DTO ne fuit dans le
modèle.

**`catalogue.api.ts`** — `versParams(filtres)` et la classe `CatalogueApi`.

`versParams` est exportée à part, donc testable sans `HttpClient` — et
réutilisable telle quelle au TP 7.

> L'API est ici **promise-based** (`firstValueFrom`). C'est délibérément naïf :
> le TP 3 vous fera constater ce que ça casse avant de le corriger.

## Étape 4 — La façade

`libs/catalogue/data-access/src/lib/catalogue.facade.ts`

C'est la pièce centrale. Deux règles :

1. **État en lecture seule.** Les signaux en écriture sont privés ; ce qui sort
   est `asReadonly()` ou `computed()`. `produits`, `total` et `facettes` sont
   des valeurs **dérivées** : elles ne doivent jamais être stockées.
2. **Commandes nommées.** Aucune méthode ne renvoie d'`Observable`, aucun
   composant ne peut modifier l'état autrement qu'en appelant une méthode qui
   dit ce qu'elle fait.

Le test qui compte le plus : `charger()` **ne rejette jamais**. Une erreur
réseau devient un état (`erreur()`), pas une exception à rattraper chez
l'appelant. Regardez le test « renseigne l erreur sans rejeter la promesse ».

## Étape 5 — Le composant de présentation (7 tests)

`libs/catalogue/ui/src/lib/carte-produit.component.ts`

Le squelette ne contient qu'un `<article>` vide. À vous le template.

Règles :

- aucun `inject()` de service métier — le lint du TP 1 vous arrêtera ;
- les valeurs dérivées se calculent avec `computed()`, **jamais dans le
  template** (on verra pourquoi au jour 2) ;
- un produit en rupture n'émet pas.

Notez comment le test normalise les espaces : le formatage français utilise des
espaces insécables et fines insécables, invisibles mais bien présentes.

## Étape 6 — La page et la route

`libs/catalogue/feature/` puis `apps/boutique/src/app/app.routes.ts`

La page injecte la façade, distribue l'état, traduit les gestes en commandes.
Elle ne calcule rien.

Quatre états à distinguer dans le template : erreur, chargement, résultats, et
« aucun résultat » (`@empty`).

Pas de test automatisé ici : la vérification est visuelle.

```bash
npm run api          # dans un terminal dédié
npx nx serve boutique
```

Vous devez voir les 20 produits, et pouvoir filtrer par pièce.

## Étape 7 — Les stratégies de livraison (14 tests)

`libs/livraison/domaine/` puis `libs/livraison/data-access/`

Le contrat existe déjà. À écrire : `LivraisonVolumineux`, `LivraisonStandard`,
`coutLivraison`, puis `fournirStrategiesLivraison`.

Quatre règles, dans cet ordre :

1. au-delà de 500 € de commande, c'est offert ;
2. sinon chaque ligne est traitée par la **première** stratégie qui l'accepte ;
3. si aucune stratégie n'accepte une ligne, c'est une **erreur**, pas un zéro ;
4. le total est arrondi au centime — `9.9 + 49` en virgule flottante ne donne
   pas exactement `58.9`.

Deux tests méritent votre attention :

- « retient la première stratégie qui accepte la ligne » : passez les stratégies
  dans l'ordre inverse et le résultat change. L'ordre des providers est donc une
  décision, pas un détail.
- « refuse une ligne qu aucune stratégie n accepte » : un coût de livraison
  silencieusement nul serait un bug de facturation.

Enfin, remarquez où vit le jeton d'injection : dans `livraison/data-access`, pas
dans le domaine. Déplacez-le dans le domaine pour voir, et lancez
`npm run test:structure`.

## Vérification finale

- [ ] `npx nx run-many -t test` : 62 tests verts
- [ ] `npx nx run-many -t lint` : vert
- [ ] `npm run test:structure` : 28 verts (le domaine est resté pur)
- [ ] Le catalogue s'affiche et les filtres fonctionnent
- [ ] `grep -rn "prix_ttc" libs/catalogue/ui libs/catalogue/feature` ne renvoie rien
- [ ] Aucun composant n'importe `HttpClient`

## La question à se poser en fin de TP

La façade a-t-elle apporté quelque chose, ou n'est-ce qu'une couche
d'indirection de plus ?

Gardez votre réponse. On la confrontera au TP 7, quand on remplacera toute son
implémentation par `httpResource` sans toucher à un seul composant.

## Pour ceux qui finissent en avance

1. Ajoutez une troisième stratégie `LivraisonExpress` (ligne de moins de 5 kg,
   19 €) et vérifiez que le seul fichier modifié est celui des providers.
2. Écrivez le test de `CataloguePage` que je n'ai pas écrit. Que testeriez-vous
   qui ne soit pas déjà couvert par les tests de façade et de carte ?
