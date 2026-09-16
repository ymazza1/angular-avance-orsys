import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { unProduit } from '@maison/catalogue/domaine';
import { fournirStrategiesLivraison } from '@maison/livraison/data-access';
import { API_URL } from '@maison/partage/util';
import { beforeEach, describe, expect, it } from 'vitest';
import { CLE_PERSISTANCE, PanierStore } from './panier.store';

const ETAGERE = unProduit({ id: 'p-001', nom: 'Étagère Kalix', stock: 12 });
const CANAPE = unProduit({
  id: 'p-002',
  nom: 'Canapé Sorel',
  prix: { catalogue: 1290, remisePourcent: 15 },
  gabarit: { poidsKg: 118, volumeM3: 2.4 },
  stock: 3,
});

function creerStore(): { store: PanierStore; http: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      fournirStrategiesLivraison(),
      { provide: API_URL, useValue: '/api' },
    ],
  });
  return { store: TestBed.inject(PanierStore), http: TestBed.inject(HttpTestingController) };
}

describe('PanierStore', () => {
  let store: PanierStore;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    ({ store, http } = creerStore());
  });

  describe('contenu', () => {
    it('démarre vide', () => {
      expect(store.estVide()).toBe(true);
      expect(store.nbArticles()).toBe(0);
      expect(store.total()).toBe(0);
    });

    it('ajoute un produit', () => {
      store.ajouter(ETAGERE, 2);

      expect(store.nbArticles()).toBe(2);
      expect(store.estVide()).toBe(false);
    });

    it('fusionne un produit déjà présent', () => {
      store.ajouter(ETAGERE, 2);
      store.ajouter(ETAGERE, 1);

      expect(store.lignes()).toHaveLength(1);
      expect(store.nbArticles()).toBe(3);
    });

    it('retire une ligne', () => {
      store.ajouter(ETAGERE);
      store.ajouter(CANAPE);

      store.retirer('p-001');

      expect(store.lignes()).toHaveLength(1);
    });

    it('vide le panier', () => {
      store.ajouter(ETAGERE);

      store.vider();

      expect(store.estVide()).toBe(true);
    });

    it('produit une nouvelle référence à chaque modification', () => {
      store.ajouter(ETAGERE);
      const avant = store.lignes();

      store.ajouter(CANAPE);

      expect(store.lignes()).not.toBe(avant);
      expect(avant).toHaveLength(1);
    });
  });

  describe('montants dérivés', () => {
    it('calcule le sous-total sur les prix remisés', () => {
      store.ajouter(CANAPE, 2);

      expect(store.sousTotal()).toBe(2193);
    });

    it('applique le tarif volumineux à un meuble encombrant', () => {
      store.ajouter(unProduit({ id: 'p-003', prix: { catalogue: 100, remisePourcent: null }, gabarit: { poidsKg: 96, volumeM3: 1.1 }, stock: 5 }));

      expect(store.fraisLivraison()).toBe(49);
    });

    it('offre la livraison au-delà du seuil de franco', () => {
      store.ajouter(CANAPE);

      expect(store.fraisLivraison()).toBe(0);
    });

    it('ne facture aucune livraison sur un panier vide', () => {
      expect(store.fraisLivraison()).toBe(0);
    });

    it('recalcule le total quand une quantité change', () => {
      store.ajouter(ETAGERE, 1);
      const avant = store.total();

      store.changerQuantite('p-001', 3);

      expect(store.total()).not.toBe(avant);
      expect(store.sousTotal()).toBe(749.7);
    });
  });

  describe('persistance', () => {
    it('écrit le panier dans le stockage local', () => {
      store.ajouter(ETAGERE, 2);
      TestBed.tick(); // laisse passer l'effet de persistance

      expect(JSON.parse(localStorage.getItem(CLE_PERSISTANCE) ?? '[]')).toHaveLength(1);
    });

    it('restaure le panier au démarrage', () => {
      store.ajouter(ETAGERE, 2);
      TestBed.tick();
      TestBed.resetTestingModule();

      const { store: nouveau } = creerStore();

      expect(nouveau.nbArticles()).toBe(2);
    });

    it('repart d un panier vide si le contenu stocké est illisible', () => {
      localStorage.setItem(CLE_PERSISTANCE, 'ceci n est pas du json');
      TestBed.resetTestingModule();

      const { store: nouveau } = creerStore();

      expect(nouveau.estVide()).toBe(true);
    });
  });
});
