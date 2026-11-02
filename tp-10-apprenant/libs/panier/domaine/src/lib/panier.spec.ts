import { unProduit } from '@maison/catalogue/domaine';
import { describe, expect, it } from 'vitest';
import {
  ajouter,
  changerQuantite,
  ligneDepuisProduit,
  nbArticles,
  Panier,
  PANIER_VIDE,
  QUANTITE_MAX_PAR_LIGNE,
  remise,
  retirer,
  sousTotal,
  versLignesLivrables,
} from './panier';

const ETAGERE = unProduit({ id: 'p-001', nom: 'Étagère Kalix', stock: 12 });
const CANAPE = unProduit({
  id: 'p-002',
  nom: 'Canapé Sorel',
  prix: { catalogue: 1290, remisePourcent: 15 },
  gabarit: { poidsKg: 118, volumeM3: 2.4 },
  stock: 3,
});

describe('ligneDepuisProduit', () => {
  it('retient le prix remisé, pas le prix catalogue', () => {
    expect(ligneDepuisProduit(CANAPE).prixUnitaire).toBe(1096.5);
  });

  it('mémorise le stock disponible au moment de l ajout', () => {
    expect(ligneDepuisProduit(CANAPE).stockDisponible).toBe(3);
  });
});

describe('ajouter', () => {
  it('crée une ligne sur un panier vide', () => {
    const panier = ajouter(PANIER_VIDE, ETAGERE);

    expect(panier).toHaveLength(1);
    expect(panier[0].quantite).toBe(1);
  });

  it('additionne les quantités d un produit déjà présent', () => {
    const panier = ajouter(ajouter(PANIER_VIDE, ETAGERE, 2), ETAGERE, 3);

    expect(panier).toHaveLength(1);
    expect(panier[0].quantite).toBe(5);
  });

  it('ne dépasse jamais le stock disponible', () => {
    const panier = ajouter(PANIER_VIDE, CANAPE, 10);

    expect(panier[0].quantite).toBe(3);
  });

  it('plafonne la quantité par ligne', () => {
    const panier = ajouter(PANIER_VIDE, unProduit({ stock: 500 }), 999);

    expect(panier[0].quantite).toBe(QUANTITE_MAX_PAR_LIGNE);
  });

  it('refuse un produit en rupture', () => {
    expect(ajouter(PANIER_VIDE, unProduit({ stock: 0 }))).toEqual(PANIER_VIDE);
  });

  it('ne modifie pas le panier reçu', () => {
    const avant: Panier = ajouter(PANIER_VIDE, ETAGERE);

    ajouter(avant, CANAPE);

    expect(avant).toHaveLength(1);
  });
});

describe('changerQuantite', () => {
  it('remplace la quantité', () => {
    const panier = changerQuantite(ajouter(PANIER_VIDE, ETAGERE), 'p-001', 4);

    expect(panier[0].quantite).toBe(4);
  });

  it('retire la ligne quand la quantité tombe à zéro', () => {
    const panier = changerQuantite(ajouter(PANIER_VIDE, ETAGERE), 'p-001', 0);

    expect(panier).toEqual([]);
  });

  it('retire la ligne sur une quantité négative', () => {
    const panier = changerQuantite(ajouter(PANIER_VIDE, ETAGERE), 'p-001', -3);

    expect(panier).toEqual([]);
  });

  it('borne au stock connu de la ligne', () => {
    const panier = changerQuantite(ajouter(PANIER_VIDE, CANAPE), 'p-002', 99);

    expect(panier[0].quantite).toBe(3);
  });

  it('ignore un produit absent du panier', () => {
    const avant = ajouter(PANIER_VIDE, ETAGERE);

    expect(changerQuantite(avant, 'p-999', 5)).toEqual(avant);
  });
});

describe('retirer', () => {
  it('supprime la ligne demandée et conserve les autres', () => {
    const panier = retirer(ajouter(ajouter(PANIER_VIDE, ETAGERE), CANAPE), 'p-001');

    expect(panier).toHaveLength(1);
    expect(panier[0].produitId).toBe('p-002');
  });
});

describe('totaux', () => {
  it('compte les articles, pas les lignes', () => {
    const panier = ajouter(ajouter(PANIER_VIDE, ETAGERE, 3), CANAPE, 2);

    expect(nbArticles(panier)).toBe(5);
  });

  it('calcule le sous-total sur les prix remisés', () => {
    const panier = ajouter(PANIER_VIDE, CANAPE, 2);

    expect(sousTotal(panier)).toBe(2193);
  });

  it('vaut zéro sur un panier vide', () => {
    expect(sousTotal(PANIER_VIDE)).toBe(0);
    expect(nbArticles(PANIER_VIDE)).toBe(0);
  });
});

describe('remise', () => {
  it('vaut zéro sans code promo', () => {
    expect(remise(2193, null)).toBe(0);
  });

  it('applique le pourcentage et arrondit au centime', () => {
    expect(remise(2193, 10)).toBe(219.3);
  });
});

describe('versLignesLivrables', () => {
  it('traduit chaque ligne vers le vocabulaire de la livraison', () => {
    const lignes = versLignesLivrables(ajouter(PANIER_VIDE, CANAPE, 2));

    expect(lignes).toEqual([{ poidsKg: 118, volumeM3: 2.4, quantite: 2, montant: 2193 }]);
  });

  it('ne laisse fuir ni le nom ni l identifiant du produit', () => {
    const lignes = versLignesLivrables(ajouter(PANIER_VIDE, ETAGERE));

    expect(Object.keys(lignes[0]).sort()).toEqual(['montant', 'poidsKg', 'quantite', 'volumeM3']);
  });
});
