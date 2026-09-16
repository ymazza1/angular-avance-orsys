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
      <!-- TODO TP 5 — étape 6 -->
    </div>
  `,
  styleUrl: './ligne-panier.component.scss',
})
export class LignePanierComponent {
  readonly ligne = input.required<LignePanier>();
  readonly quantite = model.required<number>();
  readonly supprimer = output<string>();

  // TODO TP 5 — étape 6
  protected readonly totalLigne = computed<number>(() => {
    throw new Error('TP 5 — totalLigne reste à écrire');
  });

  protected readonly stockAtteint = computed<boolean>(() => {
    throw new Error('TP 5 — stockAtteint reste à écrire');
  });

  /** Une saisie vide doit produire 0, pas NaN. */
  protected surSaisie(valeur: string): void {
    throw new Error('TP 5 — surSaisie reste à écrire');
  }
}
