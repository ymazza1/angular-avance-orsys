import { InjectionToken, Provider } from '@angular/core';
import { LivraisonStandard, LivraisonVolumineux, StrategieLivraison } from '@maison/livraison/domaine';

/**
 * Les règles de livraison sont du métier pur et vivent dans le domaine.
 * Leur COMPOSITION relève d'Angular : c'est pour ça qu'elle est ici, et pas
 * dans livraison/domaine — un InjectionToken dans le domaine ferait échouer
 * les tests de structure du TP 1.
 */
export const STRATEGIES_LIVRAISON = new InjectionToken<readonly StrategieLivraison[]>(
  'strategies-livraison',
);

/**
 * `multi: true` : plusieurs providers pour un même jeton, injectés sous forme
 * de tableau, dans l'ordre de déclaration. Ajouter une règle de livraison
 * revient donc à ajouter une ligne ici et un fichier dans le domaine.
 */
export function fournirStrategiesLivraison(): Provider[] {
  return [
    { provide: STRATEGIES_LIVRAISON, multi: true, useClass: LivraisonVolumineux },
    { provide: STRATEGIES_LIVRAISON, multi: true, useClass: LivraisonStandard },
  ];
}
