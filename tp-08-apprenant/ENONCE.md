# TP 8 — Sécuriser le back-office

**Durée** 50 min

## Le contexte

Maison&Co a besoin d'un espace d'administration : chiffre d'affaires, commandes,
ruptures de stock. Réservé aux administrateurs.

La vraie question n'est pas « comment cacher le menu », c'est **« comment faire
en sorte que le code du back-office ne soit même pas téléchargé par un
visiteur »**.

## Comment savoir si vous avez fini

```bash
npx nx test auth-domaine        # 7 rouges au départ
npx nx test auth-data-access    # 20 rouges
npx nx run-many -t lint         # doit rester vert
```

27 tests.

## Trois nouvelles bibliothèques

```
libs/auth/domaine/        type:domaine,     domaine:auth
libs/auth/data-access/    type:data-access, domaine:auth
libs/admin/feature/       type:feature,     domaine:admin
```

Comptes de test : `client@maison.co` / `client` et `admin@maison.co` / `admin`.

## Étape 1 — Le domaine de la session (7 tests)

`libs/auth/domaine/src/lib/session.ts`

Trois fonctions à écrire : `estExpiree`, `estUtilisable`, `versSession`.

Deux subtilités que les tests attrapent :

**La marge d'expiration.** Un jeton qui expire dans deux secondes est considéré
comme déjà périmé. Sans cette marge, on part en requête avec un jeton qui
expirera en vol — et on récolte un 401 évitable.

**Durée contre instant.** L'API renvoie `expireDans: 30` (secondes) ; le domaine
manipule `expireLe` (instant). La conversion se fait une fois, à la frontière.
C'est la même discipline que le mapping DTO du TP 2.

## Étape 2 — Le store de session (9 tests)

`session.store.ts`

Le jeton vit **en mémoire**, pas dans `localStorage`.

| | localStorage | mémoire |
| --- | --- | --- |
| Lisible par un script tiers | oui | non |
| Survit au rechargement | oui | non |
| Survit à un XSS | non | non |

Aucune option n'est parfaite. Le choix retenu ici — mémoire pour le jeton
d'accès, jeton de rafraîchissement pour reconnecter — est un compromis
défendable, pas une vérité. Sur un vrai projet, le jeton de rafraîchissement
irait dans un cookie `HttpOnly` posé par le serveur.

`connexion` et `rafraichir` renvoient un booléen et **ne rejettent jamais** :
un échec d'identifiants est un état d'interface, pas une exception.

Un test à lire attentivement : « ne rafraîchit pas sans session ». Sans garde,
on envoie une requête de rafraîchissement avec `undefined` — et on récolte un
401 qui déclenche… un rafraîchissement.

## Étape 3 — L'intercepteur (6 tests)

`auth.interceptor.ts`

```ts
export const authInterceptor: HttpInterceptorFn = (requete, suivant) => { … };
```

Trois conditions avant d'ajouter le jeton, chacune couverte par un test :

1. **La requête va-t-elle vers notre API ?** Un appel vers un service tiers ne
   doit jamais emporter le jeton. C'est le test le plus important du lot : une
   fuite de jeton vers un domaine externe est une vraie faille.
2. **Est-ce une route d'authentification ?** Sinon un jeton expiré ferait
   échouer son propre rafraîchissement.
3. **Y a-t-il un jeton valide ?** `jetonValide()` renvoie `null` si absent ou
   périmé.

Branchez-le ensuite dans `app.config.ts` :

```ts
provideHttpClient(withInterceptors([authInterceptor])),
```

## Étape 4 — Le guard, et pourquoi `canMatch` (5 tests)

`admin.guard.ts` puis `app.routes.ts`

```ts
export const estAdmin: CanMatchFn = () => { … };
```

Un guard renvoie `true`, `false`, ou un `UrlTree` — qui vaut redirection.

**La décision du TP est le choix de `canMatch` plutôt que `canActivate` :**

| | `canActivate` | `canMatch` |
| --- | --- | --- |
| Moment | après le chargement du bundle | **avant** |
| Le visiteur télécharge le code admin | oui | **non** |
| Permet deux composants pour un même chemin | non | oui |

Avec `canActivate`, le code de votre back-office atterrit chez tous vos
visiteurs. Ils ne le voient pas, mais ils l'ont — et un curieux peut le lire.

Déclarez la route :

```ts
{
  path: 'admin',
  canMatch: [estAdmin],
  loadChildren: () => import('@maison/admin/feature').then((m) => m.ADMIN_ROUTES),
},
```

### La vérification qui compte

1. Ouvrez l'onglet **Réseau**, videz-le.
2. Naviguez vers `/admin` **sans être connecté**.
3. Cherchez un chunk `admin-page`. Il ne doit pas exister.
4. Connectez-vous en admin, réessayez : il apparaît.

## Étape 5 — Le tableau de bord et `@defer`

`admin.page.ts`

Les indicateurs viennent de `httpResource` — même modèle qu'au TP 7, **garde
`hasValue()` comprise**. Si vous l'oubliez, coupez l'API et regardez ce qui se
passe.

Le bloc « ventes par pièce » est différé :

```html
@defer (on viewport) {
  …
} @placeholder {
  <div class="squelette" aria-hidden="true">…</div>
} @loading (after 100ms) {
  <p aria-live="polite">Chargement du détail…</p>
}
```

Sur cette page le gain est anecdotique. Le mécanisme est le même pour un
graphique de 200 ko — et c'est ça qu'il faut retenir.

`@placeholder` réserve la place : sans lui, l'apparition du bloc décale la page
et dégrade le CLS. On y reviendra au TP 10.

## Étape 6 — Vérifier

Avec l'API en mode jeton court, pour voir l'expiration en direct :

```bash
cd api && npm run start:jeton-court     # jeton valable 10 secondes
```

- `/admin` sans connexion : redirection, et aucun chunk admin téléchargé ;
- connecté en client : même chose — être connecté ne suffit pas ;
- connecté en admin : le tableau de bord s'affiche ;
- attendez dix secondes puis rechargez les indicateurs : le jeton a expiré,
  l'intercepteur ne l'envoie plus, l'API répond 401.

Ce dernier point est volontairement inconfortable : la reprise automatique est
en bonus.

## Vérification finale

- [ ] `npx nx run-many -t test` : tout vert
- [ ] `npx nx run-many -t lint` : vert
- [ ] Aucun chunk `admin-page` téléchargé par un visiteur anonyme
- [ ] Le jeton n'est jamais envoyé vers un domaine tiers
- [ ] Le jeton n'apparaît nulle part dans `localStorage`

## La frontière qu'on a dû ouvrir

`apps/boutique` importe désormais `auth/data-access` — pour le guard et
l'intercepteur. La règle l'interdisait : `type:app` ne pouvait atteindre que
`feature`, `ui` et `util`.

Elle a été assouplie, avec ce commentaire :

```js
// La racine de composition fait exception : c'est elle qui câble les
// providers (intercepteurs, guards), et ceux-ci vivent en data-access.
// Deuxième dérogation de la formation — à compter, pas à banaliser.
```

**C'est la deuxième dérogation** (la première était `catalogue → panier` au
TP 5). Deux questions à se poser en équipe :

1. Aurait-on pu l'éviter ? Oui : en exposant `fournirAuth()` depuis une lib
   `auth/feature` qui masque la data-access. Est-ce que ça vaut une
   bibliothèque de plus, pour une dépendance qui existe de toute façon ?
2. À partir de combien de dérogations la matrice ne protège-t-elle plus rien ?

Il n'y a pas de bonne réponse universelle. Il y a une équipe qui les compte, et
une qui ne les compte pas.

## Pour ceux qui finissent en avance

1. **Le rafraîchissement automatique.** Un intercepteur qui capte les 401,
   rafraîchit, et rejoue la requête. Le piège : dix requêtes en 401 simultanées
   ne doivent déclencher **qu'un** rafraîchissement. Indice : mémoriser la
   promesse en cours.
2. Ajoutez `prefetch on hover` sur le lien du back-office. Que voit-on dans
   l'onglet Réseau ? Et pour un visiteur anonyme ?
