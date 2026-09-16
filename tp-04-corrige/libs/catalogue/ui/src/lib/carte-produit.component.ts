import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { estDisponible, estEnPromotion, prixEffectif, Produit } from '@maison/catalogue/domaine';

/**
 * Composant de présentation : aucun inject() de service métier, tout entre par
 * input() et sort par output(). C'est ce qui le rend testable sans TestBed
 * lourd et réutilisable ailleurs.
 *
 * `changeDetection` est écrit explicitement pour rester lisible sur un projet
 * migré ; en Angular 22, OnPush est déjà le défaut des nouveaux composants.
 */
@Component({
  selector: 'mc-carte-produit',
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="carte" [class.carte--indisponible]="!disponible()">
      <img [src]="produit().image" [alt]="produit().nom" width="320" height="240" />

      <h3>{{ produit().nom }}</h3>

      <p class="prix">
        @if (enPromotion()) {
          <s>{{ produit().prix.catalogue | currency: 'EUR' }}</s>
        }
        <strong>{{ prix() | currency: 'EUR' }}</strong>
      </p>

      <p class="avis">{{ produit().avis.note }} / 5 — {{ produit().avis.nombre }} avis</p>

      <button type="button" [disabled]="!disponible()" (click)="ajouter.emit(produit())">
        @if (disponible()) {
          Ajouter au panier
        } @else {
          Indisponible
        }
      </button>
    </article>
  `,
  styleUrl: './carte-produit.component.scss',
})
export class CarteProduitComponent {
  readonly produit = input.required<Produit>();
  readonly ajouter = output<Produit>();

  /**
   * Dérivations mémoïsées. Les mettre dans le template les ferait réexécuter
   * à chaque vérification — c'est le sujet du jour 2.
   */
  protected readonly prix = computed(() => prixEffectif(this.produit().prix));
  protected readonly disponible = computed(() => estDisponible(this.produit()));
  protected readonly enPromotion = computed(() => estEnPromotion(this.produit()));
}
