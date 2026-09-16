# TP 3 — Recherche et filtres du catalogue

**Durée** 60 min

## Le contexte

La façade du TP 2 fonctionne — dans un bureau, avec une API locale et un
réseau parfait. On va la mettre en situation réelle : réseau lent, erreurs
intermittentes, utilisateur qui tape vite.

C'est le TP où l'on voit pourquoi `switchMap` n'est pas un détail de syntaxe.

## Comment savoir si vous avez fini

```bash
npx nx test catalogue-data-access    # 10 rouges au départ, 27 verts à la fin
npm run test:structure               # 30 verts, dont 2 nouveaux
```
## Les tests bonus

Certains tests sont dans des fichiers `*.bonus.spec.ts`, **exclus par défaut**.
Ils couvrent des cas limites intéressants mais non essentiels.

Pour les activer, retirez la ligne `exclude` du `vite.config.mts` de la
bibliothèque concernée :

```ts
exclude: ['**/*.bonus.spec.ts'],   // ← retirer cette ligne
```

Ne les activez que si vous avez terminé le reste.


Deux tests de structure ont été ajoutés : ils interdisent tout `subscribe`
manuel dans le code applicatif, et tout `Subject` exposé publiquement par une
façade. Ils passent déjà — à vous de ne pas les casser.

## Préparation — travailler en conditions dégradées

Coupez l'API et relancez-la en mode instable :

```bash
cd api && npm run start:instable     # 30 % de 503, 600 ms de latence
```

Gardez ce mode pendant tout le TP.

## Étape 1 — Constater le problème avant de le résoudre

**Ne modifiez rien pour l'instant.** Lancez l'application telle qu'elle est
sortie du TP 2 :

```bash
npx nx serve boutique
```

Ouvrez l'onglet **Réseau** des DevTools, et tapez « canapé » lentement, puis
vite. Notez :

- combien de requêtes sont parties pour un seul mot ?
- dans quel ordre les réponses sont-elles arrivées ?
- l'affichage correspond-il toujours à la dernière frappe ?

Insistez jusqu'à reproduire **l'affichage incohérent** : un résultat de « can »
qui écrase un résultat de « canapé ». Avec 600 ms de latence, ça arrive en
quelques essais.

C'est ce bug précis qu'on supprime aujourd'hui. Il faut l'avoir vu une fois :
en production, il se manifeste une fois sur cinquante et personne n'arrive à
le reproduire.

## Étape 2 — L'API est déjà repassée en Observable

`libs/catalogue/data-access/src/lib/catalogue.api.ts` — **fourni**, la
conversion est mécanique et ce n'est pas le sujet du TP.

Ouvrez quand même le fichier trente secondes : le `firstValueFrom` du TP 2
jetait exactement ce dont on a besoin aujourd'hui, la possibilité d'annuler.
Le mapping, lui, n'a pas bougé.

## Étape 3 — Réduire le nombre de requêtes

`catalogue.facade.ts`

La façade reçoit déjà un `Subject<Filtres>` : chaque commande y pousse une
demande. Construisez le pipeline à partir de là.

Trois opérateurs, dans cet ordre :

```ts
filter((f) => rechercheExploitable(f.recherche)),
debounceTime(DELAI_FRAPPE_MS),
distinctUntilChanged(memesFiltres),
```

Deux remarques :

- `rechercheExploitable` vient du **domaine**. La règle « on n'interroge pas le
  serveur pour une seule lettre » a été écrite au TP 2 : ne la réécrivez pas ici.
- `memesFiltres` compare champ par champ. On pourrait écrire
  `JSON.stringify(a) === JSON.stringify(b)` — ça marche, et ça casse
  silencieusement le jour où l'ordre des clés change.

Retapez « canapé ». Combien de requêtes maintenant ?

## Étape 4 — Supprimer les résultats périmés

Aplatissez avec `switchMap`.

Dans l'onglet Réseau, les requêtes abandonnées doivent apparaître comme
**`canceled`**. Si ce n'est pas le cas, c'est que le flux est re-souscrit au
lieu d'être commuté.

Deux questions à traiter en binôme :

1. Pourquoi `mergeMap` serait un mauvais choix ici ?
2. Existe-t-il un endroit dans Maison&Co où `switchMap` serait au contraire
   dangereux ? (indice : le bouton « Valider la commande » du TP 6)

Le test « annule la requête précédente au lieu de l ignorer » vérifie le
comportement. Et celui juste en dessous montre quelque chose de plus fort :
une requête annulée ne peut même **plus délivrer sa réponse**. Ce n'est pas
« on ignore le résultat », c'est « le résultat n'existe pas ».

## Étape 5 — Survivre aux erreurs

Toujours à l'intérieur du `switchMap` :

```ts
retry({ count: TENTATIVES, delay: (_, tentative) => timer(200 * 2 ** (tentative - 1)) }),
map((page) => /* état chargé */),
catchError(() => of(/* état en erreur */)),
startWith(/* état de chargement */),
```

**L'exercice principal de cette étape** : placez d'abord `catchError` à
l'extérieur du `switchMap`, lancez les tests, et regardez lequel échoue. Vous
verrez que le flux meurt à la première erreur — après une 503, plus aucune
frappe ne fonctionne, jusqu'au rechargement de la page.

Remettez-le à l'intérieur. La différence tient en deux niveaux d'indentation et
elle change tout.

Le délai croissant (`200`, `400`) n'est pas cosmétique : réessayer trois fois
en 30 ms sur un serveur qui sature ne fait qu'aggraver la situation.

## Étape 6 — Exposer l'état sans souscription

Terminez par `toSignal(..., { initialValue: ETAT_INITIAL })`.

Une seule souscription, nettoyée avec l'injecteur. Vérifiez :

```bash
npm run test:structure
grep -rn "\.subscribe(" libs/ apps/ --include="*.ts" | grep -v spec
```

Le second doit ne rien renvoyer.

## Étape 7 — Vérifier dans le navigateur

Avec l'API toujours en mode instable :

- tapez vite : une seule requête part ;
- changez de pièce pendant une recherche : la précédente est annulée ;
- tombez sur une 503 : le message d'erreur s'affiche, puis une nouvelle
  recherche repart normalement, sans rechargement.

## Vérification finale

- [ ] `npx nx test catalogue-data-access` : 27 verts
- [ ] `npm run test:structure` : 30 verts
- [ ] `npx nx run-many -t lint` : vert
- [ ] Taper « canapé » en vitesse normale déclenche **une** requête
- [ ] Les requêtes abandonnées sont `canceled` dans l'onglet Réseau
- [ ] Après une erreur affichée, l'application se rétablit seule
- [ ] Aucun `subscribe` dans le code applicatif

## La question à garder pour le TP 7

Comptez les lignes du pipeline. Toute cette mécanique — debounce, annulation,
retry, états de chargement — existe pour une seule chose : afficher une liste
de produits qui correspond aux filtres courants.

Au TP 7, on remplacera l'ensemble par `httpResource`. Gardez une copie du
fichier : la comparaison vaut le détour.

## Pour ceux qui finissent en avance

1. Le `debounceTime` s'applique aussi aux **clics** sur les filtres, qui sont
   donc retardés de 300 ms pour rien. Séparez la frappe de la sélection en deux
   flux fusionnés par `merge`. Quel test faut-il ajouter ?
2. Ajoutez `shareReplay({ bufferSize: 1, refCount: true })` et observez ce que
   ça change si deux composants consomment la façade. Puis retirez `refCount`
   et observez la fuite.
