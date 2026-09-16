import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  appliquer,
  Filtres,
  FILTRES_VIDES,
  Produit,
  rechercheExploitable,
} from '@maison/catalogue/domaine';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  of,
  retry,
  startWith,
  Subject,
  switchMap,
  timer,
} from 'rxjs';
import { CatalogueApi, Facettes, PAGE_VIDE, PageProduits } from './catalogue.api';

const DELAI_FRAPPE_MS = 300;
const TENTATIVES = 2;

interface EtatCatalogue {
  readonly page: PageProduits;
  readonly erreur: string | null;
  readonly chargement: boolean;
}

const ETAT_INITIAL: EtatCatalogue = { page: PAGE_VIDE, erreur: null, chargement: false };

/**
 * Façade du catalogue — version flux (TP 3).
 *
 * La surface publique n'a pas changé d'un caractère depuis le TP 2 : c'est
 * l'intérêt de la façade. Aucun composant n'est touché par ce refactor.
 */
@Injectable({ providedIn: 'root' })
export class CatalogueFacade {
  private readonly api = inject(CatalogueApi);

  private readonly _filtres = signal<Filtres>(FILTRES_VIDES);
  readonly filtres = this._filtres.asReadonly();

  /**
   * Source d'événements. Un Subject plutôt que `toObservable(this._filtres)` :
   * ce qu'on veut modéliser ici est une SUITE DE DEMANDES dans le temps, pas la
   * valeur courante des filtres — cette dernière est déjà un signal.
   */
  private readonly demandes = new Subject<Filtres>();

  /**
   * TODO TP 3 — étapes 2 à 6
   *
   * Construire le pipeline à partir de `this.demandes`. Dans l'ordre :
   *
   *   filter               une lettre ne part pas au serveur
   *                        (réutiliser `rechercheExploitable`, ne pas réécrire la règle)
   *   debounceTime         DELAI_FRAPPE_MS
   *   distinctUntilChanged avec `memesFiltres` ci-dessous, pas JSON.stringify
   *   switchMap            vers this.api.rechercher(filtres), et à l'intérieur :
   *     retry              TENTATIVES fois, avec un délai croissant
   *     map                vers un EtatCatalogue chargé
   *     catchError         À L'INTÉRIEUR du switchMap — testez les deux positions
   *     startWith          l'état de chargement, à chaque requête
   *
   * Puis `toSignal(..., { initialValue: ETAT_INITIAL })` : une seule
   * souscription, nettoyée avec l'injecteur. Aucun `subscribe` manuel — un test
   * de structure le vérifie.
   */
  private readonly etat = toSignal(
    this.demandes.pipe(
      map((): EtatCatalogue => {
        throw new Error('TP 3 — le pipeline de la façade reste à écrire');
      }),
    ),
    { initialValue: ETAT_INITIAL },
  );

  readonly produits = computed<readonly Produit[]>(() => this.etat().page.items);
  readonly total = computed<number>(() => this.etat().page.total);
  readonly facettes = computed<Facettes>(() => this.etat().page.facettes);
  readonly enChargement = computed<boolean>(() => this.etat().chargement);
  readonly erreur = computed<string | null>(() => this.etat().erreur);

  // --- commandes ---------------------------------------------------------------

  /** Premier chargement, et bouton « réessayer ». */
  rafraichir(): void {
    this.demandes.next(this._filtres());
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
    this.rafraichir();
  }

  private modifier(modification: Partial<Filtres>): void {
    this._filtres.update((filtres) => appliquer(filtres, modification));
    this.rafraichir();
  }
}

/**
 * Comparateur explicite plutôt que `JSON.stringify` : celui-ci dépend de
 * l'ordre des clés, et casse silencieusement le jour où le type change.
 */
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
