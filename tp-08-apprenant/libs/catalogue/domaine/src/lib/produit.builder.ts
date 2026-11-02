import { Produit } from './produit';

/**
 * Constructeur de test : un seul endroit à modifier quand le modèle évolue,
 * et des tests qui ne mentionnent que ce qui les concerne.
 */
export function unProduit(surcharges: Partial<Produit> = {}): Produit {
  return {
    id: 'p-001',
    nom: 'Étagère Kalix',
    description: 'Étagère modulaire cinq niveaux en chêne massif.',
    piece: 'salon',
    matiere: 'chene',
    prix: { catalogue: 249.9, remisePourcent: null },
    gabarit: { poidsKg: 42, volumeM3: 0.38 },
    stock: 12,
    avis: { note: 4.4, nombre: 87 },
    image: '/img/kalix.jpg',
    ...surcharges,
  };
}
