/**
 * Contrat d'une stratégie de livraison.
 *
 * Une stratégie répond à deux questions : « ce cas me concerne-t-il ? » et
 * « combien ça coûte ? ». Ajouter une règle revient alors à ajouter un
 * fichier, jamais à modifier un `switch` déjà testé.
 *
 * Aucun import Angular ici : le jeton d'injection vit dans livraison/data-access.
 */
export interface StrategieLivraison {
  readonly nom: string;
  supporte(ligne: LigneLivrable): boolean;
  cout(ligne: LigneLivrable): number;
}

/** Ce dont la livraison a besoin — volontairement plus petit qu'un Produit. */
export interface LigneLivrable {
  readonly poidsKg: number;
  readonly volumeM3: number;
  readonly quantite: number;
  /** Montant de la ligne, en euros. */
  readonly montant: number;
}

/** Au-delà de ce montant de commande, la livraison est offerte. */
export const SEUIL_FRANCO_EUROS = 500;

export const TARIF_VOLUMINEUX_EUROS = 49;
export const TARIF_STANDARD_EUROS = 9.9;
export const SUPPLEMENT_PAR_UNITE_EUROS = 2;
