# TP 9 — Corrigé et notes d'animation

**Durée cible** 50 min · **Rouge → vert** 11 tests, puis 1 mutant à tuer

## Ce qui a été ajouté

| Élément | Contenu |
| --- | --- |
| `commande/data-access` (**nouvelle lib**) | `CommandeStore` — envoi, 409, 401, état d'envoi |
| `tools/mutants/chasse.mjs` | chasse aux mutants, une page, sans dépendance |
| `livraison/domaine` | **deux tests ajoutés** : le seuil de franco exact |
| `package.json` | script `mutants` |

Le workspace passe à **17 projets**.

## Le mutant qui survit est réel

Je n'ai pas fabriqué de trou pour l'exercice. J'ai écrit l'outil, je l'ai lancé
sur la suite des huit TP précédents, et **un mutant a survécu** :

```
☠  SURVIVANT  franco de port : seuil strict → large
   libs/livraison/domaine/src/lib/strategies.ts
   montantTotal >= SEUIL_FRANCO_EUROS  →  montantTotal > SEUIL_FRANCO_EUROS
```

Aucun test ne couvrait un panier à **exactement** 500 €. Les tests du TP 2
utilisaient 119, 300 et 600. La couverture de lignes était pourtant de 100 %.

Conséquence métier de la mutation : un client à 500,00 € pile se voit facturer
9,90 € de livraison. Le genre de bug qui remonte par le service client, six mois
plus tard, et que personne n'arrive à reproduire.

**C'est la meilleure démonstration que je puisse donner du sujet.** Dites-le
comme ça : l'outil a trouvé un trou dans les tests que j'avais écrits pour vous
apprendre à tester.

Le corrigé ajoute les deux tests manquants (au seuil, et juste en dessous) et
passe à 8 sur 8.

## Les points à faire vivre

### Union discriminée plutôt que booléen

```ts
export type ResultatCommande =
  | { statut: 'enregistree'; reference: string }
  | { statut: 'stock-insuffisant'; produitId: string }
  | …
```

Chaque issue porte ce dont l'interface a besoin. Le `409` transporte le produit
fautif, donc on affiche « L'étagère Kalix vient de partir en rupture » au lieu
de « Erreur ».

Le compilateur fait le reste : un `switch` sur `statut` est vérifié
exhaustivement.

### Le panier n'est vidé qu'en cas de succès

Test explicite : « ne vide surtout pas le panier en cas d'échec ».

C'est le genre de règle qu'on écrit correctement la première fois, et qu'un
refactoring casse silencieusement six mois plus tard. Sans le test, personne ne
s'en aperçoit avant les réclamations.

### Ce qu'on n'envoie pas au serveur

Le corps ne contient que `produitId` et `quantite`. Pas les prix.

Un client qui envoie ses propres montants est une invitation à la fraude —
c'est le serveur qui recalcule. Ça paraît évident, et c'est une faille
classique des tunnels de commande.

### La réponse à la question du TP 5

> `stockDisponible` est figé au moment de l'ajout. Que se passe-t-il si le stock
> tombe à zéro pendant que le produit est au panier ?

Réponse : rien côté client, **et c'est correct**. Le serveur tranche au moment
de la commande, avec un 409 et l'identifiant du produit fautif. Le client
n'aurait de toute façon jamais pu garantir la disponibilité — deux clients
peuvent commander le dernier exemplaire à la même seconde.

## Déroulé conseillé

| Temps | Étape |
| --- | --- |
| 0-8 | Étape 1 : **lire les tests** et répondre aux quatre questions |
| 8-22 | Étape 2 : écrire le store |
| 22-38 | Étape 3 : **la chasse aux mutants**, le cœur du TP |
| 38-45 | Étape 4 : la discussion sur ce qui se teste bien |
| 45-50 | Étape 5 : les temps d'exécution |

L'étape 3 ne se sacrifie jamais. Si vous êtes en retard, donnez le store écrit
et allez directement aux mutants.

## Points où ça coince

**`npm run mutants` est lent.**
Chaque mutant relance une suite complète avec `--skip-nx-cache`. Comptez une
vingtaine de secondes par mutant. Filtrez pendant le TP :
`node tools/mutants/chasse.mjs livraison`.

**Un fichier reste muté après une interruption.**
Le script restaure dans un `finally`, mais un `Ctrl+C` au mauvais moment peut
laisser une mutation en place. `git checkout libs/` remet tout d'aplomb —
occasion de rappeler pourquoi on travaille sur un dépôt propre.

**« Mon test passe mais le mutant survit quand même. »**
Le test ne touche pas la ligne mutée, ou l'assertion est trop large. Faire
relire le rapport : il donne la mutation exacte.

**Un stagiaire propose de viser 100 % de mutants tués partout.**
Bonne intention, mauvaise règle. Sur du code de présentation ou de câblage, le
coût dépasse vite le bénéfice. Les huit mutants du script visent tous du
**domaine** — c'est là que la technique rapporte.

## Ce que ce TP prépare

- **TP 10** : la suite de tests fait partie de ce qu'on mesure. Un projet dont
  les tests durent huit minutes n'est pas optimisé, même si le bundle est petit.

## Vérification du corrigé

```bash
npm install --legacy-peer-deps
npx nx run-many -t test      # 17 projets verts
npm run mutants              # 8/8
npx nx run-many -t lint      # vert
```
