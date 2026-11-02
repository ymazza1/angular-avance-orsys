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

/** TODO TP 6 — étape 1 : seuils inclus. */
export function accepteEnPointRelais(ligne: LignePanier): boolean {
  throw new Error('TP 6 — accepteEnPointRelais reste à écrire');
}

/**
 * TODO TP 6 — étape 1
 * Modes proposables pour un panier donné.
 *
 * Règle métier, pas règle d'affichage : c'est la même qui servira à refuser une
 * commande arrivée par une autre voie.
 */
export function modesDisponibles(panier: Panier): readonly ModeLivraison[] {
  throw new Error('TP 6 — modesDisponibles reste à écrire');
}

/** TODO TP 6 — étape 1 */
export function modeEstDisponible(panier: Panier, mode: ModeLivraison): boolean {
  throw new Error('TP 6 — modeEstDisponible reste à écrire');
}

/**
 * TODO TP 6 — étape 1
 * Corrige un mode devenu indisponible.
 *
 * Cas réel : l'utilisateur choisit « point relais », puis ajoute un canapé.
 * Laisser la sélection invalide produirait une commande impossible à livrer.
 */
export function modeCorrige(panier: Panier, mode: ModeLivraison): ModeLivraison {
  throw new Error('TP 6 — modeCorrige reste à écrire');
}
