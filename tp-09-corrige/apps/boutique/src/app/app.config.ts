import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { authInterceptor } from '@maison/auth/data-access';
import { fournirStrategiesLivraison } from '@maison/livraison/data-access';
import { routes } from './app.routes';

registerLocaleData(localeFr);

/**
 * Angular 22 : la détection de changements est zoneless par défaut et
 * zone.js n'est pas dans les polyfills (voir apps/boutique/project.json).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    // Les stratégies de livraison sont fournies en `multi` : sans cette
    // ligne, PanierStore ne peut pas s'instancier et le catalogue reste
    // vide, sans autre signe qu'un NG0201 dans la console.
    ...fournirStrategiesLivraison(),
  ],
};
