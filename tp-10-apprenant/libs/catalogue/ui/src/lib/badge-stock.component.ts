import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** En dessous de ce seuil, on affiche un avertissement plutôt qu'une disponibilité. */
export const SEUIL_STOCK_TENDU = 5;

type NiveauStock = 'inconnu' | 'rupture' | 'tendu' | 'dispo';

/**
 * Badge de disponibilité.
 *
 * Composant de présentation strict : il ne connaît pas le StockStore, il reçoit
 * une quantité. C'est ce qui permet de le tester sans HTTP et sans minuterie.
 *
 * `quantite` vaut `null` tant que le stock n'a pas encore été chargé — un état
 * distinct de la rupture, qu'il ne faut pas confondre à l'affichage.
 */
@Component({
  selector: 'mc-badge-stock',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="'badge--' + niveau()" role="status">
      @switch (niveau()) {
        @case ('inconnu') {
          Stock en cours de vérification
        }
        @case ('rupture') {
          Rupture de stock
        }
        @case ('tendu') {
          Plus que {{ quantite() }} en stock
        }
        @default {
          En stock ({{ quantite() }})
        }
      }
    </span>
  `,
  styleUrl: './badge-stock.component.scss',
})
export class BadgeStockComponent {
  readonly quantite = input.required<number | null>();

  protected readonly niveau = computed<NiveauStock>(() => {
    const quantite = this.quantite();
    if (quantite === null) return 'inconnu';
    if (quantite === 0) return 'rupture';
    return quantite < SEUIL_STOCK_TENDU ? 'tendu' : 'dispo';
  });
}
