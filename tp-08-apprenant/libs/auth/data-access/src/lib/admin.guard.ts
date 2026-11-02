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
/**
 * TODO TP 8 — étape 4
 * Renvoyer `true`, ou un `UrlTree` de redirection vers /connexion.
 */
export const estAdmin: CanMatchFn = () => {
  throw new Error('TP 8 — estAdmin reste à écrire');
};
