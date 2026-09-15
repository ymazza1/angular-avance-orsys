import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CatalogueFacade } from '@maison/catalogue/data-access';
import { Piece, Produit } from '@maison/catalogue/domaine';
import { CarteProduitComponent } from '@maison/catalogue/ui';

const PIECES: readonly Piece[] = ['salon', 'salle-a-manger', 'chambre', 'bureau'];

/**
 * Composant routé : il orchestre, il ne calcule pas.
 *
 * TODO TP 2 — étape 6
 * Afficher la grille de produits à partir de la façade, et traduire les gestes
 * utilisateur en commandes. Trois états à distinguer : erreur, chargement,
 * résultats — plus le cas « aucun résultat ».
 *
 * Aucun test automatisé sur cette page : la vérification est visuelle, dans le
 * navigateur. C'est assumé — un test de page ici n'apporterait presque rien de
 * plus que les tests de façade et de carte déjà écrits.
 */
@Component({
  selector: 'mc-catalogue-page',
  imports: [CarteProduitComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Notre catalogue</h1>
    <!-- TODO TP 2 — étape 6 -->
  `,
  styleUrl: './catalogue.page.scss',
})
export class CataloguePage {
  protected readonly facade = inject(CatalogueFacade);
  protected readonly pieces = PIECES;

  constructor() {
    // TODO TP 2 — étape 6 : déclencher le premier chargement.
  }

  protected ajouterAuPanier(produit: Produit): void {
    // TP 5 : brancher ici le PanierStore.
    console.log('à ajouter au panier', produit.id);
  }
}
