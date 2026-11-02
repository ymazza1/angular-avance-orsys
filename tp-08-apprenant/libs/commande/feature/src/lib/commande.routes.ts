import { Routes } from '@angular/router';

export const COMMANDE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./commande.page').then((m) => m.CommandePage),
  },
];
