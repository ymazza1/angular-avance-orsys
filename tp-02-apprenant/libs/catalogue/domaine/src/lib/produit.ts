/**
 * Modèle de domaine du catalogue.
 *
 * Contrainte vérifiée par les tests de structure du TP 1 : ce fichier
 * n'importe ni Angular, ni RxJS, ni quoi que ce soit venant de l'API.
 *
 * Les types sont fournis — c'est le comportement qui est à écrire.
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

/**
 * TODO TP 2 — étape 1
 * Prix réellement payé par le client, remise appliquée, arrondi au centime.
 */
export function prixEffectif(prix: Prix): number {
  throw new Error('TP 2 — prixEffectif reste à écrire');
}

/** TODO TP 2 — étape 1 */
export function estDisponible(produit: Produit): boolean {
  throw new Error('TP 2 — estDisponible reste à écrire');
}

/** TODO TP 2 — étape 1 */
export function estEnPromotion(produit: Produit): boolean {
  throw new Error('TP 2 — estEnPromotion reste à écrire');
}

/**
 * TODO TP 2 — étape 1
 * Attention aux valeurs de seuil : un test les vérifie explicitement.
 */
export function estVolumineux(gabarit: Gabarit): boolean {
  throw new Error('TP 2 — estVolumineux reste à écrire');
}
