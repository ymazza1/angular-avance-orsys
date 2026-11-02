import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('@maison/catalogue/feature').then((m) => m.CATALOGUE_ROUTES),
  },
  {
    path: 'commande',
    loadChildren: () => import('@maison/commande/feature').then((m) => m.COMMANDE_ROUTES),
  },
  // TODO TP 8 — étape 4
  // Déclarer la route /admin, protégée et chargée en lazy.
];
