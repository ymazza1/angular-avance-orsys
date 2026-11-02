/**
 * Catalogue de démonstration.
 * Volontairement hétérogène : certains produits sont volumineux, d'autres en
 * rupture, d'autres en promotion. Les TP s'appuient sur ces cas limites.
 */
const PRODUITS = [
  { id: 'p-001', nom: 'Étagère Kalix', piece: 'salon', matiere: 'chene', prix_ttc: 249.9, poids_kg: 42, volume_m3: 0.38, stock: 12, note: 4.4, nb_avis: 87, promotion: null, image: '/img/kalix.jpg', description: 'Étagère modulaire cinq niveaux en chêne massif.' },
  { id: 'p-002', nom: 'Canapé Sorel 3 places', piece: 'salon', matiere: 'tissu', prix_ttc: 1290, poids_kg: 118, volume_m3: 2.4, stock: 3, note: 4.7, nb_avis: 212, promotion: 15, image: '/img/sorel.jpg', description: 'Canapé trois places, assise profonde, déhoussable.' },
  { id: 'p-003', nom: 'Table Brume 180', piece: 'salle-a-manger', matiere: 'chene', prix_ttc: 890, poids_kg: 96, volume_m3: 1.1, stock: 0, note: 4.6, nb_avis: 54, promotion: null, image: '/img/brume.jpg', description: 'Table à manger six à huit couverts, plateau massif.' },
  { id: 'p-004', nom: 'Chaise Linn', piece: 'salle-a-manger', matiere: 'hetre', prix_ttc: 119, poids_kg: 6, volume_m3: 0.12, stock: 64, note: 4.1, nb_avis: 340, promotion: null, image: '/img/linn.jpg', description: 'Chaise coque hêtre courbé, empilable.' },
  { id: 'p-005', nom: 'Lit Havn 160x200', piece: 'chambre', matiere: 'pin', prix_ttc: 640, poids_kg: 74, volume_m3: 1.6, stock: 7, note: 4.3, nb_avis: 96, promotion: 10, image: '/img/havn.jpg', description: 'Lit double avec sommier à lattes intégré.' },
  { id: 'p-006', nom: 'Table de chevet Mira', piece: 'chambre', matiere: 'noyer', prix_ttc: 189, poids_kg: 11, volume_m3: 0.09, stock: 23, note: 4.5, nb_avis: 61, promotion: null, image: '/img/mira.jpg', description: 'Chevet deux tiroirs, façade noyer.' },
  { id: 'p-007', nom: 'Armoire Vallon', piece: 'chambre', matiere: 'melamine', prix_ttc: 549, poids_kg: 132, volume_m3: 2.9, stock: 2, note: 3.9, nb_avis: 44, promotion: null, image: '/img/vallon.jpg', description: 'Armoire trois portes coulissantes avec miroir.' },
  { id: 'p-008', nom: 'Bureau Atel', piece: 'bureau', matiere: 'metal', prix_ttc: 329, poids_kg: 28, volume_m3: 0.5, stock: 18, note: 4.2, nb_avis: 128, promotion: null, image: '/img/atel.jpg', description: 'Bureau piétement métal, plateau stratifié.' },
  { id: 'p-009', nom: 'Fauteuil Ombre', piece: 'salon', matiere: 'velours', prix_ttc: 459, poids_kg: 24, volume_m3: 0.9, stock: 9, note: 4.8, nb_avis: 73, promotion: 20, image: '/img/ombre.jpg', description: 'Fauteuil enveloppant, velours côtelé.' },
  { id: 'p-010', nom: 'Buffet Sable', piece: 'salle-a-manger', matiere: 'chene', prix_ttc: 799, poids_kg: 88, volume_m3: 1.3, stock: 5, note: 4.4, nb_avis: 39, promotion: null, image: '/img/sable.jpg', description: 'Buffet deux portes, trois tiroirs.' },
  { id: 'p-011', nom: 'Lampadaire Nord', piece: 'salon', matiere: 'metal', prix_ttc: 129, poids_kg: 4, volume_m3: 0.14, stock: 41, note: 4.0, nb_avis: 156, promotion: null, image: '/img/nord.jpg', description: 'Lampadaire arc, abat-jour textile.' },
  { id: 'p-012', nom: 'Tapis Dune 200x300', piece: 'salon', matiere: 'laine', prix_ttc: 379, poids_kg: 18, volume_m3: 0.25, stock: 14, note: 4.3, nb_avis: 88, promotion: null, image: '/img/dune.jpg', description: 'Tapis laine tufté main, motif géométrique.' },
  { id: 'p-013', nom: 'Meuble TV Riva', piece: 'salon', matiere: 'noyer', prix_ttc: 429, poids_kg: 46, volume_m3: 0.7, stock: 6, note: 4.1, nb_avis: 51, promotion: null, image: '/img/riva.jpg', description: 'Meuble TV deux niches, passe-câbles.' },
  { id: 'p-014', nom: 'Bibliothèque Tour', piece: 'bureau', matiere: 'melamine', prix_ttc: 219, poids_kg: 34, volume_m3: 0.6, stock: 0, note: 3.7, nb_avis: 29, promotion: null, image: '/img/tour.jpg', description: 'Bibliothèque haute six niveaux.' },
  { id: 'p-015', nom: 'Chaise de bureau Pivot', piece: 'bureau', matiere: 'tissu', prix_ttc: 289, poids_kg: 16, volume_m3: 0.35, stock: 27, note: 4.0, nb_avis: 204, promotion: 10, image: '/img/pivot.jpg', description: 'Assise ergonomique, soutien lombaire réglable.' },
  { id: 'p-016', nom: 'Commode Fjord', piece: 'chambre', matiere: 'pin', prix_ttc: 359, poids_kg: 52, volume_m3: 0.8, stock: 11, note: 4.2, nb_avis: 66, promotion: null, image: '/img/fjord.jpg', description: 'Commode quatre tiroirs, pin brossé.' },
  { id: 'p-017', nom: 'Table basse Galet', piece: 'salon', matiere: 'chene', prix_ttc: 269, poids_kg: 31, volume_m3: 0.45, stock: 16, note: 4.5, nb_avis: 112, promotion: null, image: '/img/galet.jpg', description: 'Table basse ovale, piétement fuselé.' },
  { id: 'p-018', nom: 'Miroir Onde', piece: 'chambre', matiere: 'metal', prix_ttc: 149, poids_kg: 9, volume_m3: 0.2, stock: 33, note: 4.6, nb_avis: 74, promotion: null, image: '/img/onde.jpg', description: 'Miroir rond, cadre laiton brossé.' },
  { id: 'p-019', nom: 'Desserte Casta', piece: 'salle-a-manger', matiere: 'hetre', prix_ttc: 199, poids_kg: 14, volume_m3: 0.22, stock: 21, note: 3.8, nb_avis: 33, promotion: null, image: '/img/casta.jpg', description: 'Desserte roulante deux plateaux.' },
  { id: 'p-020', nom: 'Canapé-lit Nuit', piece: 'salon', matiere: 'tissu', prix_ttc: 1090, poids_kg: 104, volume_m3: 2.1, stock: 4, note: 4.0, nb_avis: 58, promotion: null, image: '/img/nuit.jpg', description: 'Canapé convertible avec coffre de rangement.' },
];

const PIECES = ['salon', 'salle-a-manger', 'chambre', 'bureau'];
const MATIERES = ['chene', 'hetre', 'noyer', 'pin', 'melamine', 'metal', 'tissu', 'velours', 'laine'];

module.exports = { PRODUITS, PIECES, MATIERES };
