import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CatalogueFacade } from '@maison/catalogue/data-access';
import { Piece, Produit } from '@maison/catalogue/domaine';
import { CarteProduitComponent } from '@maison/catalogue/ui';

const PIECES: readonly Piece[] = ['salon', 'salle-a-manger', 'chambre', 'bureau'];

/**
 * Composant routé : il orchestre, il ne calcule pas. Son seul travail est de
 * traduire des gestes utilisateur en commandes de façade, et de distribuer
 * l'état aux composants d'affichage.
 */
@Component({
  selector: 'mc-catalogue-page',
  imports: [CarteProduitComponent],
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
        <button type="button" (click)="facade.reinitialiser()">Réessayer</button>
      </p>
    } @else if (facade.enChargement()) {
      <p aria-live="polite">Chargement du catalogue…</p>
    } @else {
      <p aria-live="polite">{{ facade.total() }} produits</p>

      <ul class="grille">
        @for (produit of facade.produits(); track produit.id) {
          <li>
            <mc-carte-produit [produit]="produit" (ajouter)="ajouterAuPanier($event)" />
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
  protected readonly pieces = PIECES;

  constructor() {
    void this.facade.charger();
  }

  protected ajouterAuPanier(produit: Produit): void {
    // TP 5 : brancher ici le PanierStore.
    console.log('à ajouter au panier', produit.id);
  }
}
