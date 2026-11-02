# TP 9 — Résolution pas à pas

Fichiers : `libs/commande/data-access/src/lib/commande.store.ts`,
`libs/livraison/domaine/src/lib/strategies.spec.ts`

---

## Étape A — Une union discriminée, pas un booléen

```ts
export type ResultatCommande =
  | { readonly statut: 'enregistree'; readonly reference: string }
  | { readonly statut: 'panier-vide' }
  | { readonly statut: 'stock-insuffisant'; readonly produitId: string }
  | { readonly statut: 'non-authentifie' }
  | { readonly statut: 'indisponible' };
```

Cinq issues, cinq formes. Chacune porte exactement ce dont l'interface a besoin.

Comparez avec `{ succes: boolean; message?: string }` : il faudrait remplir
`message` à la main à chaque endroit, rien ne l'imposerait, et l'interface ne
pourrait pas afficher le nom du produit en rupture — elle n'aurait qu'une
chaîne.

Bénéfice concret : un `switch` sur `statut` est vérifié exhaustivement par le
compilateur. Ajoutez un sixième cas, et tous les `switch` de l'application
signalent qu'ils ne le traitent pas.

---

## Étape B — Refuser avant d'appeler

```ts
async envoyer(commande: Commande, lignes: Panier): Promise<ResultatCommande> {
  if (lignes.length === 0) return this.conclure({ statut: 'panier-vide' });
  …
}
```

**Test visé** : « refuse un panier vide sans appeler l'API », qui se termine par
`http.expectNone(() => true)`.

Un aller-retour réseau pour apprendre qu'on n'a rien à commander est un
aller-retour de trop — et le serveur répondrait 422, qu'il faudrait ensuite
traduire.

---

## Étape C — N'envoyer que ce qui fait autorité

```ts
this.http.post<ReponseCommande>(`${this.base}/commandes`, {
  ...commande,
  lignes: lignes.map((ligne) => ({
    produitId: ligne.produitId,
    quantite: ligne.quantite,
  })),
})
```

**Test visé** : « n'envoie que l'identifiant et la quantité de chaque ligne ».

Le panier contient `prixUnitaire`, `nom`, `poidsKg`. On n'envoie rien de tout
ça : **c'est le serveur qui recalcule**. Un client qui transmet ses propres
montants est une invitation à la fraude, et c'est une faille classique des
tunnels de commande.

C'est aussi, une fois de plus, la discipline du mapping : on ne laisse pas fuir
une structure interne dans un contrat externe.

---

## Étape D — Vider le panier, mais seulement après

```ts
const reponse = await firstValueFrom(…);
this.panier.vider();
return this.conclure({ statut: 'enregistree', reference: reponse.id });
```

Le `vider()` est **après** le `await`, donc il ne s'exécute qu'en cas de succès.

**Test visé** : « ne vide surtout pas le panier en cas d'échec ».

Perdre un panier de 1 200 € sur une coupure réseau est pire que la coupure
elle-même. C'est le genre de règle qu'on écrit correctement la première fois et
qu'un refactoring casse silencieusement — d'où le test.

---

## Étape E — Traduire les codes HTTP en statuts métier

```ts
private interpreter(erreur: unknown): ResultatCommande {
  if (!(erreur instanceof HttpErrorResponse)) return { statut: 'indisponible' };
  if (erreur.status === 401) return { statut: 'non-authentifie' };
  if (erreur.status === 409) {
    return { statut: 'stock-insuffisant', produitId: erreur.error?.produitId ?? '' };
  }
  return { statut: 'indisponible' };
}
```

Aucun composant n'a à connaître `HttpErrorResponse` ni la valeur 409. Même
frontière qu'au TP 2 entre DTO et domaine.

Le `409` transporte `produitId` : c'est ce qui permet d'afficher « L'étagère
Kalix vient de partir en rupture » plutôt que « Erreur ».

Le `?? ''` protège d'un corps d'erreur mal formé. Un serveur qui renvoie un 409
sans détail ne doit pas faire planter le client.

**Et c'est la réponse à la question laissée ouverte au TP 5** : le stock figé au
moment de l'ajout n'est pas un problème, parce que **le serveur tranche**. Le
client n'aurait de toute façon jamais pu garantir la disponibilité — deux
clients peuvent commander le dernier exemplaire à la même seconde.

---

## Étape F — La chasse aux mutants

```bash
npm run mutants
```

Sortie attendue au départ :

```
✓  tué         seuil de volume inclusif → exclusif
✓  tué         disponibilité : stock > 0 → stock >= 0
✓  tué         recherche exploitable : minimum ignoré
☠  SURVIVANT   franco de port : seuil strict → large
✓  tué         point relais : et → ou
✓  tué         modes disponibles : every → some
✓  tué         marge d expiration supprimée
✓  tué         quantité zéro ne retire plus la ligne

7/8 mutants tués.
```

### Le survivant

```
libs/livraison/domaine/src/lib/strategies.ts
montantTotal >= SEUIL_FRANCO_EUROS  →  montantTotal > SEUIL_FRANCO_EUROS
```

Aucun test ne couvrait un panier à **exactement** 500 €. Les tests du TP 2
utilisaient 119, 300 et 600. La couverture de lignes était pourtant de 100 %.

Conséquence métier : avec la mutation en place, un client dont le panier fait
500,00 € pile se voit facturer 9,90 € de livraison. Le genre de bug qui remonte
par le service client six mois plus tard, et que personne n'arrive à reproduire.

### Le test qui l'attrape

```ts
it('offre la livraison AU seuil exact, pas seulement au-delà', () => {
  expect(coutLivraison([uneLigne({ montant: SEUIL_FRANCO_EUROS })], STRATEGIES)).toBe(0);
});

it('facture la livraison juste en dessous du seuil', () => {
  expect(coutLivraison([uneLigne({ montant: SEUIL_FRANCO_EUROS - 0.01 })], STRATEGIES)).toBe(9.9);
});
```

Deux tests, pas un : le seuil et son voisin immédiat. C'est le motif à retenir
pour **tout** seuil — on l'a déjà appliqué au TP 2 (`estVolumineux`), au TP 6
(point relais) et au TP 8 (marge d'expiration). Ici, on avait oublié.

Notez l'usage de la constante `SEUIL_FRANCO_EUROS` plutôt que de `500` : le test
suit la règle, pas sa valeur du moment.

### Ce qu'il faut en dire

*L'outil a trouvé un trou dans les tests que j'avais écrits pour vous apprendre
à tester.* C'est la meilleure démonstration possible du sujet, et elle n'est pas
mise en scène.

La leçon générale : **un test qui passe ne prouve rien tant qu'on n'a pas
vérifié qu'il sait échouer.** La couverture de lignes mesure ce qui a été
*exécuté*, pas ce qui a été *vérifié*.

---

## Si un test résiste

| Symptôme | Cause la plus probable |
| --- | --- |
| `expectNone` échoue sur panier vide | la garde `lignes.length === 0` est après l'appel HTTP |
| Le panier est vidé malgré l'erreur | `vider()` placé avant le `await`, ou dans le `finally` |
| Le 409 ne remonte pas `produitId` | lecture de `erreur.error` oubliée |
| `envoiEnCours` reste à `true` | `finally` manquant |
| `npm run mutants` très lent | filtrer : `node tools/mutants/chasse.mjs livraison` |
| Un fichier reste muté | `Ctrl+C` pendant la chasse — `git checkout libs/` |
