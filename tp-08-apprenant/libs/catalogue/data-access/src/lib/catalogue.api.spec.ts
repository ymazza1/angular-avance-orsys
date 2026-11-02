import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FILTRES_VIDES } from '@maison/catalogue/domaine';
import { API_URL } from '@maison/partage/util';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CatalogueApi, versParams } from './catalogue.api';
import { PageDto, ProduitDto } from './produit.dto';

function unDto(surcharges: Partial<ProduitDto> = {}): ProduitDto {
  return {
    id: 'p-001', nom: 'Étagère Kalix', description: '…', piece: 'salon', matiere: 'chene',
    prix_ttc: 249.9, poids_kg: 42, volume_m3: 0.38, stock: 12, note: 4.4, nb_avis: 87,
    promotion: null, image: '/img/kalix.jpg', ...surcharges,
  };
}

function unePageDto(items: ProduitDto[]): PageDto<ProduitDto> {
  return { items, total: items.length, page: 1, taille: 12, facettes: { pieces: [], matieres: [] } };
}

describe('versParams', () => {
  it('envoie toujours le tri et la page', () => {
    expect(versParams(FILTRES_VIDES).keys().sort()).toEqual(['page', 'tri']);
  });

  it('omet les critères non renseignés', () => {
    const params = versParams(FILTRES_VIDES);

    expect(params.has('q')).toBe(false);
    expect(params.has('piece')).toBe(false);
    expect(params.has('prixMax')).toBe(false);
  });

  it('nettoie la recherche avant de l envoyer', () => {
    expect(versParams({ ...FILTRES_VIDES, recherche: '  table  ' }).get('q')).toBe('table');
  });

  it('envoie les critères renseignés', () => {
    const params = versParams({ ...FILTRES_VIDES, piece: 'chambre', matiere: 'pin', prixMax: 500 });

    expect(params.get('piece')).toBe('chambre');
    expect(params.get('matiere')).toBe('pin');
    expect(params.get('prixMax')).toBe('500');
  });
});

describe('CatalogueApi', () => {
  // Depuis le TP 3, l'API renvoie des Observable : les tests les consomment
  // avec firstValueFrom, ce qui ne change rien à ce qui est vérifié.
  let http: HttpTestingController;
  let api: CatalogueApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api' }],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(CatalogueApi);
  });

  afterEach(() => http.verify());

  it('interroge la bonne URL', async () => {
    const promesse = firstValueFrom(api.rechercher(FILTRES_VIDES));

    http.expectOne((r) => r.url === '/api/produits').flush(unePageDto([]));

    await promesse;
  });

  it('traduit les DTO en produits de domaine', async () => {
    const promesse = firstValueFrom(api.rechercher(FILTRES_VIDES));
    http.expectOne((r) => r.url === '/api/produits').flush(unePageDto([unDto({ promotion: 15 })]));

    const page = await promesse;

    expect(page.items[0].prix).toEqual({ catalogue: 249.9, remisePourcent: 15 });
    expect(page.items[0].gabarit).toEqual({ poidsKg: 42, volumeM3: 0.38 });
  });

  it('reporte le total et les facettes', async () => {
    const promesse = firstValueFrom(api.rechercher(FILTRES_VIDES));
    http.expectOne((r) => r.url === '/api/produits').flush({
      ...unePageDto([unDto()]),
      total: 20,
      facettes: { pieces: [{ valeur: 'salon', nb: 8 }], matieres: [] },
    });

    const page = await promesse;

    expect(page.total).toBe(20);
    expect(page.facettes.pieces[0]).toEqual({ valeur: 'salon', nb: 8 });
  });

  it('récupère un produit par identifiant', async () => {
    const promesse = firstValueFrom(api.parId('p-001'));
    http.expectOne('/api/produits/p-001').flush(unDto());

    await expect(promesse).resolves.toMatchObject({ id: 'p-001' });
  });
});
