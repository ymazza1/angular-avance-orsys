import { CurrencyPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SessionStore } from '@maison/auth/data-access';
import { API_URL } from '@maison/partage/util';

interface Statistiques {
  chiffreAffaires: number;
  commandes: number;
  panierMoyen: number;
  ruptures: { id: string; nom: string }[];
  ventesParPiece: { piece: string; montant: number }[];
}

const STATISTIQUES_VIDES: Statistiques = {
  chiffreAffaires: 0,
  commandes: 0,
  panierMoyen: 0,
  ruptures: [],
  ventesParPiece: [],
};

/**
 * Tableau de bord du back-office.
 *
 * Le bloc lourd (ventes par pièce) est différé : il n'est chargé que lorsqu'il
 * entre dans la zone visible. Sur cette page c'est anecdotique, mais le
 * mécanisme est le même pour un graphique de 200 ko.
 */
@Component({
  selector: 'mc-admin-page',
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Tableau de bord</h1>
    <!-- TODO TP 8 — étape 5 -->
  `,
  styleUrl: './admin.page.scss',
})
export class AdminPage {
  private readonly base = inject(API_URL);
  protected readonly session = inject(SessionStore);

  protected readonly stats = httpResource<Statistiques>(
    () => `${this.base}/admin/statistiques`,
    { defaultValue: STATISTIQUES_VIDES },
  );

  /** Même garde qu'au TP 7 : `value()` lève quand la ressource est en erreur. */
  protected readonly valeurs = computed<Statistiques>(() =>
    this.stats.hasValue() ? this.stats.value() : STATISTIQUES_VIDES,
  );
}
