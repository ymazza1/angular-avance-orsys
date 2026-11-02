import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_URL } from '@maison/partage/util';
import { SessionStore } from './session.store';

/** Routes qui ne doivent jamais recevoir le jeton. */
const PUBLIQUES = ['/auth/connexion', '/auth/refresh'];

/**
 * Ajoute le jeton aux requêtes de l'API — et seulement à celles-là.
 *
 * Deux garde-fous que les tests vérifient :
 *   - une requête vers un autre domaine ne doit pas emporter le jeton ;
 *   - les routes d'authentification non plus, sinon un jeton expiré ferait
 *     échouer son propre rafraîchissement.
 */
/** TODO TP 8 — étape 3 */
export const authInterceptor: HttpInterceptorFn = (requete, suivant) => {
  throw new Error('TP 8 — authInterceptor reste à écrire');
};
