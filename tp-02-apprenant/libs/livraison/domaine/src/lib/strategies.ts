import {
  LigneLivrable,
  SEUIL_FRANCO_EUROS,
  StrategieLivraison,
  SUPPLEMENT_PAR_UNITE_EUROS,
  TARIF_STANDARD_EUROS,
  TARIF_VOLUMINEUX_EUROS,
} from './strategie-livraison';

/**
 * TODO TP 2 — étape 7
 * Meuble lourd ou encombrant : transporteur spécialisé, tarif fixe.
 * Les seuils sont ceux de estVolumineux (50 kg ou 1 m³, inclus).
 */
export class LivraisonVolumineux implements StrategieLivraison {
  readonly nom = 'volumineux';

  supporte(ligne: LigneLivrable): boolean {
    throw new Error('TP 2 — LivraisonVolumineux.supporte reste à écrire');
  }

  cout(ligne: LigneLivrable): number {
    throw new Error('TP 2 — LivraisonVolumineux.cout reste à écrire');
  }
}

/**
 * TODO TP 2 — étape 7
 * Colis classique : tarif de base, plus un supplément par unité supplémentaire.
 * C'est le cas général : il accepte tout.
 */
export class LivraisonStandard implements StrategieLivraison {
  readonly nom = 'standard';

  supporte(ligne: LigneLivrable): boolean {
    throw new Error('TP 2 — LivraisonStandard.supporte reste à écrire');
  }

  cout(ligne: LigneLivrable): number {
    throw new Error('TP 2 — LivraisonStandard.cout reste à écrire');
  }
}

/**
 * TODO TP 2 — étape 7
 * Coût total de livraison d'un ensemble de lignes.
 *
 * Règles, dans cet ordre :
 *   1. au-delà du seuil de franco sur le MONTANT TOTAL, c'est offert ;
 *   2. sinon, chaque ligne est traitée par la PREMIÈRE stratégie qui l'accepte ;
 *   3. si aucune stratégie n'accepte une ligne, c'est une erreur — pas un zéro ;
 *   4. le total est arrondi au centime (attention aux flottants : 9.9 + 49).
 */
export function coutLivraison(
  lignes: readonly LigneLivrable[],
  strategies: readonly StrategieLivraison[],
): number {
  throw new Error('TP 2 — coutLivraison reste à écrire');
}
