import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@maison/partage/util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EtatStock, PERIODE_STOCK_MS, StockStore } from './stock.store';

function unEtat(surcharges: Partial<EtatStock> = {}): EtatStock {
  return { id: 'p-001', disponible: true, quantite: 12, ...surcharges };
}

describe('StockStore — bonus', () => {
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

  const laisserPasserLesPromesses = () => Promise.resolve().then(() => undefined);

  describe('robustesse', () => {
    it('ignore une erreur réseau sans perdre la valeur connue', async () => {
      store.surveiller(['p-001']);
      http.expectOne('/api/stocks/p-001').flush(unEtat({ quantite: 9 }));
      await laisserPasserLesPromesses();

      vi.advanceTimersByTime(PERIODE_STOCK_MS);
      http.expectOne('/api/stocks/p-001').flush('', { status: 503, statusText: 'indispo' });
      await laisserPasserLesPromesses();

      expect(store.quantite('p-001')).toBe(9);
    });

  });
});
