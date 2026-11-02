import { describe, expect, it } from 'vitest';
import { LigneLivrable } from './strategie-livraison';
import { coutLivraison, LivraisonStandard, LivraisonVolumineux } from './strategies';

const STRATEGIES = [new LivraisonVolumineux(), new LivraisonStandard()];

function uneLigne(surcharges: Partial<LigneLivrable> = {}): LigneLivrable {
  return { poidsKg: 6, volumeM3: 0.12, quantite: 1, montant: 119, ...surcharges };
}

describe('LivraisonVolumineux', () => {
  it('accepte un meuble lourd', () => {
    expect(new LivraisonVolumineux().supporte(uneLigne({ poidsKg: 96 }))).toBe(true);
  });

  it('refuse un petit colis', () => {
    expect(new LivraisonVolumineux().supporte(uneLigne())).toBe(false);
  });
});

describe('LivraisonStandard', () => {
  it('accepte tout : c est le cas général', () => {
    expect(new LivraisonStandard().supporte(uneLigne({ poidsKg: 999 }))).toBe(true);
  });
});

describe('coutLivraison', () => {
  it('applique le tarif standard à un petit colis', () => {
    expect(coutLivraison([uneLigne()], STRATEGIES)).toBe(9.9);
  });

  it('ajoute un supplément par unité au-delà de la première', () => {
    expect(coutLivraison([uneLigne({ quantite: 3 })], STRATEGIES)).toBe(13.9);
  });

  it('bascule sur le tarif volumineux dès qu un critère est franchi', () => {
    expect(coutLivraison([uneLigne({ poidsKg: 118, montant: 300 })], STRATEGIES)).toBe(49);
  });

  it('offre la livraison au-delà du seuil de franco', () => {
    expect(coutLivraison([uneLigne({ montant: 600 })], STRATEGIES)).toBe(0);
  });

  it('additionne des lignes de natures différentes', () => {
    const lignes = [uneLigne({ montant: 100 }), uneLigne({ poidsKg: 96, volumeM3: 1.1, montant: 200 })];

    expect(coutLivraison(lignes, STRATEGIES)).toBe(58.9);
  });

  it('retient la première stratégie qui accepte la ligne', () => {
    const ordreInverse = [new LivraisonStandard(), new LivraisonVolumineux()];

    expect(coutLivraison([uneLigne({ poidsKg: 118, montant: 300 })], ordreInverse)).toBe(9.9);
  });

  it('refuse une ligne qu aucune stratégie n accepte', () => {
    expect(() => coutLivraison([uneLigne()], [new LivraisonVolumineux()])).toThrow();
  });

  it('coûte zéro sur un panier vide', () => {
    expect(coutLivraison([], STRATEGIES)).toBe(0);
  });
});
