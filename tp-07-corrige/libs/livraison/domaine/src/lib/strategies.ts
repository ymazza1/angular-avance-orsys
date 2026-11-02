import {
  LigneLivrable,
  SEUIL_FRANCO_EUROS,
  StrategieLivraison,
  SUPPLEMENT_PAR_UNITE_EUROS,
  TARIF_STANDARD_EUROS,
  TARIF_VOLUMINEUX_EUROS,
} from './strategie-livraison';

/** Meuble lourd ou encombrant : transporteur spécialisé, tarif fixe. */
export class LivraisonVolumineux implements StrategieLivraison {
  readonly nom = 'volumineux';

  supporte(ligne: LigneLivrable): boolean {
    return ligne.poidsKg >= 50 || ligne.volumeM3 >= 1;
  }

  cout(): number {
    return TARIF_VOLUMINEUX_EUROS;
  }
}

/** Colis classique : tarif de base, dégressif à la quantité. C'est le cas général. */
export class LivraisonStandard implements StrategieLivraison {
  readonly nom = 'standard';

  supporte(): boolean {
    return true;
  }

  cout(ligne: LigneLivrable): number {
    return TARIF_STANDARD_EUROS + (ligne.quantite - 1) * SUPPLEMENT_PAR_UNITE_EUROS;
  }
}

/**
 * La première stratégie qui accepte la ligne l'emporte : l'ordre des providers
 * est donc signifiant, et le cas général vient toujours en dernier.
 */
export function coutLivraison(
  lignes: readonly LigneLivrable[],
  strategies: readonly StrategieLivraison[],
): number {
  const montantTotal = lignes.reduce((total, ligne) => total + ligne.montant, 0);
  if (montantTotal >= SEUIL_FRANCO_EUROS) return 0;

  const cout = lignes.reduce((total, ligne) => {
    const strategie = strategies.find((s) => s.supporte(ligne));
    if (!strategie) {
      throw new Error(`Aucune stratégie de livraison pour la ligne ${JSON.stringify(ligne)}`);
    }
    return total + strategie.cout(ligne);
  }, 0);

  return Math.round(cout * 100) / 100;
}
