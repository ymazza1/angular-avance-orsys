import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
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
    // TODO TP 8 — étape 3 : brancher authInterceptor ici.
    provideHttpClient(),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
  ],
};
