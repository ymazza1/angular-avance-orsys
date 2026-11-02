import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { SessionStore } from './session.store';

/**
 * `CanMatchFn`, pas `CanActivateFn`.
 *
 * La différence est décisive : `canMatch` est évalué **avant** le chargement du
 * bundle de la route. Avec `canActivate`, le code du back-office serait
 * téléchargé par tous les visiteurs, puis refusé. Ici il n'est jamais
 * téléchargé.
 */
export const estAdmin: CanMatchFn = () => {
  const session = inject(SessionStore);
  const routeur = inject(Router);

  return session.estAdmin() ? true : routeur.createUrlTree(['/connexion']);
};
