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
 * TODO TP 2 — étape 7
 * Enregistrer les deux stratégies en multi-providers sur STRATEGIES_LIVRAISON.
 * L'ordre compte : la première qui accepte une ligne l'emporte.
 */
export function fournirStrategiesLivraison(): Provider[] {
  throw new Error('TP 2 — fournirStrategiesLivraison reste à écrire');
}
