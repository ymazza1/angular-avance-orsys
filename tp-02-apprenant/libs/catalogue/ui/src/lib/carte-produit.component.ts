import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Produit } from '@maison/catalogue/domaine';

/**
 * Composant de présentation.
 *
 * Règle non négociable, vérifiée par le lint des frontières du TP 1 : aucun
 * inject() de service métier. Tout entre par input(), tout sort par output().
 *
 * TODO TP 2 — étape 5
 * Compléter le template et les valeurs dérivées. Les tests décrivent le
 * comportement attendu : nom, prix remisé, prix barré en promotion, bouton
 * désactivé en rupture, émission au clic.
 *
 * Indices :
 *   - le prix s'affiche avec le pipe currency en EUR ;
 *   - un produit indisponible ne doit pas pouvoir émettre ;
 *   - les valeurs dérivées se calculent avec computed(), jamais dans le template.
 */
@Component({
  selector: 'mc-carte-produit',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="carte">
      <!-- TODO TP 2 — étape 5 -->
    </article>
  `,
  styleUrl: './carte-produit.component.scss',
})
export class CarteProduitComponent {
  readonly produit = input.required<Produit>();
  readonly ajouter = output<Produit>();
}
