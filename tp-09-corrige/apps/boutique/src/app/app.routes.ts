import { Routes } from '@angular/router';
import { estAdmin } from '@maison/auth/data-access';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('@maison/catalogue/feature').then((m) => m.CATALOGUE_ROUTES),
  },
  {
    path: 'commande',
    loadChildren: () => import('@maison/commande/feature').then((m) => m.COMMANDE_ROUTES),
  },
  {
    /**
     * `canMatch`, pas `canActivate` : la route n'est même pas considérée si
     * l'utilisateur n'est pas administrateur, donc le bundle n'est jamais
     * téléchargé. Vérifiable dans l'onglet Réseau.
     */
    path: 'admin',
    canMatch: [estAdmin],
    loadChildren: () => import('@maison/admin/feature').then((m) => m.ADMIN_ROUTES),
  },
];
