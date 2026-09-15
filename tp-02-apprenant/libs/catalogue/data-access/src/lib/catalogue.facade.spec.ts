import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@maison/partage/util';
import { beforeEach, describe, expect, it } from 'vitest';
import { CatalogueFacade } from './catalogue.facade';
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

describe('CatalogueFacade', () => {
  let http: HttpTestingController;
  let facade: CatalogueFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api' }],
    });
    http = TestBed.inject(HttpTestingController);
    facade = TestBed.inject(CatalogueFacade);
  });

  it('part d un état vide', () => {
    expect(facade.produits()).toEqual([]);
    expect(facade.total()).toBe(0);
    expect(facade.erreur()).toBeNull();
  });

  it('expose les produits chargés', async () => {
    const promesse = facade.charger();
    http.expectOne((r) => r.url === '/api/produits').flush(unePageDto([unDto()], 20));
    await promesse;

    expect(facade.produits()).toHaveLength(1);
    expect(facade.total()).toBe(20);
  });

  it('signale le chargement puis le termine', async () => {
    const promesse = facade.charger();

    expect(facade.enChargement()).toBe(true);

    http.expectOne((r) => r.url === '/api/produits').flush(unePageDto([]));
    await promesse;

    expect(facade.enChargement()).toBe(false);
  });

  it('renseigne l erreur sans rejeter la promesse', async () => {
    const promesse = facade.charger();
    http.expectOne((r) => r.url === '/api/produits').flush('', { status: 503, statusText: 'indispo' });

    await expect(promesse).resolves.toBeUndefined();
    expect(facade.erreur()).not.toBeNull();
    expect(facade.produits()).toEqual([]);
    expect(facade.enChargement()).toBe(false);
  });

  it('efface l erreur au chargement suivant', async () => {
    const echec = facade.charger();
    http.expectOne((r) => r.url === '/api/produits').flush('', { status: 503, statusText: 'indispo' });
    await echec;

    const succes = facade.charger();
    http.expectOne((r) => r.url === '/api/produits').flush(unePageDto([unDto()]));
    await succes;

    expect(facade.erreur()).toBeNull();
  });

  it('une commande met à jour les filtres et déclenche une requête', async () => {
    facade.filtrerParPiece('chambre');

    expect(facade.filtres().piece).toBe('chambre');
    http.expectOne((r) => r.params.get('piece') === 'chambre').flush(unePageDto([]));
  });

  it('un changement de sélection ramène en page 1', async () => {
    facade.allerALaPage(3);
    http.expectOne((r) => r.params.get('page') === '3').flush(unePageDto([]));

    facade.rechercher('table');

    expect(facade.filtres().page).toBe(1);
    http.expectOne((r) => r.params.get('q') === 'table').flush(unePageDto([]));
  });

  it('reinitialiser repart des filtres vides', async () => {
    facade.filtrerParMatiere('chene');
    http.expectOne(() => true).flush(unePageDto([]));

    facade.reinitialiser();

    expect(facade.filtres().matiere).toBeNull();
    http.expectOne(() => true).flush(unePageDto([]));
  });
});
