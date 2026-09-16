import { describe, expect, it } from 'vitest';
import { estDisponible, estVolumineux, prixEffectif } from './produit';
import { unProduit } from './produit.builder';

describe('prixEffectif', () => {
  it('retourne le prix catalogue en l absence de remise', () => {
    const produit = unProduit({ prix: { catalogue: 249.9, remisePourcent: null } });

    expect(prixEffectif(produit.prix)).toBe(249.9);
  });

  it('applique la remise', () => {
    const produit = unProduit({ prix: { catalogue: 1290, remisePourcent: 15 } });

    expect(prixEffectif(produit.prix)).toBe(1096.5);
  });

  it('arrondit au centime', () => {
    const produit = unProduit({ prix: { catalogue: 249.9, remisePourcent: 10 } });

    expect(prixEffectif(produit.prix)).toBe(224.91);
  });
});

describe('estDisponible', () => {
  it('est faux quand le stock est nul', () => {
    expect(estDisponible(unProduit({ stock: 0 }))).toBe(false);
  });

  it('est vrai dès une unité en stock', () => {
    expect(estDisponible(unProduit({ stock: 1 }))).toBe(true);
  });
});

describe('estVolumineux', () => {
  it('qualifie un meuble lourd', () => {
    expect(estVolumineux({ poidsKg: 118, volumeM3: 0.4 })).toBe(true);
  });

  it('qualifie un meuble encombrant même léger', () => {
    expect(estVolumineux({ poidsKg: 12, volumeM3: 2.4 })).toBe(true);
  });

  it('inclut les valeurs de seuil', () => {
    expect(estVolumineux({ poidsKg: 50, volumeM3: 0.1 })).toBe(true);
    expect(estVolumineux({ poidsKg: 10, volumeM3: 1 })).toBe(true);
  });

  it('ne qualifie pas un petit objet', () => {
    expect(estVolumineux({ poidsKg: 4, volumeM3: 0.14 })).toBe(false);
  });
});
