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

  /**
   * TODO TP 2 — étape 4
   * Dériver ces trois valeurs depuis _page. Aucune ne doit être stockée dans
   * un signal en écriture : ce sont des valeurs dérivées.
   */
  readonly produits = computed<readonly Produit[]>(() => {
    throw new Error('TP 2 — produits reste à écrire');
  });

  readonly total = computed<number>(() => {
    throw new Error('TP 2 — total reste à écrire');
  });

  readonly facettes = computed<Facettes>(() => {
    throw new Error('TP 2 — facettes reste à écrire');
  });

  /**
   * TODO TP 2 — étape 4
   * Charge la page correspondant aux filtres courants.
   * - passe en chargement, efface l'erreur précédente ;
   * - en cas d'échec : erreur renseignée, page vidée, et surtout PAS de rejet
   *   de la promesse — l'appelant n'a rien à rattraper ;
   * - dans tous les cas, le chargement se termine.
   */
  async charger(): Promise<void> {
    throw new Error('TP 2 — charger reste à écrire');
  }

  // --- commandes -------------------------------------------------------------
  // TODO TP 2 — étape 4 : chacune modifie les filtres via appliquer(), puis
  // déclenche un chargement.

  rechercher(recherche: string): void {
    throw new Error('TP 2 — rechercher reste à écrire');
  }

  filtrerParPiece(piece: Filtres['piece']): void {
    throw new Error('TP 2 — filtrerParPiece reste à écrire');
  }

  filtrerParMatiere(matiere: Filtres['matiere']): void {
    throw new Error('TP 2 — filtrerParMatiere reste à écrire');
  }

  trier(tri: Filtres['tri']): void {
    throw new Error('TP 2 — trier reste à écrire');
  }

  allerALaPage(page: number): void {
    throw new Error('TP 2 — allerALaPage reste à écrire');
  }

  reinitialiser(): void {
    throw new Error('TP 2 — reinitialiser reste à écrire');
  }
}
