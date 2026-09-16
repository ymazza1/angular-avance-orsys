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
 * Seul endroit du code qui connaît à la fois le DTO et le modèle de domaine.
 * Le jour où l'API renomme un champ, un seul fichier change.
 */
export function versProduit(dto: ProduitDto): Produit {
  return {
    id: dto.id,
    nom: dto.nom,
    description: dto.description,
    piece: dto.piece as Piece,
    matiere: dto.matiere as Matiere,
    prix: { catalogue: dto.prix_ttc, remisePourcent: dto.promotion },
    gabarit: { poidsKg: dto.poids_kg, volumeM3: dto.volume_m3 },
    stock: dto.stock,
    avis: { note: dto.note, nombre: dto.nb_avis },
    image: dto.image,
  };
}
