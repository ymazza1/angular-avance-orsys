import { Matiere, Piece, Produit } from '@maison/catalogue/domaine';

/**
 * Représentation telle que l'API la renvoie : casse mixte, champs à plat,
 * unités dans les noms. Elle est dictée par le serveur, pas par le métier.
 */
export interface ProduitDto {
  id: string;
  nom: string;
  description: string;
  piece: string;
  matiere: string;
  prix_ttc: number;
  poids_kg: number;
  volume_m3: number;
  stock: number;
  note: number;
  nb_avis: number;
  promotion: number | null;
  image: string;
}

export interface PageDto<T> {
  items: T[];
  total: number;
  page: number;
  taille: number;
  facettes: { pieces: FacetteDto[]; matieres: FacetteDto[] };
}

export interface FacetteDto {
  valeur: string;
  nb: number;
}

/**
 * TODO TP 2 — étape 3
 * Seul endroit du code qui a le droit de connaître à la fois le DTO et le
 * modèle de domaine. Si `prix_ttc` apparaît ailleurs, c'est une fuite.
 */
export function versProduit(dto: ProduitDto): Produit {
  throw new Error('TP 2 — versProduit reste à écrire');
}
