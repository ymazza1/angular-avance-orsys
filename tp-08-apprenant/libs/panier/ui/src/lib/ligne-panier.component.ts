import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { LignePanier } from '@maison/panier/domaine';

/**
 * Ligne de panier modifiable.
 *
 * `model()` plutôt que `input()` + `output()` : la quantité est une valeur que
 * le composant lit ET modifie. Le parent écrit `[(quantite)]`, et le composant
 * appelle simplement `this.quantite.set(...)`.
 *
 * C'est le seul endroit de la formation où `model()` est justifié — la règle
 * reste : si le parent ne fait que réagir, un `output()` suffit.
 */
@Component({
  selector: 'mc-ligne-panier',
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ligne">
      <div>
        <p class="nom">{{ ligne().nom }}</p>
        <p class="unitaire">{{ ligne().prixUnitaire | currency: 'EUR' }} l'unité</p>
      </div>

      <label>
        <span class="visuellement-cache">Quantité</span>
        <input
          type="number"
          min="0"
          [max]="ligne().stockDisponible"
          [value]="quantite()"
          (change)="surSaisie($any($event.target).value)"
        />
      </label>

      @if (stockAtteint()) {
        <span role="status">Stock maximum</span>
      } @else {
        <span></span>
      }

      <p class="total">{{ totalLigne() | currency: 'EUR' }}</p>

      <button type="button" (click)="supprimer.emit(ligne().produitId)">Retirer</button>
    </div>
  `,
  styleUrl: './ligne-panier.component.scss',
})
export class LignePanierComponent {
  readonly ligne = input.required<LignePanier>();
  readonly quantite = model.required<number>();
  readonly supprimer = output<string>();

  protected readonly totalLigne = computed(() => this.ligne().prixUnitaire * this.quantite());
  protected readonly stockAtteint = computed(() => this.quantite() >= this.ligne().stockDisponible);

  protected surSaisie(valeur: string): void {
    const quantite = Number(valeur);
    this.quantite.set(Number.isFinite(quantite) ? quantite : 0);
  }
}
