import { describe, expect, it } from 'vitest';
import { appliquer, estVide, FILTRES_VIDES, rechercheExploitable } from './filtres';

describe('appliquer', () => {
  it('revient en page 1 quand la sélection change', () => {
    const filtres = { ...FILTRES_VIDES, page: 3 };

    expect(appliquer(filtres, { piece: 'chambre' }).page).toBe(1);
  });

  it('conserve la sélection quand on change seulement de page', () => {
    const filtres = { ...FILTRES_VIDES, piece: 'chambre' as const };

    expect(appliquer(filtres, { page: 2 })).toEqual({ ...filtres, page: 2 });
  });

  it('ne modifie pas l objet reçu', () => {
    const filtres = { ...FILTRES_VIDES };

    appliquer(filtres, { recherche: 'table' });

    expect(filtres.recherche).toBe('');
  });
});

describe('estVide', () => {
  it('est vrai sur des filtres neufs', () => {
    expect(estVide(FILTRES_VIDES)).toBe(true);
  });

  it('ignore le tri et la page', () => {
    expect(estVide({ ...FILTRES_VIDES, tri: 'prix', page: 4 })).toBe(true);
  });

  it('est faux dès qu un critère est posé', () => {
    expect(estVide({ ...FILTRES_VIDES, matiere: 'chene' })).toBe(false);
  });
});

describe('rechercheExploitable', () => {
  it('accepte une recherche effacée', () => {
    expect(rechercheExploitable('')).toBe(true);
  });

  it('refuse une seule lettre', () => {
    expect(rechercheExploitable('a')).toBe(false);
  });

  it('accepte deux caractères', () => {
    expect(rechercheExploitable('ta')).toBe(true);
  });

  it('ignore les espaces autour', () => {
    expect(rechercheExploitable('  a  ')).toBe(false);
  });
});
