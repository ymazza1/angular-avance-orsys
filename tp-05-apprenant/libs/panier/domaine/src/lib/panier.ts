import { Produit, prixEffectif } from '@maison/catalogue/domaine';
import { LigneLivrable } from '@maison/livraison/domaine';

/**
 * Le panier est une valeur immuable : chaque opération renvoie un nouveau
 * panier. Aucune fonction de ce fichier ne modifie ce qu'elle reçoit.
 *
 * C'est ce qui permettra au store de n'être qu'un porteur de signal, sans
 * logique métier — et à ces règles d'être testées sans Angular.
 *
 * TODO TP 5 — étape 1
 * Trois fonctions sont à écrire : `ajouter`, `changerQuantite` et
 * `versLignesLivrables`. Les autres sont fournies — elles sont mécaniques.
 * Aucune ne doit modifier son argument : un test le vérifie explicitement.
 *
 * Deux helpers privés sont disponibles en bas de fichier : `remplacer` et
 * `borner`.
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

/** FOURNI — plomberie de construction, ce n'est pas le sujet. */
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
 * TODO TP 5 — étape 1
 * Ajouter un produit déjà présent additionne les quantités, sans jamais
 * dépasser le stock disponible ni QUANTITE_MAX_PAR_LIGNE.
 * Un produit en rupture n'entre pas dans le panier.
 */
export function ajouter(panier: Panier, produit: Produit, quantite = 1): Panier {
  throw new Error('TP 5 — ajouter reste à écrire');
}

/** FOURNI */
export function retirer(panier: Panier, produitId: string): Panier {
  return panier.filter((ligne) => ligne.produitId !== produitId);
}

/**
 * TODO TP 5 — étape 1
 * Une quantité nulle ou négative retire la ligne : c'est le geste attendu par
 * l'utilisateur qui met 0 dans le champ.
 */
export function changerQuantite(panier: Panier, produitId: string, quantite: number): Panier {
  throw new Error('TP 5 — changerQuantite reste à écrire');
}

/** FOURNI */
export function nbArticles(panier: Panier): number {
  return panier.reduce((total, ligne) => total + ligne.quantite, 0);
}

/** FOURNI */
export function sousTotal(panier: Panier): number {
  return arrondirCentimes(
    panier.reduce((total, ligne) => total + ligne.prixUnitaire * ligne.quantite, 0),
  );
}

/**
 * TODO TP 5 — étape 1
 * Traduction vers le vocabulaire du domaine livraison. Ne laissez fuir ni le
 * nom ni l'identifiant du produit : la livraison n'en a pas besoin.
 */
export function versLignesLivrables(panier: Panier): readonly LigneLivrable[] {
  throw new Error('TP 5 — versLignesLivrables reste à écrire');
}

/** FOURNI */
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
