# TP 9 — Sécuriser Maison&Co par les tests

**Durée** 50 min

## Le contexte

Il reste une chose à faire, laissée ouverte au TP 5 : **envoyer la commande**.
Et une question à trancher : le stock a pu tomber à zéro pendant que le produit
était au panier.

C'est l'occasion de travailler sérieusement les tests — d'abord en écrivant du
code piloté par eux, puis en vérifiant que la suite existante vaut quelque
chose.

## Comment savoir si vous avez fini

```bash
npx nx test commande-data-access    # 11 rouges au départ
npm run mutants                     # 7 tués sur 8 — à vous de trouver le dernier
```

## Étape 1 — Lire les tests avant d'écrire le code

`libs/commande/data-access/src/lib/commande.store.spec.ts`

Onze tests, déjà écrits. Lisez-les **entièrement** avant de toucher au code.

Répondez à ces questions à partir des seuls tests :

1. Que se passe-t-il quand le panier est vide ?
2. Qu'envoie-t-on exactement au serveur pour chaque ligne ?
3. Dans quels cas le panier est-il vidé ?
4. Combien d'issues distinctes `envoyer` peut-elle avoir ?

Si vous savez répondre, les tests font leur travail : ils **spécifient**. C'est
le critère à retenir — un bon test se lit comme un cahier des charges.

## Étape 2 — Le store d'envoi (11 tests)

`commande.store.ts`

```ts
export type ResultatCommande =
  | { statut: 'enregistree'; reference: string }
  | { statut: 'panier-vide' }
  | { statut: 'stock-insuffisant'; produitId: string }
  | { statut: 'non-authentifie' }
  | { statut: 'indisponible' };
```

Une **union discriminée**, pas un booléen. Chaque issue porte ce dont
l'interface a besoin pour réagir : le `409` transporte le produit fautif, donc
on peut afficher « L'étagère Kalix vient de partir en rupture » plutôt que
« Erreur ».

Avec `{ succes: false }`, il faudrait un second champ pour savoir quoi
afficher — et rien n'obligerait à le remplir.

Trois points que les tests verrouillent :

**Le panier n'est vidé qu'en cas de succès.** Perdre un panier de 1 200 € sur
une coupure réseau est pire que la coupure.

**`envoyer` ne rejette jamais.** Quatrième fois dans la formation : erreur
attendue égale état, pas exception.

**Le corps n'envoie que `produitId` et `quantite`.** Le serveur refait le calcul
des prix — un client qui envoie ses propres montants est une invitation à la
fraude.

## Étape 3 — La chasse aux mutants

C'est le cœur du TP.

```bash
npm run mutants
```

Le script introduit une à une de petites erreurs dans le domaine — un `>=`
devenu `>`, un `&&` devenu `||` — puis relance les tests :

- **mutant tué** : au moins un test a échoué. Le code est réellement couvert.
- **mutant survivant** : tous les tests passent malgré l'erreur. **C'est un
  trou.**

> Un test qui passe ne prouve rien tant qu'on n'a pas vérifié qu'il sait
> échouer.

Vous devriez obtenir **7 tués sur 8**. Un mutant survit.

### Votre travail

1. Lisez le rapport : il donne le fichier, la ligne, et la mutation exacte.
2. Écrivez le test qui l'aurait attrapé.
3. Relancez : 8 sur 8.

Indice sur le survivant : il concerne un seuil. Regardez les valeurs utilisées
par les tests existants — aucune ne tombe **exactement** dessus.

C'est un bug réel, pas un exercice artificiel : avec la mutation en place, un
client dont le panier fait exactement 500 € se voit facturer la livraison.

### La discussion à ouvrir

- La couverture de lignes de ce fichier était déjà de 100 %. Qu'est-ce que ça
  valait ?
- Faut-il viser 100 % de mutants tués ? À quel coût ?
- Sur quel code cette technique vaut-elle l'effort ? (indice : regardez dans
  quels projets sont les mutants)

`tools/mutants/chasse.mjs` tient en une page — ouvrez-le. Pour un vrai projet,
voyez **Stryker**, qui fait la même chose en générant les mutations
automatiquement.

## Étape 4 — Ce qui se teste bien, et ce qui se teste mal

Regardez la suite complète :

```bash
npx nx run-many -t test
```

Classez mentalement ce qui a été testé depuis trois jours :

| Testé sans TestBed | Testé avec TestBed | Pas testé |
| --- | --- | --- |
| domaines (produit, panier, livraison, commande, session) | stores, guards, intercepteurs, composants de présentation | pages routées, templates complets |

**Ce n'est pas un oubli.** Les pages sont testées indirectement : leur logique
vit dans des façades et des domaines qui, eux, sont couverts. Un test de page
coûte cher à écrire, casse à chaque refonte visuelle, et attrape surtout des
erreurs que le compilateur voit déjà.

La question à se poser n'est pas « qu'est-ce qui n'est pas couvert ? » mais
**« qu'est-ce qui, si ça cassait, ne serait pas rattrapé ? »**.

## Étape 5 — Le temps d'exécution

```bash
npx nx run-many -t test --skip-nx-cache
```

Notez la durée totale, et celle de chaque projet.

Les domaines tournent en environnement `node`, sans plugin Angular : quelques
dizaines de millisecondes. Les libs Angular montent un DOM : quelques
centaines.

C'est la raison pratique de la règle posée au TP 1 — « le domaine n'importe
rien d'Angular ». Une suite de domaine rapide est une suite qu'on relance à
chaque sauvegarde.

## Vérification finale

- [ ] `npx nx run-many -t test` : tout vert
- [ ] `npm run mutants` : 8 sur 8
- [ ] Le test que vous avez ajouté échoue bien si vous remettez la mutation
- [ ] `npx nx run-many -t lint` : vert

## Pour ceux qui finissent en avance

1. Ajoutez un mutant à `tools/mutants/chasse.mjs` qui vise du code que vous
   pensez bien couvert. Survit-il ?
2. Branchez `CommandeStore` sur la page de commande du TP 6, et affichez le
   nom du produit en rupture quand l'API renvoie 409.
