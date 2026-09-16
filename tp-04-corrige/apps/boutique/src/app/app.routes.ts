import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('@maison/catalogue/feature').then((m) => m.CATALOGUE_ROUTES),
  },
];
