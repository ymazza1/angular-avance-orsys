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
   * Le pipeline, de haut en bas :
   *
   *   filter              une lettre ne part pas au serveur (règle du domaine)
   *   debounceTime        une frappe rapide = une seule requête
   *   distinctUntilChanged deux fois les mêmes filtres = une seule requête
   *   switchMap           la requête précédente est annulée, pas seulement ignorée
   *     retry             deux nouvelles tentatives, délai croissant
   *     catchError        À L'INTÉRIEUR : l'erreur ne tue que la requête courante
   *     startWith         l'état de chargement part avec chaque requête
   *
   * `toSignal` souscrit une seule fois et se désabonne avec l'injecteur : il n'y
   * a aucun `subscribe` manuel dans le code applicatif.
   */
  private readonly etat = toSignal(
    this.demandes.pipe(
      filter((f) => rechercheExploitable(f.recherche)),
      debounceTime(DELAI_FRAPPE_MS),
      distinctUntilChanged(memesFiltres),
      switchMap((filtres) =>
        this.api.rechercher(filtres).pipe(
          retry({ count: TENTATIVES, delay: (_, tentative) => timer(200 * 2 ** (tentative - 1)) }),
          map((page): EtatCatalogue => ({ page, erreur: null, chargement: false })),
          catchError(() =>
            of<EtatCatalogue>({
              page: PAGE_VIDE,
              erreur: 'catalogue_indisponible',
              chargement: false,
            }),
          ),
          startWith<EtatCatalogue>({ page: PAGE_VIDE, erreur: null, chargement: true }),
        ),
      ),
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
