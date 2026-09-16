import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { CatalogueFacade, StockStore } from '@maison/catalogue/data-access';
import { Piece, Produit } from '@maison/catalogue/domaine';
import { BadgeStockComponent, CarteProduitComponent } from '@maison/catalogue/ui';

const PIECES: readonly Piece[] = ['salon', 'salle-a-manger', 'chambre', 'bureau'];

/**
 * Composant routé : il orchestre, il ne calcule pas. Son seul travail est de
 * traduire des gestes utilisateur en commandes de façade, et de distribuer
 * l'état aux composants d'affichage.
 */
@Component({
  selector: 'mc-catalogue-page',
  imports: [CarteProduitComponent, BadgeStockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <h1>Notre catalogue</h1>

      <input
        type="search"
        [value]="facade.filtres().recherche"
        (input)="facade.rechercher($any($event.target).value)"
        placeholder="Rechercher un meuble"
        aria-label="Rechercher un meuble"
      />

      <nav aria-label="Filtrer par pièce">
        <button type="button" (click)="facade.filtrerParPiece(null)">Toutes</button>
        @for (piece of pieces; track piece) {
          <button
            type="button"
            [attr.aria-pressed]="facade.filtres().piece === piece"
            (click)="facade.filtrerParPiece(piece)"
          >
            {{ piece }}
          </button>
        }
      </nav>
    </header>

    @if (facade.erreur()) {
      <p role="alert">
        Le catalogue est momentanément indisponible.
        <button type="button" (click)="facade.rafraichir()">Réessayer</button>
      </p>
    } @else if (facade.enChargement()) {
      <p aria-live="polite">Chargement du catalogue…</p>
    } @else {
      <p aria-live="polite">{{ facade.total() }} produits</p>

      <ul class="grille">
        @for (produit of facade.produits(); track produit.id) {
          <li>
            <mc-carte-produit [produit]="produit" (ajouter)="ajouterAuPanier($event)" />
            <mc-badge-stock [quantite]="stocks.quantite(produit.id)" />
          </li>
        } @empty {
          <li>Aucun produit ne correspond à ces critères.</li>
        }
      </ul>
    }
  `,
  styleUrl: './catalogue.page.scss',
})
export class CataloguePage {
  protected readonly facade = inject(CatalogueFacade);
  protected readonly stocks = inject(StockStore);
  protected readonly pieces = PIECES;

  constructor() {
    this.facade.rafraichir();

    /**
     * Le stock des produits affichés est surveillé en continu. L'effet est
     * légitime ici : il synchronise un service extérieur (une minuterie) avec
     * un état réactif — il ne calcule rien.
     */
    effect(() => {
      const ids = this.facade.produits().map((produit) => produit.id);
      if (ids.length > 0) this.stocks.surveiller(ids);
    });
  }

  protected ajouterAuPanier(produit: Produit): void {
    // TP 5 : brancher ici le PanierStore.
    console.log('à ajouter au panier', produit.id);
  }
}
