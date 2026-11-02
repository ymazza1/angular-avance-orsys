import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  appliquer,
  Filtres,
  FILTRES_VIDES,
  Produit,
  rechercheExploitable,
} from '@maison/catalogue/domaine';
import { API_URL } from '@maison/partage/util';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';
import { Facettes, PAGE_VIDE, PageProduits, versParams } from './catalogue.api';
import { PageDto, ProduitDto, versProduit } from './produit.dto';

export const DELAI_FRAPPE_MS = 300;

/**
 * Façade du catalogue — version signal-first (TP 7).
 *
 * Elle remplace le pipeline RxJS du TP 3. Ce qui disparaît :
 *
 *   switchMap      → la ressource annule la requête précédente d'elle-même
 *   startWith      → `isLoading` est exposé par la ressource
 *   catchError     → `error` est exposé par la ressource
 *   map            → `parse` fait le mapping DTO → domaine
 *   toSignal       → la ressource EST déjà un signal
 *
 * Ce qui reste en RxJS, et pour de bonnes raisons : le `debounceTime` de la
 * saisie. Une ressource réagit à un changement de paramètre ; elle ne sait pas
 * attendre que l'utilisateur ait fini de taper. Le temps reste le domaine de
 * RxJS.
 *
 * Ce qu'on perd aussi, et qu'il faut assumer : le `retry` avec délai croissant.
 * `httpResource` n'a pas d'équivalent intégré — si la reprise automatique est
 * indispensable, `rxResource` permet de garder un pipe complet.
 *
 * La surface publique n'a toujours pas bougé depuis le TP 2.
 */
@Injectable({ providedIn: 'root' })
export class CatalogueFacade {
  private readonly base = inject(API_URL);

  private readonly _filtres = signal<Filtres>(FILTRES_VIDES);
  readonly filtres = this._filtres.asReadonly();

  private readonly filtresApaises = toSignal(
    toObservable(this._filtres).pipe(
      filter((f) => rechercheExploitable(f.recherche)),
      debounceTime(DELAI_FRAPPE_MS),
      distinctUntilChanged(memesFiltres),
    ),
    { initialValue: FILTRES_VIDES },
  );

  private readonly page = httpResource<PageProduits>(
    () => ({ url: `${this.base}/produits`, params: versParams(this.filtresApaises()) }),
    {
      defaultValue: PAGE_VIDE,
      parse: (brut) => {
        const dto = brut as PageDto<ProduitDto>;
        return { items: dto.items.map(versProduit), total: dto.total, facettes: dto.facettes };
      },
    },
  );

  /**
   * `value()` LÈVE quand la ressource est en erreur — elle ne retombe pas sur
   * `defaultValue`. C'est le piège n° 1 de `httpResource`, et il ne se voit
   * qu'en situation d'échec réseau.
   *
   * `hasValue()` est la garde : une seule dérivation protège les trois
   * suivantes.
   */
  private readonly pageSure = computed<PageProduits>(() =>
    this.page.hasValue() ? this.page.value() : PAGE_VIDE,
  );

  readonly produits = computed<readonly Produit[]>(() => this.pageSure().items);
  readonly total = computed<number>(() => this.pageSure().total);
  readonly facettes = computed<Facettes>(() => this.pageSure().facettes);
  readonly enChargement = this.page.isLoading;
  readonly erreur = computed<string | null>(() =>
    this.page.error() ? 'catalogue_indisponible' : null,
  );

  rafraichir(): void {
    this.page.reload();
  }

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
  }

  private modifier(modification: Partial<Filtres>): void {
    this._filtres.update((filtres) => appliquer(filtres, modification));
  }
}

function memesFiltres(a: Filtres, b: Filtres): boolean {
  return (
    a.recherche.trim() === b.recherche.trim() &&
    a.piece === b.piece &&
    a.matiere === b.matiere &&
    a.prixMax === b.prixMax &&
    a.tri === b.tri &&
    a.page === b.page
  );
}
