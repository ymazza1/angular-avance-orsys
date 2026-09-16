import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@maison/partage/util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogueFacade } from './catalogue.facade';
import { PageDto, ProduitDto } from './produit.dto';

const DEBOUNCE = 300;

function unDto(surcharges: Partial<ProduitDto> = {}): ProduitDto {
  return {
    id: 'p-001', nom: 'Étagère Kalix', description: '…', piece: 'salon', matiere: 'chene',
    prix_ttc: 249.9, poids_kg: 42, volume_m3: 0.38, stock: 12, note: 4.4, nb_avis: 87,
    promotion: null, image: '/img/kalix.jpg', ...surcharges,
  };
}

function unePageDto(items: ProduitDto[], total = items.length): PageDto<ProduitDto> {
  return { items, total, page: 1, taille: 12, facettes: { pieces: [], matieres: [] } };
}

describe('CatalogueFacade — bonus', () => {
  let http: HttpTestingController;
  let facade: CatalogueFacade;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api' }],
    });
    http = TestBed.inject(HttpTestingController);
    facade = TestBed.inject(CatalogueFacade);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function laisserPasserLaFrappe(): void {
    vi.advanceTimersByTime(DEBOUNCE);
  }

  describe('filtres', () => {
    it('un changement de sélection ramène en page 1', () => {
      facade.allerALaPage(3);
      laisserPasserLaFrappe();
      http.expectOne((r) => r.params.get('page') === '3').flush(unePageDto([]));

      facade.rechercher('table');
      laisserPasserLaFrappe();

      expect(facade.filtres().page).toBe(1);
      http.expectOne((r) => r.params.get('page') === '1').flush(unePageDto([]));
    });

    it('reinitialiser repart des filtres vides', () => {
      facade.filtrerParMatiere('chene');
      laisserPasserLaFrappe();
      http.expectOne(() => true).flush(unePageDto([]));

      facade.reinitialiser();
      laisserPasserLaFrappe();

      expect(facade.filtres().matiere).toBeNull();
      http.expectOne((r) => !r.params.has('matiere')).flush(unePageDto([]));
    });
  });

});
