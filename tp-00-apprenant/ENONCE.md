# TP 0 — Mise en route

**Durée** 20 min

## Pourquoi ce TP

Il n'a aucune valeur pédagogique. Il existe pour qu'aucun des dix TP suivants
ne soit retardé par un problème d'installation. On le fait tous ensemble, et on
ne passe pas au TP 1 tant que tout le monde n'est pas vert.

À la fin, vous aurez aussi branché l'application sur l'API — ce sera votre
première ligne de code du séjour.

## Comment savoir si vous avez fini

```bash
npm run test:environnement   # l’environnement
npx nx test partage-util   # le branchement de l'API
```

Les deux doivent être verts.

## Étape 1 — Vérifier Node

```bash
node --version     # 22 ou plus récent
```

Si vous êtes en dessous, installez une version récente avant d'aller plus loin
(`nvm install 22` si vous avez nvm).

## Étape 2 — Installer le workspace

```bash
npm install --legacy-peer-deps
```

> Le `--legacy-peer-deps` est nécessaire : quelques paquets de l'écosystème
> déclarent encore des plages de pairs antérieures à Angular 22. Sans
> conséquence pour la formation.

Vérification :

```bash
npm run test:environnement
```

Les quatre tests « versions attendues » passent au vert. Les tests « API de
démonstration » restent rouges : c'est l'étape suivante.

## Étape 3 — Lancer l'API

L'API vit dans `api/`, indépendamment du workspace Angular. **Gardez-la dans un
terminal dédié pendant les trois jours.**

```bash
cd api
npm install
npm start
```

Vérifiez dans le navigateur : <http://localhost:3333/api/sante>

```json
{ "statut": "ok", "produits": 20, "latence": 250, "tauxErreur": 0 }
```

Puis, dans le premier terminal :

```bash
npm run test:environnement     # tout doit être vert maintenant
```

Deux variantes de l'API serviront plus tard dans la formation — inutile de les
lancer aujourd'hui :

```bash
npm run start:instable      # 30 % d'erreurs, 600 ms de latence   → TP 3
npm run start:jeton-court   # jeton valable 10 secondes           → TP 8
```

## Étape 4 — Brancher l'application sur l'API

Ouvrez `libs/partage/util/src/lib/api-url.ts`. La fabrique du jeton renvoie une
chaîne vide : à vous de la remplir.

```bash
npx nx test partage-util
```

Quatre tests rouges décrivent ce qui est attendu : URL absolue, se terminant
par `/api`, sans barre oblique finale, et remplaçable en test.

Deux questions à se poser en le faisant :

1. Pourquoi un `InjectionToken` plutôt qu'une constante exportée ?
   Indice : regardez le quatrième test.
2. Pourquoi `providedIn: 'root'` avec une `factory` plutôt qu'un provider
   déclaré dans `app.config.ts` ?

## Étape 5 — Lancer l'application

```bash
npx nx serve boutique
```

<http://localhost:4200> affiche une page presque vide avec un lien
« Maison&Co ». C'est normal : les bibliothèques sont encore vides, on les
remplira à partir du TP 2.

## Étape 6 — Outillage navigateur

- **Angular DevTools** — <https://angular.dev/tools/devtools>
  Installez l'extension, ouvrez les DevTools sur `localhost:4200` et vérifiez
  que les onglets *Components* et *Profiler* apparaissent. On s'en servira
  intensivement au jour 2.
- **VS Code** : extension *Angular Language Service*.

## Vérification finale

- [ ] `npm run test:environnement` : tout vert
- [ ] `npx nx test partage-util` : 4 tests verts
- [ ] `npx nx build boutique` : réussit
- [ ] `localhost:4200` affiche l'application
- [ ] L'onglet Angular apparaît dans les DevTools
- [ ] L'API tourne dans un terminal dédié, et y reste

## Si ça coince

Mettez-vous en binôme avec un voisin dont l'environnement fonctionne, et
signalez le problème au formateur. Un poste qui résiste ne doit pas consommer
le TP 1 : on repassera dessus pendant que les autres travaillent.
