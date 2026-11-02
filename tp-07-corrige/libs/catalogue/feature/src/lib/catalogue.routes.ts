import { Routes } from '@angular/router';

export const CATALOGUE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./catalogue.page').then((m) => m.CataloguePage),
  },
];
