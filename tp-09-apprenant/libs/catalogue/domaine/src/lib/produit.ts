/**
 * Modèle de domaine du catalogue.
 *
 * Contrainte vérifiée par les tests de structure du TP 1 : ce fichier
 * n'importe ni Angular, ni RxJS, ni quoi que ce soit venant de l'API.
 */

export type Piece = 'salon' | 'salle-a-manger' | 'chambre' | 'bureau';

export type Matiere =
  | 'chene' | 'hetre' | 'noyer' | 'pin'
  | 'melamine' | 'metal' | 'tissu' | 'velours' | 'laine';

export interface Produit {
  readonly id: string;
  readonly nom: string;
  readonly description: string;
  readonly piece: Piece;
  readonly matiere: Matiere;
  readonly prix: Prix;
  readonly gabarit: Gabarit;
  readonly stock: number;
  readonly avis: Avis;
  readonly image: string;
}

export interface Prix {
  /** Prix affiché avant remise, en euros TTC. */
  readonly catalogue: number;
  /** Pourcentage de remise en cours, ou null. */
  readonly remisePourcent: number | null;
}

export interface Gabarit {
  readonly poidsKg: number;
  readonly volumeM3: number;
}

export interface Avis {
  readonly note: number;
  readonly nombre: number;
}

/** Au-delà de l'un de ces seuils, le meuble relève d'une livraison spécialisée. */
export const POIDS_VOLUMINEUX_KG = 50;
export const VOLUME_VOLUMINEUX_M3 = 1;

/** Prix réellement payé par le client, remise appliquée. */
export function prixEffectif(prix: Prix): number {
  if (prix.remisePourcent === null) return prix.catalogue;
  return arrondirCentimes(prix.catalogue * (1 - prix.remisePourcent / 100));
}

export function estDisponible(produit: Produit): boolean {
  return produit.stock > 0;
}

export function estEnPromotion(produit: Produit): boolean {
  return produit.prix.remisePourcent !== null;
}

/**
 * Les seuils sont inclusifs : un meuble de 50 kg exactement bascule déjà sur
 * le circuit spécialisé. C'est une décision métier, pas un détail technique.
 */
export function estVolumineux(gabarit: Gabarit): boolean {
  return gabarit.poidsKg >= POIDS_VOLUMINEUX_KG || gabarit.volumeM3 >= VOLUME_VOLUMINEUX_M3;
}

function arrondirCentimes(montant: number): number {
  return Math.round(montant * 100) / 100;
}
