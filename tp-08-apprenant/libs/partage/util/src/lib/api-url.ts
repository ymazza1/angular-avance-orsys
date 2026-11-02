import { InjectionToken } from '@angular/core';

/**
 * URL de base de l'API Maison&Co.
 *
 * C'est une donnée d'environnement, pas une constante importée un peu partout :
 * un jeton d'injection la rend remplaçable en test, et configurable par route
 * ou par déploiement.
 *
 * En production, cette valeur serait injectée au déploiement plutôt que
 * compilée dans le bundle.
 */
export const API_URL = new InjectionToken<string>('api-url', {
  providedIn: 'root',
  factory: () => 'http://localhost:3333/api',
});
