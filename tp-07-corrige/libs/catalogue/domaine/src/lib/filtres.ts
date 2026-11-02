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
 * Toute modification de la sélection ramène à la première page : sans cette
 * règle, changer de pièce alors qu'on est en page 3 affiche une liste vide.
 */
export function appliquer(filtres: Filtres, modification: Partial<Filtres>): Filtres {
  const changeLaSelection = !('page' in modification);
  return {
    ...filtres,
    ...modification,
    page: changeLaSelection ? 1 : (modification.page ?? filtres.page),
  };
}

export function estVide(filtres: Filtres): boolean {
  return (
    filtres.recherche === '' &&
    filtres.piece === null &&
    filtres.matiere === null &&
    filtres.prixMax === null
  );
}

export function rechercheExploitable(recherche: string): boolean {
  const nettoyee = recherche.trim();
  return nettoyee.length === 0 || nettoyee.length >= LONGUEUR_MINIMALE_RECHERCHE;
}
