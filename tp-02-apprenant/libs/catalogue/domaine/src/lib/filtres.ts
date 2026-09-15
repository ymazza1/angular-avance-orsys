import { Matiere, Piece } from './produit';

export type Tri = 'pertinence' | 'prix' | 'prix-desc' | 'note';

export interface Filtres {
  readonly recherche: string;
  readonly piece: Piece | null;
  readonly matiere: Matiere | null;
  readonly prixMax: number | null;
  readonly tri: Tri;
  readonly page: number;
}

export const FILTRES_VIDES: Filtres = {
  recherche: '',
  piece: null,
  matiere: null,
  prixMax: null,
  tri: 'pertinence',
  page: 1,
};

/** Longueur minimale avant de déclencher une requête de recherche. */
export const LONGUEUR_MINIMALE_RECHERCHE = 2;

/**
 * TODO TP 2 — étape 2
 * Applique une modification aux filtres.
 * Règle métier : toute modification de la SÉLECTION ramène en page 1 ;
 * changer uniquement de page ne touche pas à la sélection.
 * Les filtres reçus ne doivent pas être mutés.
 */
export function appliquer(filtres: Filtres, modification: Partial<Filtres>): Filtres {
  throw new Error('TP 2 — appliquer reste à écrire');
}

/**
 * TODO TP 2 — étape 2
 * Vrai si aucun critère de sélection n'est posé. Le tri et la page n'en sont pas.
 */
export function estVide(filtres: Filtres): boolean {
  throw new Error('TP 2 — estVide reste à écrire');
}

/**
 * TODO TP 2 — étape 2
 * Vrai si la recherche est vide, ou suffisamment longue pour être envoyée.
 */
export function rechercheExploitable(recherche: string): boolean {
  throw new Error('TP 2 — rechercheExploitable reste à écrire');
}
