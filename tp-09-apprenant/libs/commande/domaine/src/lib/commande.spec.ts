import { LignePanier } from '@maison/panier/domaine';
import { describe, expect, it } from 'vitest';
import {
  accepteEnPointRelais,
  modeCorrige,
  modeEstDisponible,
  modesDisponibles,
} from './commande';

function uneLigne(surcharges: Partial<LignePanier> = {}): LignePanier {
  return {
    produitId: 'p-001',
    nom: 'Étagère Kalix',
    prixUnitaire: 249.9,
    quantite: 1,
    stockDisponible: 12,
    poidsKg: 6,
    volumeM3: 0.12,
    ...surcharges,
  };
}

const CHAISE = uneLigne();
const CANAPE = uneLigne({ produitId: 'p-002', poidsKg: 118, volumeM3: 2.4 });

describe('accepteEnPointRelais', () => {
  it('accepte un petit colis', () => {
    expect(accepteEnPointRelais(CHAISE)).toBe(true);
  });

  it('refuse un colis trop lourd', () => {
    expect(accepteEnPointRelais(uneLigne({ poidsKg: 31 }))).toBe(false);
  });

  it('refuse un colis trop encombrant même léger', () => {
    expect(accepteEnPointRelais(uneLigne({ volumeM3: 0.6 }))).toBe(false);
  });

  it('inclut les valeurs de seuil', () => {
    expect(accepteEnPointRelais(uneLigne({ poidsKg: 30, volumeM3: 0.5 }))).toBe(true);
  });
});

describe('modesDisponibles', () => {
  it('ne propose rien sur un panier vide', () => {
    expect(modesDisponibles([])).toEqual([]);
  });

  it('propose les trois modes pour un panier de petits colis', () => {
    expect(modesDisponibles([CHAISE, CHAISE])).toEqual(['domicile', 'point-relais', 'express']);
  });

  it('retire le point relais dès qu une ligne est encombrante', () => {
    expect(modesDisponibles([CHAISE, CANAPE])).toEqual(['domicile', 'express']);
  });
});

describe('modeCorrige', () => {
  it('conserve un mode disponible', () => {
    expect(modeCorrige([CHAISE], 'point-relais')).toBe('point-relais');
  });

  it('retombe sur le domicile quand le mode devient indisponible', () => {
    expect(modeCorrige([CHAISE, CANAPE], 'point-relais')).toBe('domicile');
  });

  it('retombe sur le domicile sur un panier vide', () => {
    expect(modeCorrige([], 'express')).toBe('domicile');
  });
});

describe('modeEstDisponible', () => {
  it('reflète modesDisponibles', () => {
    expect(modeEstDisponible([CANAPE], 'point-relais')).toBe(false);
    expect(modeEstDisponible([CANAPE], 'express')).toBe(true);
  });
});
