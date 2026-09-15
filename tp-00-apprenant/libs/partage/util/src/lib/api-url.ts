import { InjectionToken } from '@angular/core';

/**
 * URL de base de l'API Maison&Co.
 *
 * C'est une donnée d'environnement, pas une constante importée un peu partout :
 * un jeton d'injection la rend remplaçable en test, et configurable par route
 * ou par déploiement.
 */
export const API_URL = new InjectionToken<string>('api-url', {
  providedIn: 'root',
  // TODO TP 0 — étape 4
  // Renvoyer l'URL de base de l'API de démonstration.
  // Contraintes vérifiées par api-url.spec.ts :
  //   - URL absolue (http:// ou https://)
  //   - se termine par /api, sans barre oblique finale
  factory: () => '',
});
