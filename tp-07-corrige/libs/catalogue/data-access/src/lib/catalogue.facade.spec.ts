import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@maison/partage/util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogueFacade, DELAI_FRAPPE_MS } from './catalogue.facade';
import { PageDto, ProduitDto } from './produit.dto';

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

describe('CatalogueFacade — signal-first', () => {
  let http: HttpTestingController;
  let facade: CatalogueFacade;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    facade = TestBed.inject(CatalogueFacade);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Une ressource est pilotée par un effet : `TestBed.tick()` le déclenche.
   * Sa résolution passe ensuite par une microtâche, que les faux timers
   * n'avancent pas — d'où les `await`.
   */
  async function laisserTravaillerLaRessource(): Promise<void> {
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
    TestBed.tick();
  }

  function repondre(page: PageDto<ProduitDto>): void {
    http.expectOne((r) => r.url === '/api/produits').flush(page);
  }

  describe('chargement initial', () => {
    it('interroge l API sans qu on le lui demande', () => {
      TestBed.tick();

      http.expectOne((r) => r.url === '/api/produits');
    });

    it('expose les produits et le total reçus', async () => {
      TestBed.tick();
      repondre(unePageDto([unDto()], 20));
      await laisserTravaillerLaRessource();

      expect(facade.produits()).toHaveLength(1);
      expect(facade.total()).toBe(20);
    });

    it('traduit les DTO en produits de domaine', async () => {
      TestBed.tick();
      repondre(unePageDto([unDto({ promotion: 15 })]));
      await laisserTravaillerLaRessource();

      expect(facade.produits()[0].prix).toEqual({ catalogue: 249.9, remisePourcent: 15 });
      expect(facade.produits()[0].gabarit).toEqual({ poidsKg: 42, volumeM3: 0.38 });
    });

    it('signale le chargement puis le termine', async () => {
      TestBed.tick();
      expect(facade.enChargement()).toBe(true);

      repondre(unePageDto([]));
      await laisserTravaillerLaRessource();

      expect(facade.enChargement()).toBe(false);
    });
  });

  describe('réaction aux filtres', () => {
    async function premierChargement(): Promise<void> {
      TestBed.tick();
      repondre(unePageDto([]));
      await laisserTravaillerLaRessource();
    }

    it('relance la requête quand un filtre change', async () => {
      await premierChargement();

      facade.filtrerParPiece('chambre');
      vi.advanceTimersByTime(DELAI_FRAPPE_MS);
      TestBed.tick();

      http.expectOne((r) => r.params.get('piece') === 'chambre');
    });

    it('ne part qu une fois pour une frappe rapide', async () => {
      await premierChargement();

      facade.rechercher('ca');
      facade.rechercher('can');
      facade.rechercher('canapé');
      vi.advanceTimersByTime(DELAI_FRAPPE_MS);
      TestBed.tick();

      const requetes = http.match(() => true);
      expect(requetes).toHaveLength(1);
      expect(requetes[0].request.params.get('q')).toBe('canapé');
    });

    it('ne part pas pour une seule lettre', async () => {
      await premierChargement();

      facade.rechercher('c');
      vi.advanceTimersByTime(DELAI_FRAPPE_MS);
      TestBed.tick();

      http.expectNone(() => true);
    });

    it('un changement de sélection ramène en page 1', async () => {
      await premierChargement();

      facade.allerALaPage(3);
      vi.advanceTimersByTime(DELAI_FRAPPE_MS);
      TestBed.tick();
      repondre(unePageDto([]));
      await laisserTravaillerLaRessource();

      facade.rechercher('table');

      expect(facade.filtres().page).toBe(1);
    });
  });

  describe('erreurs', () => {
    it('expose une erreur sans casser la façade', async () => {
      TestBed.tick();
      http.expectOne(() => true).flush('', { status: 503, statusText: 'indispo' });
      await laisserTravaillerLaRessource();

      expect(facade.erreur()).toBe('catalogue_indisponible');
      expect(facade.produits()).toEqual([]);
      expect(facade.enChargement()).toBe(false);
    });

    it('repart normalement à la recherche suivante', async () => {
      TestBed.tick();
      http.expectOne(() => true).flush('', { status: 503, statusText: 'indispo' });
      await laisserTravaillerLaRessource();

      facade.rechercher('table');
      vi.advanceTimersByTime(DELAI_FRAPPE_MS);
      TestBed.tick();
      repondre(unePageDto([unDto()], 3));
      await laisserTravaillerLaRessource();

      expect(facade.erreur()).toBeNull();
      expect(facade.total()).toBe(3);
    });
  });

  describe('rafraichir', () => {
    it('refait la requête courante', async () => {
      TestBed.tick();
      repondre(unePageDto([unDto()], 1));
      await laisserTravaillerLaRessource();

      facade.rafraichir();
      TestBed.tick();

      http.expectOne((r) => r.url === '/api/produits');
    });
  });
});
