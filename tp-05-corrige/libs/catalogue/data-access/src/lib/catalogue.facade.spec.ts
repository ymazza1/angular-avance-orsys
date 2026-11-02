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

describe('CatalogueFacade', () => {
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

  /** Laisse passer le debounce sans attendre réellement. */
  function laisserPasserLaFrappe(): void {
    vi.advanceTimersByTime(DEBOUNCE);
  }

  describe('état initial', () => {
    it('ne déclenche aucune requête tant que rien n est demandé', () => {
      laisserPasserLaFrappe();

      http.expectNone(() => true);
    });

    it('part d un état vide', () => {
      expect(facade.produits()).toEqual([]);
      expect(facade.total()).toBe(0);
      expect(facade.erreur()).toBeNull();
      expect(facade.enChargement()).toBe(false);
    });
  });

  describe('économie de requêtes', () => {
    it('ne part qu une fois pour une frappe rapide', () => {
      facade.rechercher('ca');
      facade.rechercher('can');
      facade.rechercher('cana');
      facade.rechercher('canapé');

      laisserPasserLaFrappe();

      const requetes = http.match(() => true);
      expect(requetes).toHaveLength(1);
      expect(requetes[0].request.params.get('q')).toBe('canapé');
      requetes[0].flush(unePageDto([]));
    });

    it('ne part pas pour une seule lettre', () => {
      facade.rechercher('c');

      laisserPasserLaFrappe();

      http.expectNone(() => true);
    });

    it('repart quand la recherche est effacée', () => {
      facade.rechercher('');

      laisserPasserLaFrappe();

      http.expectOne((r) => !r.params.has('q')).flush(unePageDto([]));
    });

    it('ignore une demande identique à la précédente', () => {
      facade.filtrerParPiece('salon');
      laisserPasserLaFrappe();
      http.expectOne(() => true).flush(unePageDto([]));

      facade.filtrerParPiece('salon');
      laisserPasserLaFrappe();

      http.expectNone(() => true);
    });
  });

  describe('annulation', () => {
    it('annule la requête précédente au lieu de l ignorer', () => {
      facade.rechercher('canapé');
      laisserPasserLaFrappe();
      const premiere = http.expectOne((r) => r.params.get('q') === 'canapé');

      facade.rechercher('table');
      laisserPasserLaFrappe();
      const seconde = http.expectOne((r) => r.params.get('q') === 'table');

      expect(premiere.cancelled).toBe(true);
      seconde.flush(unePageDto([unDto()]));
    });

    it('n affiche jamais le résultat d une recherche abandonnée', () => {
      facade.rechercher('canapé');
      laisserPasserLaFrappe();
      const premiere = http.expectOne((r) => r.params.get('q') === 'canapé');

      facade.rechercher('table');
      laisserPasserLaFrappe();
      const seconde = http.expectOne((r) => r.params.get('q') === 'table');

      // Une requête annulée ne peut même plus délivrer sa réponse : c'est la
      // différence entre `switchMap` et un simple « on ignore le résultat ».
      expect(() => premiere.flush(unePageDto([unDto({ nom: 'PÉRIMÉ' })], 99))).toThrow();

      seconde.flush(unePageDto([unDto({ nom: 'Table Brume' })], 1));

      expect(facade.total()).toBe(1);
      expect(facade.produits()[0].nom).toBe('Table Brume');
    });
  });

  describe('chargement', () => {
    it('signale le chargement puis le termine', () => {
      facade.rafraichir();
      laisserPasserLaFrappe();

      expect(facade.enChargement()).toBe(true);

      http.expectOne(() => true).flush(unePageDto([unDto()]));

      expect(facade.enChargement()).toBe(false);
    });

    it('expose les produits et le total renvoyés', () => {
      facade.rafraichir();
      laisserPasserLaFrappe();
      http.expectOne(() => true).flush(unePageDto([unDto()], 20));

      expect(facade.produits()).toHaveLength(1);
      expect(facade.total()).toBe(20);
    });
  });

  describe('erreurs', () => {
    it('réessaie deux fois avant d abandonner', () => {
      facade.rafraichir();
      laisserPasserLaFrappe();

      http.expectOne(() => true).flush('', { status: 503, statusText: 'indispo' });
      vi.advanceTimersByTime(1000);
      http.expectOne(() => true).flush('', { status: 503, statusText: 'indispo' });
      vi.advanceTimersByTime(1000);
      http.expectOne(() => true).flush(unePageDto([unDto()], 7));

      expect(facade.erreur()).toBeNull();
      expect(facade.total()).toBe(7);
    });

    it('expose l erreur quand toutes les tentatives échouent', () => {
      facade.rafraichir();
      laisserPasserLaFrappe();

      for (let tentative = 0; tentative <= 2; tentative += 1) {
        http.expectOne(() => true).flush('', { status: 503, statusText: 'indispo' });
        vi.advanceTimersByTime(1000);
      }

      expect(facade.erreur()).toBe('catalogue_indisponible');
      expect(facade.produits()).toEqual([]);
      expect(facade.enChargement()).toBe(false);
    });

    it('survit à l erreur : la recherche suivante fonctionne', () => {
      facade.rafraichir();
      laisserPasserLaFrappe();
      for (let tentative = 0; tentative <= 2; tentative += 1) {
        http.expectOne(() => true).flush('', { status: 503, statusText: 'indispo' });
        vi.advanceTimersByTime(1000);
      }
      expect(facade.erreur()).not.toBeNull();

      facade.rechercher('table');
      laisserPasserLaFrappe();
      http.expectOne((r) => r.params.get('q') === 'table').flush(unePageDto([unDto()], 3));

      expect(facade.erreur()).toBeNull();
      expect(facade.total()).toBe(3);
    });
  });

});
