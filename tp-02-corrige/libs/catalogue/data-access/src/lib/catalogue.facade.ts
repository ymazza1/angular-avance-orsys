import { computed, inject, Injectable, signal } from '@angular/core';
import { appliquer, Filtres, FILTRES_VIDES, Produit } from '@maison/catalogue/domaine';
import { CatalogueApi, Facettes, PAGE_VIDE, PageProduits } from './catalogue.api';

/**
 * Façade du catalogue.
 *
 * Surface publique : de l'état en LECTURE SEULE, et des commandes NOMMÉES.
 * Les composants ne connaissent ni HttpClient, ni la forme des DTO, ni la
 * mécanique de chargement.
 *
 * Version naïve au TP 2 : un appel par changement de filtre, sans debounce ni
 * annulation. Le TP 3 fera constater les dégâts avant de les corriger.
 */
@Injectable({ providedIn: 'root' })
export class CatalogueFacade {
  private readonly api = inject(CatalogueApi);

  private readonly _filtres = signal<Filtres>(FILTRES_VIDES);
  private readonly _page = signal<PageProduits>(PAGE_VIDE);
  private readonly _chargement = signal(false);
  private readonly _erreur = signal<string | null>(null);

  readonly filtres = this._filtres.asReadonly();
  readonly enChargement = this._chargement.asReadonly();
  readonly erreur = this._erreur.asReadonly();

  /** Valeurs dérivées : jamais stockées, toujours recalculées depuis _page. */
  readonly produits = computed<readonly Produit[]>(() => this._page().items);
  readonly total = computed<number>(() => this._page().total);
  readonly facettes = computed<Facettes>(() => this._page().facettes);

  /**
   * L'erreur est capturée ici et exposée comme un état : aucun appelant n'a
   * de `catch` à écrire, et le composant n'a qu'à lire `erreur()`.
   */
  async charger(): Promise<void> {
    this._chargement.set(true);
    this._erreur.set(null);
    try {
      this._page.set(await this.api.rechercher(this._filtres()));
    } catch {
      this._page.set(PAGE_VIDE);
      this._erreur.set('catalogue_indisponible');
    } finally {
      this._chargement.set(false);
    }
  }

  // --- commandes -------------------------------------------------------------

  rechercher(recherche: string): void {
    this.modifier({ recherche });
  }

  filtrerParPiece(piece: Filtres['piece']): void {
    this.modifier({ piece });
  }

  filtrerParMatiere(matiere: Filtres['matiere']): void {
    this.modifier({ matiere });
  }

  trier(tri: Filtres['tri']): void {
    this.modifier({ tri });
  }

  allerALaPage(page: number): void {
    this.modifier({ page });
  }

  reinitialiser(): void {
    this._filtres.set(FILTRES_VIDES);
    void this.charger();
  }

  /**
   * `void` est explicite : on ne veut pas attendre le chargement, et on ne
   * veut pas non plus d'une promesse non gérée qui traîne.
   */
  private modifier(modification: Partial<Filtres>): void {
    this._filtres.update((filtres) => appliquer(filtres, modification));
    void this.charger();
  }
}
