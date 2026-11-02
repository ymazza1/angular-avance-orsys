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

describe('PanierStore — bonus : code promo', () => {
  let store: PanierStore;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    ({ store, http } = creerStore());
  });

    it('applique la remise annoncée par l API', async () => {
      store.ajouter(CANAPE, 2);
      const promesse = store.appliquerCodePromo('BIENVENUE10');
      http.expectOne('/api/promotions/BIENVENUE10').flush({ valide: true, remisePourcent: 10 });
      await promesse;

      expect(store.remise()).toBe(219.3);
      expect(store.codePromo()).toBe('BIENVENUE10');
    });

    it('déduit la remise du total', async () => {
      store.ajouter(CANAPE, 2);
      const promesse = store.appliquerCodePromo('BIENVENUE10');
      http.expectOne(() => true).flush({ valide: true, remisePourcent: 10 });
      await promesse;

      expect(store.total()).toBe(1973.7);
    });

    it('signale un code refusé sans appliquer de remise', async () => {
      store.ajouter(CANAPE, 2);
      const promesse = store.appliquerCodePromo('BIDON');
      http.expectOne(() => true).flush({ valide: false });
      await promesse;

      expect(store.erreurPromo()).toBe('code_invalide');
      expect(store.remise()).toBe(0);
    });

    it('signale une panne de vérification', async () => {
      const promesse = store.appliquerCodePromo('BIENVENUE10');
      http.expectOne(() => true).flush('', { status: 503, statusText: 'indispo' });
      await promesse;

      expect(store.erreurPromo()).toBe('verification_impossible');
    });

    it('retire le code promo en vidant le panier', async () => {
      store.ajouter(CANAPE, 2);
      const promesse = store.appliquerCodePromo('BIENVENUE10');
      http.expectOne(() => true).flush({ valide: true, remisePourcent: 10 });
      await promesse;

      store.vider();

      expect(store.codePromo()).toBeNull();
      expect(store.remise()).toBe(0);
    });
});
