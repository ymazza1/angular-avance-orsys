import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@maison/partage/util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EtatStock, PERIODE_STOCK_MS, StockStore } from './stock.store';

function unEtat(surcharges: Partial<EtatStock> = {}): EtatStock {
  return { id: 'p-001', disponible: true, quantite: 12, ...surcharges };
}

describe('StockStore', () => {
  let http: HttpTestingController;
  let store: StockStore;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api' }],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(StockStore);
  });

  afterEach(() => {
    store.arreter();
    vi.useRealTimers();
  });

  /** `firstValueFrom` résout sur une microtâche : il faut la laisser passer. */
  const laisserPasserLesPromesses = () => Promise.resolve().then(() => undefined);

  describe('surveillance', () => {
    it('interroge immédiatement chaque produit surveillé', () => {
      store.surveiller(['p-001', 'p-002']);

      expect(http.match(() => true)).toHaveLength(2);
    });

    it('expose la liste des produits surveillés', () => {
      store.surveiller(['p-001', 'p-002', 'p-003']);
      http.match(() => true);

      expect(store.nbSurveilles()).toBe(3);
    });

    it('réinterroge à chaque période', () => {
      store.surveiller(['p-001']);
      http.match(() => true);

      vi.advanceTimersByTime(PERIODE_STOCK_MS);

      expect(http.match(() => true)).toHaveLength(1);
    });

    it('repart de zéro quand on change la liste surveillée', () => {
      store.surveiller(['p-001']);
      http.match(() => true);

      store.surveiller(['p-002']);

      const requetes = http.match(() => true);
      expect(requetes).toHaveLength(1);
      expect(requetes[0].request.url).toContain('p-002');
    });
  });

  describe('état exposé', () => {
    it('expose la quantité reçue', async () => {
      store.surveiller(['p-001']);
      http.expectOne('/api/stocks/p-001').flush(unEtat({ quantite: 7 }));
      await laisserPasserLesPromesses();

      expect(store.quantite('p-001')).toBe(7);
    });

    it('expose la disponibilité reçue', async () => {
      store.surveiller(['p-001']);
      http.expectOne('/api/stocks/p-001').flush(unEtat({ disponible: false, quantite: 0 }));
      await laisserPasserLesPromesses();

      expect(store.estDisponible('p-001')).toBe(false);
    });

    it('renvoie null pour un produit jamais interrogé', () => {
      expect(store.quantite('p-999')).toBeNull();
      expect(store.estDisponible('p-999')).toBeNull();
    });

    it('produit une nouvelle référence à chaque mise à jour', async () => {
      store.surveiller(['p-001']);
      http.expectOne('/api/stocks/p-001').flush(unEtat({ quantite: 12 }));
      await laisserPasserLesPromesses();
      const avant = store.stocks();

      vi.advanceTimersByTime(PERIODE_STOCK_MS);
      http.expectOne('/api/stocks/p-001').flush(unEtat({ quantite: 3 }));
      await laisserPasserLesPromesses();

      expect(store.stocks()).not.toBe(avant);
      expect(avant.get('p-001')?.quantite).toBe(12);
      expect(store.stocks().get('p-001')?.quantite).toBe(3);
    });

    it('conserve les autres produits lors d une mise à jour', async () => {
      store.surveiller(['p-001', 'p-002']);
      http.expectOne('/api/stocks/p-001').flush(unEtat({ id: 'p-001', quantite: 12 }));
      http.expectOne('/api/stocks/p-002').flush(unEtat({ id: 'p-002', quantite: 4 }));
      await laisserPasserLesPromesses();

      expect(store.stocks().size).toBe(2);
    });
  });

  describe('robustesse', () => {
    it('arreter stoppe la minuterie', () => {
      store.surveiller(['p-001']);
      http.match(() => true);

      store.arreter();
      vi.advanceTimersByTime(PERIODE_STOCK_MS * 3);

      http.expectNone(() => true);
    });
  });

});
