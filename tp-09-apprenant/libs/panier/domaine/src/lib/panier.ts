import { Produit, prixEffectif } from '@maison/catalogue/domaine';
import { LigneLivrable } from '@maison/livraison/domaine';

/**
 * Le panier est une valeur immuable : chaque opération renvoie un nouveau
 * panier. Aucune fonction de ce fichier ne modifie ce qu'elle reçoit.
 *
 * C'est ce qui permettra au store de n'être qu'un porteur de signal, sans
 * logique métier — et à ces règles d'être testées sans Angular.
 */

export interface LignePanier {
  readonly produitId: string;
  readonly nom: string;
  /** Prix unitaire au moment de l'ajout, remise catalogue comprise. */
  readonly prixUnitaire: number;
  readonly quantite: number;
  readonly stockDisponible: number;
  readonly poidsKg: number;
  readonly volumeM3: number;
}

export type Panier = readonly LignePanier[];

export const PANIER_VIDE: Panier = [];

/** Au-delà, on considère que c'est une erreur de saisie plutôt qu'une commande. */
export const QUANTITE_MAX_PAR_LIGNE = 20;

export function ligneDepuisProduit(produit: Produit, quantite = 1): LignePanier {
  return {
    produitId: produit.id,
    nom: produit.nom,
    prixUnitaire: prixEffectif(produit.prix),
    quantite: borner(quantite, produit.stock),
    stockDisponible: produit.stock,
    poidsKg: produit.gabarit.poidsKg,
    volumeM3: produit.gabarit.volumeM3,
  };
}

/**
 * Ajouter un produit déjà présent additionne les quantités, sans jamais
 * dépasser le stock disponible ni le plafond de saisie.
 */
export function ajouter(panier: Panier, produit: Produit, quantite = 1): Panier {
  if (produit.stock <= 0) return panier;

  const existante = panier.find((ligne) => ligne.produitId === produit.id);
  if (!existante) return [...panier, ligneDepuisProduit(produit, quantite)];

  return remplacer(panier, produit.id, {
    ...existante,
    quantite: borner(existante.quantite + quantite, produit.stock),
  });
}

export function retirer(panier: Panier, produitId: string): Panier {
  return panier.filter((ligne) => ligne.produitId !== produitId);
}

/** Une quantité nulle ou négative retire la ligne : c'est le geste attendu. */
export function changerQuantite(panier: Panier, produitId: string, quantite: number): Panier {
  if (quantite <= 0) return retirer(panier, produitId);

  const existante = panier.find((ligne) => ligne.produitId === produitId);
  if (!existante) return panier;

  return remplacer(panier, produitId, {
    ...existante,
    quantite: borner(quantite, existante.stockDisponible),
  });
}

export function nbArticles(panier: Panier): number {
  return panier.reduce((total, ligne) => total + ligne.quantite, 0);
}

export function sousTotal(panier: Panier): number {
  return arrondirCentimes(
    panier.reduce((total, ligne) => total + ligne.prixUnitaire * ligne.quantite, 0),
  );
}

/** Traduction vers le vocabulaire du domaine livraison. */
export function versLignesLivrables(panier: Panier): readonly LigneLivrable[] {
  return panier.map((ligne) => ({
    poidsKg: ligne.poidsKg,
    volumeM3: ligne.volumeM3,
    quantite: ligne.quantite,
    montant: arrondirCentimes(ligne.prixUnitaire * ligne.quantite),
  }));
}

export function remise(sousTotalEuros: number, remisePourcent: number | null): number {
  if (remisePourcent === null) return 0;
  return arrondirCentimes(sousTotalEuros * (remisePourcent / 100));
}

function remplacer(panier: Panier, produitId: string, ligne: LignePanier): Panier {
  return panier.map((existante) => (existante.produitId === produitId ? ligne : existante));
}

function borner(quantite: number, stock: number): number {
  return Math.max(1, Math.min(quantite, stock, QUANTITE_MAX_PAR_LIGNE));
}

function arrondirCentimes(montant: number): number {
  return Math.round(montant * 100) / 100;
}
