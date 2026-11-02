# TP 8 — Corrigé et notes d'animation

**Durée cible** 50 min · **Rouge → vert** 27 tests

## Ce qui a été ajouté

| Bibliothèque | Contenu | Tests |
| --- | --- | --- |
| `auth/domaine` (**nouvelle**) | `session.ts` — expiration, rôles, conversion | 10 |
| `auth/data-access` (**nouvelle**) | `SessionStore`, `authInterceptor`, `estAdmin` | 20 |
| `admin/feature` (**nouvelle**) | `AdminPage` avec `httpResource` et `@defer` | — |
| racine | `app.routes.ts`, `app.config.ts`, `eslint.config.mjs` | — |

Le workspace passe à **16 projets**.

## Le message central : `canMatch`, pas `canActivate`

C'est le seul point vraiment nouveau du TP, et il se démontre à l'écran en
trente secondes.

Avec `canActivate`, Angular charge le bundle de la route **puis** demande au
guard s'il peut l'afficher. Le code du back-office est donc téléchargé par tous
les visiteurs — invisible, mais présent, et lisible par un curieux.

Avec `canMatch`, le guard répond **avant** : la route n'est pas retenue, le
chunk n'est jamais demandé.

### La démonstration

```bash
npx nx build boutique
```

Le rapport montre un chunk `admin-page` (3 ko ici). Puis, dans le navigateur,
onglet Réseau vidé :

| Situation | Chunk `admin-page` |
| --- | --- |
| Visiteur anonyme sur `/admin` | **absent** |
| Client connecté sur `/admin` | **absent** |
| Admin connecté sur `/admin` | présent |

À faire en plénière. C'est plus convaincant que n'importe quel schéma.

**À dire aussi** : ça ne remplace pas le contrôle serveur. L'API renvoie 401 et
403 quoi qu'il arrive. Le guard protège le chargement, pas les données.

## Les autres points à faire vivre

### Le jeton en mémoire

Le tableau est dans l'énoncé. Le point à faire dire au groupe : **aucune option
n'est bonne**. `localStorage` est lisible par tout script tiers ; la mémoire
oblige à se reconnecter à chaque rechargement.

Le compromis retenu — mémoire pour l'accès, rafraîchissement pour reconnecter —
suppose que le jeton de rafraîchissement soit dans un cookie `HttpOnly`. Notre
API de formation ne le fait pas : elle le renvoie en JSON. **C'est une
simplification pédagogique, dites-le.**

### Les trois conditions de l'intercepteur

Le test qui compte : « n'envoie jamais le jeton vers un autre domaine ».

Un intercepteur naïf ajoute l'en-tête à **toutes** les requêtes, y compris vers
un service d'analytics tiers. C'est une vraie faille, et elle est fréquente —
d'autant qu'elle ne provoque aucun bug visible.

Le deuxième garde-fou (épargner `/auth/refresh`) évite une boucle plus subtile :
un jeton expiré envoyé sur sa propre route de rafraîchissement fait échouer le
rafraîchissement.

### La marge d'expiration

`MARGE_EXPIRATION_MS = 2000` : un jeton qui expire dans deux secondes est
considéré comme mort.

Sans ça, on part en requête avec un jeton qui expirera pendant le trajet
réseau — et on récolte un 401 parfaitement évitable. C'est le genre de détail
qui distingue un code qui marche en démonstration d'un code qui marche en
production.

### La deuxième dérogation aux frontières

`apps/boutique` doit importer `auth/data-access` pour câbler le guard et
l'intercepteur. La règle l'interdisait.

J'ai assoupli la matrice avec un commentaire explicite plutôt que de fabriquer
une lib `auth/feature` qui n'aurait servi qu'à masquer la dépendance.

**C'est discutable, et c'est le sujet de discussion du TP.** Les deux positions
se défendent :

- *pour la dérogation* : la racine de composition câble les providers, ceux-ci
  vivent en data-access, la dépendance est réelle — la masquer derrière une lib
  supplémentaire est du rangement, pas de l'architecture ;
- *contre* : c'est la deuxième dérogation en quatre TP, et c'est exactement
  comme ça qu'une matrice finit permissive.

La question à poser : **« à partir de combien de dérogations la règle ne
protège-t-elle plus rien ? »** Il n'y a pas de bonne réponse universelle. Il y a
une équipe qui les compte, et une qui ne les compte pas.

### `@defer` sur cette page est anecdotique

Trois kilo-octets. Dites-le franchement — sinon un stagiaire le dira à votre
place, et avec raison.

Ce qui est à retenir, c'est le mécanisme et le `@placeholder` : sans lui,
l'apparition du bloc décale la page. Le lien avec le CLS se fera au TP 10.

## Déroulé conseillé

| Temps | Étape |
| --- | --- |
| 0-10 | Étape 1 : le domaine, marge d'expiration comprise |
| 10-22 | Étape 2 : le store |
| 22-32 | Étape 3 : l'intercepteur, et la fuite de jeton |
| 32-42 | Étape 4 : le guard, **et la démonstration Réseau en plénière** |
| 42-48 | Étape 5 : le tableau de bord et `@defer` |
| 48-50 | La discussion sur la dérogation |

Si vous êtes en retard, l'étape 5 se sacrifie. L'étape 4 jamais.

## Points où ça coince

**Le guard renvoie une redirection en boucle.**
La route `/connexion` n'existe pas encore dans le projet : la redirection tombe
sur la route `**` ou sur rien. C'est sans conséquence pour le TP, mais un
stagiaire attentif le remarquera — bonne occasion de parler de `redirectTo` et
des routes de repli.

**`estAdmin` est à la fois un computed du store et un guard.**
Deux choses différentes avec le même nom, dans deux fichiers différents. Si ça
gêne, renommez le guard `routeAdminAutorisee`. J'ai gardé le nom court parce
qu'il se lit bien dans la déclaration de route.

**Les tests de guard échouent avec « inject must be called from ».**
`runInInjectionContext` manquant — comme au TP 6 pour `form()`.

**Le chunk admin apparaît quand même dans le Réseau.**
Presque toujours un `canActivate` au lieu d'un `canMatch`, ou un import statique
de `AdminPage` quelque part.

## Ce que ce TP prépare

- **TP 9** : guard et intercepteur sont les deux exemples canoniques de « code
  sans interface, entièrement testable » — on y reviendra.
- **TP 10** : le découpage en chunks est visible dans le rapport de build, et
  `@defer` y devient un levier mesurable.

## Vérification du corrigé

```bash
npm install --legacy-peer-deps
npx nx run-many -t test      # 16 projets verts
npx nx run-many -t lint      # vert
npx nx build boutique        # ~302 kB brut / 84 kB transférés
```

Chunks paresseux produits : `commande-page` (66 ko), `catalogue-page` (13 ko),
`admin-page` (3 ko). Le tunnel de commande pèse quinze fois le back-office —
c'est le coût de `@angular/forms/signals`, et c'est un bon sujet pour le TP 10.
