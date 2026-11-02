import { describe, expect, it } from 'vitest';
import { ProduitDto, versProduit } from './produit.dto';

function unDto(surcharges: Partial<ProduitDto> = {}): ProduitDto {
  return {
    id: 'p-001',
    nom: 'Étagère Kalix',
    description: 'Étagère modulaire cinq niveaux.',
    piece: 'salon',
    matiere: 'chene',
    prix_ttc: 249.9,
    poids_kg: 42,
    volume_m3: 0.38,
    stock: 12,
    note: 4.4,
    nb_avis: 87,
    promotion: null,
    image: '/img/kalix.jpg',
    ...surcharges,
  };
}

describe('versProduit', () => {
  it('regroupe les champs de prix', () => {
    const produit = versProduit(unDto({ prix_ttc: 1290, promotion: 15 }));

    expect(produit.prix).toEqual({ catalogue: 1290, remisePourcent: 15 });
  });

  it('regroupe les champs de gabarit', () => {
    const produit = versProduit(unDto({ poids_kg: 118, volume_m3: 2.4 }));

    expect(produit.gabarit).toEqual({ poidsKg: 118, volumeM3: 2.4 });
  });

  it('regroupe les champs d avis', () => {
    const produit = versProduit(unDto({ note: 4.7, nb_avis: 212 }));

    expect(produit.avis).toEqual({ note: 4.7, nombre: 212 });
  });

  it('conserve l absence de promotion', () => {
    expect(versProduit(unDto({ promotion: null })).prix.remisePourcent).toBeNull();
  });

  it('reporte les champs simples', () => {
    const produit = versProduit(unDto());

    expect(produit.id).toBe('p-001');
    expect(produit.nom).toBe('Étagère Kalix');
    expect(produit.stock).toBe(12);
  });

  it('ne laisse fuir aucun nom de champ du DTO', () => {
    const produit = versProduit(unDto());

    expect(Object.keys(produit)).not.toContain('prix_ttc');
    expect(Object.keys(produit)).not.toContain('nb_avis');
  });
});
