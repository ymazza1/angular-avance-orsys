# TP 6 — Le tunnel de commande en Signal Forms

**Durée** 50 min

## Le contexte

Le panier fonctionne. Il faut maintenant pouvoir commander : coordonnées,
adresse, mode de livraison, CGV.

C'est l'occasion d'utiliser **Signal Forms**, stable depuis Angular 22. Le
modèle de données est un simple `signal`, la validation vit dans un schéma
séparé, et l'état du formulaire est exposé en signaux.

## Comment savoir si vous avez fini

```bash
npx nx test commande-domaine     # 11 rouges au départ
npx nx test commande-feature     # 11 rouges
npx nx run-many -t lint          # doit rester vert
```

22 tests. Le TP est volontairement plus court que les précédents : l'API est
neuve, mieux vaut du temps pour la comprendre que du volume à produire.

## Deux nouvelles bibliothèques

```
libs/commande/domaine/    type:domaine,  domaine:commande
libs/commande/feature/    type:feature,  domaine:commande
```

La règle de frontières autorise `domaine:commande` à atteindre `panier`,
`catalogue` et `livraison` — jamais l'inverse.

## Étape 1 — Le domaine (11 tests)

`libs/commande/domaine/src/lib/commande.ts`

Quatre fonctions, aucune ne connaît Angular :

| Fonction | Règle |
| --- | --- |
| `accepteEnPointRelais` | 30 kg et 0,5 m³ maximum, **seuils inclus** |
| `modesDisponibles` | pas de point relais si **une seule** ligne dépasse |
| `modeEstDisponible` | dérivée de la précédente |
| `modeCorrige` | ramène à `domicile` un mode devenu impossible |

`modeCorrige` mérite une explication. Cas réel : l'utilisateur choisit « point
relais », puis ajoute un canapé à son panier. Sans correction, on enregistre une
commande impossible à livrer.

**Ce sont des règles métier, pas des règles d'affichage.** La même fonction
servira à refuser une commande arrivée par une autre voie — une API publique,
un import de fichier.

## Étape 2 — Le schéma de validation (11 tests)

`libs/commande/feature/src/lib/commande.schema.ts`

```ts
export function schemaCommande(base: string) {
  return schema<Commande>((c) => {
    required(c.email, { message: 'Renseignez votre email' });
    email(c.email, { message: 'Cet email ne semble pas valide' });
    // …
  });
}
```

Les opérateurs disponibles : `required`, `email`, `pattern`, `minLength`,
`max`, `validate`, `validateHttp`, `disabled`, `hidden`, `readonly`, `apply`,
`applyWhen`.

Pour les CGV, `required` ne suffit pas — un booléen `false` n'est pas « vide ».
Il faut `validate` et renvoyer une erreur, qui est un simple objet :

```ts
validate(c.accepteCgv, ({ value }) =>
  value() ? undefined : { kind: 'cgv', message: 'Vous devez accepter les CGV' },
);
```

**Regardez où vit ce schéma** : dans son propre fichier, pas dans le composant.
C'est ce qui permet au spec de le tester **sans monter d'interface, sans DOM et
sans clic** — l'apport principal de Signal Forms sur les Reactive Forms, où la
validation finit mêlée à la construction du `FormGroup`.

## Étape 3 — La validation asynchrone

Toujours dans le schéma :

```ts
validateHttp(c.codePostal, {
  request: ({ value }) =>
    FORMAT_CODE_POSTAL.test(value()) ? `${base}/validation/code-postal/${value()}` : undefined,
  onSuccess: (reponse: ReponseCodePostal) =>
    reponse.valide ? undefined : { kind: 'zone', message: 'Nous ne livrons pas encore dans cette zone' },
  onError: () => undefined,
});
```

Trois choses à remarquer :

1. **`request` renvoie `undefined`** tant que le format n'est pas bon. Inutile
   d'interroger le serveur pour « 4 » — c'est le même réflexe qu'au TP 3 avec
   `rechercheExploitable`.
2. **`onError` renvoie `undefined`** : si le service de vérification est en
   panne, on ne bloque pas la commande. Décision commerciale, à assumer.
3. Sous le capot, c'est un `httpResource` — celui du TP 7. La requête est
   relancée quand la valeur change, et la précédente est annulée.

Codes postaux desservis pour tester : `44000`, `44840`, `75001`, `69001`,
`33000`, `59000`.

### Le test qui surprend

```ts
it('reste en attente tant que la zone de livraison n est pas vérifiée', () => {
  expect(champs.codePostal().pending()).toBe(true);
  expect(champs().valid()).toBe(false);
  expect(champs().invalid()).toBe(false);
});
```

Un formulaire complet mais dont une validation asynchrone est en cours n'est
**ni valide ni invalide**. Trois états, pas deux — et c'est exactement ce qu'il
faut pour désactiver le bouton sans afficher de message d'erreur.

## Étape 4 — Le formulaire (pas de test automatisé)

`commande.page.ts`

La liaison passe par la directive `FormField` :

```ts
imports: [FormField],
```

```html
<input type="email" [formField]="commande.email" />

@if (commande.email().touched()) {
  @for (erreur of commande.email().errors(); track $index) {
    <p role="alert">{{ erreur.message }}</p>
  }
}

<button [disabled]="commande().invalid()" (click)="valider()">Valider</button>
```

Trois niveaux de lecture à distinguer :

| Écriture | Ce que c'est |
| --- | --- |
| `commande.email` | le **champ**, à passer à `[formField]` |
| `commande.email()` | son **état** : `value`, `errors`, `touched`, `pending`… |
| `commande()` | l'état du **formulaire entier** |

N'affichez les erreurs qu'après `touched()` : personne n'aime un formulaire qui
crie avant qu'on ait tapé quoi que ce soit.

## Étape 5 — Corriger un mode devenu impossible

Dans le constructeur de la page :

```ts
effect(() => {
  const lignes = this.panier.lignes();
  this.modele.update((commande) => ({
    ...commande,
    mode: modeCorrige(lignes, commande.mode),
  }));
});
```

**Troisième `effect` légitime de la formation** — et il est d'une autre nature
que les deux précédents. Il ne synchronise pas un système extérieur : il
**répare un état saisi par l'utilisateur** quand le contexte change sous lui.

La question à se poser : pourrait-on en faire un `computed` ? Non, parce que le
mode est une donnée saisie, pas une donnée dérivée. On ne peut pas la
recalculer — seulement la corriger quand elle devient invalide.

## Étape 6 — Vérifier dans le navigateur

La route `/commande` est déjà déclarée.

- laissez l'email vide, sortez du champ : le message apparaît ;
- tapez `12345` en code postal : « zone non desservie » après un instant ;
- tapez `44840` : l'erreur disparaît ;
- ajoutez un canapé au panier : le point relais disparaît des options, et s'il
  était sélectionné, la sélection retombe sur « à domicile » ;
- décochez les CGV : le bouton se désactive.

## Vérification finale

- [ ] `npx nx run-many -t test` : tout vert
- [ ] `npx nx run-many -t lint` : vert
- [ ] Aucune règle métier dupliquée entre le domaine et le schéma
- [ ] Les erreurs ne s'affichent qu'après `touched()`
- [ ] Le mode de livraison se corrige tout seul

## Pour ceux qui finissent en avance

1. `applyWhen` permet d'appliquer un sous-schéma sous condition. Rendez le champ
   « ville » obligatoire uniquement quand le mode est « domicile ».
2. Comparez ce fichier avec ce qu'aurait donné un `FormGroup` typé : combien de
   lignes, et surtout — où serait la validation, et comment la testeriez-vous
   sans monter le composant ?
