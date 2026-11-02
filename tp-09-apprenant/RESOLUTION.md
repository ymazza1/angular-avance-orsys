# TP 8 — Résolution pas à pas

Fichiers : `libs/auth/domaine/src/lib/session.ts`,
`libs/auth/data-access/src/lib/{session.store,auth.interceptor,admin.guard}.ts`,
`apps/boutique/src/app/{app.routes,app.config}.ts`

---

## Étape A — Durée contre instant

```ts
export function versSession(reponse, maintenant: number): Session {
  return {
    jeton: reponse.jeton,
    rafraichissement: reponse.rafraichissement,
    role: reponse.role === 'admin' ? 'admin' : 'client',
    nom: reponse.nom,
    expireLe: maintenant + reponse.expireDans * 1000,
  };
}
```

L'API renvoie une **durée** (`expireDans: 30`) ; le domaine manipule un
**instant** (`expireLe`). La conversion se fait une fois, à la frontière.

Stocker la durée obligerait à retenir aussi le moment de réception — deux
champs à maintenir cohérents au lieu d'un.

Le rôle inconnu retombe sur `client`, jamais sur `admin`. En sécurité, le défaut
va toujours vers le moins de droits.

---

## Étape B — La marge d'expiration

```ts
export const MARGE_EXPIRATION_MS = 2_000;

export function estExpiree(session: Session | null, maintenant: number): boolean {
  if (session === null) return true;
  return session.expireLe - MARGE_EXPIRATION_MS <= maintenant;
}
```

Un jeton qui expire dans deux secondes est déjà considéré comme mort.

**Pourquoi ?** Sans la marge, on envoie une requête avec un jeton qui expirera
pendant le trajet réseau. Résultat : un 401 parfaitement évitable, sur une
requête qu'on aurait pu préparer autrement.

Le test du cas limite est explicite :

```ts
const limite = uneSession({ expireLe: MAINTENANT + MARGE_EXPIRATION_MS });
expect(estExpiree(limite, MAINTENANT)).toBe(true);
```

`<=`, pas `<`. Comme au TP 2 pour `estVolumineux`, comme au TP 6 pour le point
relais : les seuils s'écrivent une fois et se testent.

---

## Étape C — Le store, et les promesses qui ne rejettent pas

```ts
async connexion(email: string, motDePasse: string): Promise<boolean> {
  this._erreur.set(null);
  try {
    const reponse = await firstValueFrom(
      this.http.post<ReponseAuth>(`${this.base}/auth/connexion`, { email, motDePasse }),
    );
    this._session.set(versSession(reponse, Date.now()));
    return true;
  } catch {
    this._erreur.set('identifiants_invalides');
    return false;
  }
}
```

M�me discipline qu'au TP 2 pour `charger()` : **un échec d'identifiants est un
état d'interface, pas une exception**. L'appelant n'a pas de `catch` à écrire.

```ts
async rafraichir(): Promise<boolean> {
  const session = this._session();
  if (session === null) return false;        // ← la garde qui compte
  …
}
```

Sans cette garde, on envoie une requête de rafraîchissement avec
`rafraichissement: undefined`. Le serveur répond 401. Et si un intercepteur de
reprise est branché (le bonus), ce 401 déclenche… un rafraîchissement. Boucle.

```ts
jetonValide(maintenant = Date.now()): string | null {
  const session = this._session();
  return estUtilisable(session, maintenant) ? session!.jeton : null;
}
```

Une seule méthode répond à « puis-je m'en servir maintenant ? ». L'intercepteur
n'a aucune logique d'expiration à connaître.

---

## Étape D — L'intercepteur et ses trois conditions

```ts
const PUBLIQUES = ['/auth/connexion', '/auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (requete, suivant) => {
  const base = inject(API_URL);
  const session = inject(SessionStore);

  const versNotreApi = requete.url.startsWith(base);
  const estPublique = PUBLIQUES.some((chemin) => requete.url.includes(chemin));
  const jeton = session.jetonValide();

  if (!versNotreApi || estPublique || jeton === null) return suivant(requete);

  return suivant(requete.clone({ setHeaders: { Authorization: `Bearer ${jeton}` } }));
};
```

**Condition 1 — notre API seulement.** C'est le test le plus important du TP :

```ts
client.get('https://analytics.example.com/evenement').subscribe();
expect(requete.request.headers.has('Authorization')).toBe(false);
```

Un intercepteur naïf ajoute l'en-tête partout, y compris vers un service tiers.
C'est une vraie fuite de jeton, elle est fréquente, et elle ne provoque **aucun
bug visible** — donc personne ne la trouve.

**Condition 2 — pas les routes d'authentification.** Un jeton expiré envoyé sur
sa propre route de rafraîchissement fait échouer le rafraîchissement.

**Condition 3 — un jeton valide.** `jetonValide()` a déjà tranché.

Notez `requete.clone(...)` : une requête HTTP Angular est **immuable**. Même
discipline que pour les signaux depuis le TP 4.

Branchement :

```ts
provideHttpClient(withInterceptors([authInterceptor])),
```

L'ordre du tableau est l'ordre d'exécution à l'aller, et l'ordre inverse au
retour.

---

## Étape E — `canMatch`, le cœur du TP

```ts
export const estAdmin: CanMatchFn = () => {
  const session = inject(SessionStore);
  const routeur = inject(Router);

  return session.estAdmin() ? true : routeur.createUrlTree(['/connexion']);
};
```

Trois retours possibles : `true`, `false`, ou un `UrlTree` — qui vaut
« redirige-moi là ».

```ts
{
  path: 'admin',
  canMatch: [estAdmin],
  loadChildren: () => import('@maison/admin/feature').then((m) => m.ADMIN_ROUTES),
},
```

### Ce qui change vraiment

| | `canActivate` | `canMatch` |
| --- | --- | --- |
| Moment | après chargement du bundle | **avant** |
| Le visiteur télécharge le code admin | **oui** | non |
| Deux composants pour un même chemin | non | oui |

**La démonstration**, en plénière, onglet Réseau vidé :

| Situation | Chunk `admin-page` |
| --- | --- |
| Anonyme sur `/admin` | absent |
| Client connecté | absent |
| Admin connecté | présent |

Et le rappel qui va avec : **ça ne remplace pas le contrôle serveur.** L'API
renvoie 401 et 403 quoi qu'il arrive. Le guard protège le *chargement du code*,
pas les *données*.

---

## Étape F — Le tableau de bord

```ts
protected readonly stats = httpResource<Statistiques>(
  () => `${this.base}/admin/statistiques`,
  { defaultValue: STATISTIQUES_VIDES },
);

protected readonly valeurs = computed<Statistiques>(() =>
  this.stats.hasValue() ? this.stats.value() : STATISTIQUES_VIDES,
);
```

M�me garde qu'au TP 7. Si vous ne l'écrivez pas, coupez l'API et regardez : la
page entière tombe sur `Resource is currently in an error state`.

C'est la deuxième fois que ce piège apparaît. À ce stade, il devrait être un
réflexe.

```html
@defer (on viewport) {
  …
} @placeholder {
  <div class="squelette" aria-hidden="true">…</div>
}
```

Sur cette page, le gain est de **trois kilo-octets** — autant le dire avant
qu'un stagiaire ne le fasse remarquer. Ce qui compte est le mécanisme, et le
`@placeholder` : sans lui, l'apparition du bloc décale la page. Lien direct avec
le CLS du TP 10.

---

## Si un test résiste

| Symptôme | Cause la plus probable |
| --- | --- |
| `inject() must be called from an injection context` | `runInInjectionContext` manquant dans le test du guard |
| Le jeton part vers le domaine tiers | condition `versNotreApi` absente |
| Le rafraîchissement part sans session | garde `if (session === null)` manquante |
| Le cas limite d'expiration échoue | `<` au lieu de `<=`, ou marge oubliée |
| Le chunk admin se télécharge quand même | `canActivate` au lieu de `canMatch`, ou import statique de `AdminPage` |
| La page admin plante quand l'API tombe | garde `hasValue()` oubliée |
