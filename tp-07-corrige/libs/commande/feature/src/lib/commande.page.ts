import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { form, FormField, submit } from '@angular/forms/signals';
import { Commande, COMMANDE_VIDE, modeCorrige, modesDisponibles } from '@maison/commande/domaine';
import { PanierStore } from '@maison/panier/data-access';
import { API_URL } from '@maison/partage/util';
import { schemaCommande } from './commande.schema';

/**
 * Tunnel de commande, en Signal Forms.
 *
 * Trois choses à remarquer :
 *
 *   1. le modèle est un simple `signal<Commande>` — le formulaire ne détient
 *      pas de copie des données, il les enveloppe ;
 *   2. la validation est déclarée dans un SCHÉMA séparé, donc testable sans
 *      monter le composant ;
 *   3. les règles métier viennent du domaine (`modesDisponibles`) et ne sont
 *      pas réécrites ici.
 */
@Component({
  selector: 'mc-commande-page',
  imports: [FormField, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Votre commande</h1>

    @if (panier.estVide()) {
      <p>Votre panier est vide.</p>
    } @else {
      <p class="recapitulatif">
        {{ panier.nbArticles() }} article(s) — total {{ panier.total() | currency: 'EUR' }}
      </p>

      <label>
        Email
        <input type="email" [formField]="commande.email" />
      </label>
      @if (commande.email().touched()) {
        @for (erreur of commande.email().errors(); track $index) {
          <p role="alert">{{ erreur.message }}</p>
        }
      }

      <label>
        Nom
        <input [formField]="commande.nom" />
      </label>

      <label>
        Adresse
        <input [formField]="commande.adresse" />
      </label>

      <label>
        Code postal
        <input [formField]="commande.codePostal" inputmode="numeric" />
      </label>
      @if (commande.codePostal().pending()) {
        <p aria-live="polite">Vérification de la zone de livraison…</p>
      }
      @if (commande.codePostal().touched()) {
        @for (erreur of commande.codePostal().errors(); track $index) {
          <p role="alert">{{ erreur.message }}</p>
        }
      }

      <label>
        Ville
        <input [formField]="commande.ville" />
      </label>

      <fieldset>
        <legend>Mode de livraison</legend>
        @for (mode of modes(); track mode) {
          <label>
            <input type="radio" [value]="mode" [formField]="commande.mode" />
            {{ libelle(mode) }}
          </label>
        }
        @if (!pointRelaisPossible()) {
          <p aria-live="polite">
            Le point relais n'est pas proposé : votre panier contient un article volumineux.
          </p>
        }
      </fieldset>

      <label>
        <input type="checkbox" [formField]="commande.accepteCgv" />
        J'accepte les conditions générales de vente
      </label>

      <button type="button" [disabled]="commande().invalid() || envoi()" (click)="valider()">
        @if (envoi()) {
          Envoi en cours…
        } @else {
          Valider la commande
        }
      </button>

      @if (echec()) {
        <p role="alert">{{ echec() }}</p>
      }
      @if (reference()) {
        <p role="status">Commande {{ reference() }} enregistrée.</p>
      }
    }
  `,
  styleUrl: './commande.page.scss',
})
export class CommandePage {
  private readonly base = inject(API_URL);
  protected readonly panier = inject(PanierStore);

  protected readonly modele = signal<Commande>(COMMANDE_VIDE);

  protected readonly commande = form(this.modele, schemaCommande(this.base));

  protected readonly modes = computed(() => modesDisponibles(this.panier.lignes()));
  protected readonly pointRelaisPossible = computed(() => this.modes().includes('point-relais'));

  protected readonly envoi = signal(false);
  protected readonly echec = signal<string | null>(null);
  protected readonly reference = signal<string | null>(null);

  constructor() {
    /**
     * Effet légitime : il corrige une sélection devenue impossible quand le
     * panier change. Il ne calcule pas une valeur dérivée — il répare l'état
     * saisi par l'utilisateur.
     */
    effect(() => {
      const lignes = this.panier.lignes();
      this.modele.update((commande) => ({
        ...commande,
        mode: modeCorrige(lignes, commande.mode),
      }));
    });
  }

  protected libelle(mode: string): string {
    return { domicile: 'À domicile', 'point-relais': 'En point relais', express: 'Express 24 h' }[
      mode
    ] as string;
  }

  protected async valider(): Promise<void> {
    this.echec.set(null);
    this.envoi.set(true);
    try {
      await submit(this.commande, async () => {
        this.reference.set('en-cours');
        return undefined;
      });
    } finally {
      this.envoi.set(false);
    }
  }
}
