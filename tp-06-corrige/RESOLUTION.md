# TP 6 — Résolution pas à pas

Fichiers concernés :
`libs/commande/domaine/src/lib/commande.ts`
`libs/commande/feature/src/lib/commande.schema.ts`
`libs/commande/feature/src/lib/commande.page.ts`

---

## Étape A — Les seuils du point relais

```ts
export const POIDS_MAX_POINT_RELAIS_KG = 30;
export const VOLUME_MAX_POINT_RELAIS_M3 = 0.5;

export function accepteEnPointRelais(ligne: LignePanier): boolean {
  return ligne.poidsKg <= POIDS_MAX_POINT_RELAIS_KG && ligne.volumeM3 <= VOLUME_MAX_POINT_RELAIS_M3;
}
```

`<=`, pas `<` : un colis de 30 kg pile passe. Un test le vérifie
explicitement, comme au TP 2 pour `estVolumineux`.

Les seuils sont des constantes exportées, pas des littéraux enfouis. Le jour où
le transporteur change sa grille, on modifie deux lignes et les tests disent
immédiatement ce qui bouge.

---

## Étape B — La règle du panier entier

```ts
export function modesDisponibles(panier: Panier): readonly ModeLivraison[] {
  if (panier.length === 0) return [];
  const tousAcceptes = panier.every(accepteEnPointRelais);
  return tousAcceptes ? ['domicile', 'point-relais', 'express'] : ['domicile', 'express'];
}
```

**`every`, pas `some`.** Une seule ligne encombrante suffit à disqualifier le
point relais pour toute la commande — on ne va pas couper la livraison en deux.

Le cas du panier vide renvoie une liste vide plutôt que les trois modes : il
n'y a rien à livrer, proposer un mode n'aurait pas de sens. C'est le genre de
cas limite qu'on n'écrit que parce qu'un test l'exige.

---

## Étape C — Corriger plutôt que recalculer

```ts
export function modeCorrige(panier: Panier, mode: ModeLivraison): ModeLivraison {
  return modeEstDisponible(panier, mode) ? mode : 'domicile';
}
```

Trois lignes, mais c'est la fonction la plus intéressante du domaine.

Scénario : l'utilisateur choisit « point relais », puis retourne au catalogue et
ajoute un canapé. Sans cette fonction, on enregistre une commande impossible à
livrer — et le problème n'apparaît qu'à la préparation, en entrepôt.

**Pourquoi ne pas simplement recalculer le mode ?** Parce que c'est une donnée
**saisie**. Si on la recalculait, on écraserait le choix de l'utilisateur à
chaque modification du panier. On ne la corrige que quand elle devient
impossible — et on retombe sur le mode le plus universel.

---

## Étape D — Le schéma, et pourquoi il vit à part

```ts
export function schemaCommande(base: string) {
  return schema<Commande>((c) => {
    required(c.email, { message: 'Renseignez votre email' });
    email(c.email, { message: 'Cet email ne semble pas valide' });
    required(c.nom, { message: 'Renseignez votre nom' });
    required(c.adresse, { message: 'Renseignez votre adresse' });
    pattern(c.codePostal, FORMAT_CODE_POSTAL, { message: 'Cinq chiffres attendus' });
    required(c.ville, { message: 'Renseignez votre ville' });
    // …
  });
}
```

Une fonction, un paramètre, aucune injection. Le schéma ne connaît ni le
composant, ni le `PanierStore`, ni `HttpClient`.

**Le bénéfice se lit dans le spec** :

```ts
function unFormulaire(valeurs: Partial<Commande> = {}) {
  const modele = signal<Commande>({ ...COMMANDE_VIDE, ...valeurs });
  const injecteur = TestBed.inject(Injector);
  return runInInjectionContext(injecteur, () => form(modele, schemaCommande('/api')));
}
```

Pas de `createComponent`, pas de `fixture`, pas de `click()`. Onze tests de
validation en 130 ms.

`runInInjectionContext` est nécessaire parce que `form()` crée des signaux et
des ressources — c'est la seule concession au framework.

---

## Étape E — Les CGV, ou pourquoi `required` ne suffit pas

```ts
validate(c.accepteCgv, ({ value }) =>
  value() ? undefined : { kind: 'cgv', message: 'Vous devez accepter les CGV' },
);
```

`required(c.accepteCgv)` ne ferait rien d'utile : `false` n'est pas « vide ».
« Requis » signifie **non nul**, pas **vrai**.

Notez la forme de l'erreur : un simple objet `{ kind, message }`. Pas de
fabrique à importer, pas de classe à étendre. `kind` sert au code (pour
distinguer les erreurs), `message` à l'utilisateur.

---

## Étape F — La validation asynchrone

```ts
validateHttp(c.codePostal, {
  request: ({ value }) =>
    FORMAT_CODE_POSTAL.test(value()) ? `${base}/validation/code-postal/${value()}` : undefined,
  onSuccess: (reponse: ReponseCodePostal) =>
    reponse.valide ? undefined : { kind: 'zone', message: 'Nous ne livrons pas encore dans cette zone' },
  onError: () => undefined,
});
```

**`request` renvoie `undefined`** tant que le format est mauvais : la requête
n'est pas envoyée. Même réflexe qu'au TP 3 avec `rechercheExploitable` — on ne
fait pas travailler le serveur pour rien.

**`onSuccess` renvoie `undefined`** quand tout va bien. En validation, « pas
d'erreur » se dit `undefined`.

**`onError` renvoie `undefined`** : service en panne, on laisse passer. C'est un
arbitrage commercial — bloquer toutes les commandes parce qu'un service
auxiliaire est indisponible coûte plus cher que livrer trois colis dans une
zone mal desservie. À faire trancher par le métier, pas par le développeur.

Sous le capot, `validateHttp` construit un `httpResource` : la requête est
relancée quand la valeur change, et la précédente est annulée. C'est
exactement le mécanisme du TP 7, rencontré ici sans le savoir.

### Le test qui surprend

```ts
expect(champs.codePostal().pending()).toBe(true);
expect(champs().valid()).toBe(false);
expect(champs().invalid()).toBe(false);
```

Un formulaire complet dont une validation asynchrone est en cours n'est **ni
valide ni invalide**. Trois états.

C'est ce qui permet de désactiver le bouton **sans** afficher d'erreur :
l'utilisateur n'a rien fait de mal, on attend. Avec deux états, il aurait fallu
choisir entre laisser cliquer trop tôt et afficher un message injustifié.

*J'ai trouvé ce comportement en écrivant le test : j'attendais `valid()` à
`true`. C'est devenu le test le plus intéressant du TP.*

---

## Étape G — Les trois niveaux de lecture

```html
<input type="email" [formField]="commande.email" />

@if (commande.email().touched()) {
  @for (erreur of commande.email().errors(); track $index) {
    <p role="alert">{{ erreur.message }}</p>
  }
}

<button [disabled]="commande().invalid()" (click)="valider()">Valider</button>
```

| Écriture | Ce que c'est |
| --- | --- |
| `commande.email` | le **champ** — c'est lui qu'on passe à `[formField]` |
| `commande.email()` | son **état** : `value`, `errors`, `touched`, `pending`… |
| `commande()` | l'état du **formulaire entier** |

La confusion entre les deux premiers est l'erreur numéro un des premières
heures. Retenir : sans parenthèses, c'est la structure ; avec, c'est l'état.

Le garde `@if (touched())` n'est pas cosmétique : un formulaire qui affiche six
messages d'erreur avant la première frappe fait fuir.

---

## Étape H — L'effet de correction

```ts
constructor() {
  effect(() => {
    const lignes = this.panier.lignes();
    this.modele.update((commande) => ({
      ...commande,
      mode: modeCorrige(lignes, commande.mode),
    }));
  });
}
```

C'est le **troisième effet légitime** de la formation, et il n'est pas de la
même famille que les deux précédents.

| TP | Effet | Nature |
| --- | --- | --- |
| 4 | surveillance du stock | synchronise un système extérieur (minuterie) |
| 5 | persistance du panier | synchronise un système extérieur (stockage) |
| 6 | correction du mode | **répare un état saisi** |

Et celui-ci **écrit dans un signal**, ce qu'on a présenté comme suspect depuis
le jour 2. La nuance à assumer devant le groupe : la règle n'est pas « un effet
n'écrit jamais », c'est **« un effet ne calcule jamais »**.

Si quelqu'un propose un `computed`, faites-lui écrire le code : le choix de
l'utilisateur sera écrasé à chaque modification du panier.

---

## Si un test résiste

| Symptôme | Cause la plus probable |
| --- | --- |
| `form() must be called in an injection context` | manque `runInInjectionContext` dans le test |
| La validation asynchrone n'aboutit jamais | `provideHttpClientTesting()` absent des providers |
| `valid()` est faux sur un formulaire correct | la validation asynchrone est `pending` — vérifiez `invalid()` |
| Les CGV ne bloquent rien | `required` sur un booléen ; il faut `validate` |
| « Mon champ n'est pas lié » | `FormField` absent des `imports` du composant |
| Les erreurs s'affichent d'emblée | garde `@if (champ().touched())` manquant |
| Le mode reste sur « point relais » | l'effet de correction n'est pas dans le constructeur |
