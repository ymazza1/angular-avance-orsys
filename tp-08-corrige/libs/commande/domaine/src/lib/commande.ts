import { LignePanier, Panier } from '@maison/panier/domaine';

/**
 * Domaine de la commande : types et règles, sans Angular ni formulaire.
 *
 * Les règles écrites ici sont testables seules, et réutilisables ailleurs que
 * dans le tunnel — c'est ce qui les distingue d'une validation de formulaire.
 */

export type ModeLivraison = 'domicile' | 'point-relais' | 'express';

export interface Commande {
  readonly email: string;
  readonly nom: string;
  readonly adresse: string;
  readonly codePostal: string;
  readonly ville: string;
  readonly mode: ModeLivraison;
  readonly accepteCgv: boolean;
}

export const COMMANDE_VIDE: Commande = {
  email: '',
  nom: '',
  adresse: '',
  codePostal: '',
  ville: '',
  mode: 'domicile',
  accepteCgv: false,
};

export const FORMAT_CODE_POSTAL = /^[0-9]{5}$/;

/** Un point relais n'accepte pas les colis lourds ou encombrants. */
export const POIDS_MAX_POINT_RELAIS_KG = 30;
export const VOLUME_MAX_POINT_RELAIS_M3 = 0.5;

export function accepteEnPointRelais(ligne: LignePanier): boolean {
  return ligne.poidsKg <= POIDS_MAX_POINT_RELAIS_KG && ligne.volumeM3 <= VOLUME_MAX_POINT_RELAIS_M3;
}

/**
 * Modes proposables pour un panier donné.
 *
 * Règle métier, pas règle d'affichage : c'est la même qui servira à refuser une
 * commande arrivée par une autre voie.
 */
export function modesDisponibles(panier: Panier): readonly ModeLivraison[] {
  if (panier.length === 0) return [];
  const tousAcceptes = panier.every(accepteEnPointRelais);
  return tousAcceptes ? ['domicile', 'point-relais', 'express'] : ['domicile', 'express'];
}

export function modeEstDisponible(panier: Panier, mode: ModeLivraison): boolean {
  return modesDisponibles(panier).includes(mode);
}

/**
 * Corrige un mode devenu indisponible.
 *
 * Cas réel : l'utilisateur choisit « point relais », puis ajoute un canapé.
 * Laisser la sélection invalide produirait une commande impossible à livrer.
 */
export function modeCorrige(panier: Panier, mode: ModeLivraison): ModeLivraison {
  return modeEstDisponible(panier, mode) ? mode : 'domicile';
}
