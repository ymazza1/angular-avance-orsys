import { HttpClient } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { API_URL } from '@maison/partage/util';
import { firstValueFrom } from 'rxjs';

export interface EtatStock {
  readonly id: string;
  readonly disponible: boolean;
  readonly quantite: number;
}

/** Intervalle de rafraîchissement du stock, en millisecondes. */
export const PERIODE_STOCK_MS = 15_000;

/**
 * Stock temps réel.
 *
 * C'est le genre de service qui casse en premier sur une application migrée en
 * zoneless : il se met à jour depuis un `setInterval`, donc en dehors de tout
 * événement Angular. Sous Zone.js, le rafraîchissement de l'affichage était
 * accidentel — Zone.js interceptait le timer et déclenchait un cycle global.
 * Ici, rien ne l'intercepte : c'est le signal qui notifie, et rien d'autre.
 *
 * Pas de `subscribe` : le test de structure du TP 3 l'interdit, et
 * `firstValueFrom` suffit pour une requête qui n'émet qu'une fois.
 */
@Injectable({ providedIn: 'root' })
export class StockStore {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_URL);

  /**
   * Une Map immuable : chaque mise à jour produit une NOUVELLE référence.
   * Muter la Map en place ne notifierait personne — c'est le piège n° 1 du
   * passage en zoneless, et il est silencieux.
   */
  private readonly _stocks = signal<ReadonlyMap<string, EtatStock>>(new Map());
  private readonly _surveilles = signal<readonly string[]>([]);

  readonly stocks = this._stocks.asReadonly();
  readonly surveilles = this._surveilles.asReadonly();
  readonly nbSurveilles = computed(() => this._surveilles().length);

  private minuterie: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Le nettoyage est déclaré au même endroit que la ressource qu'il libère.
    inject(DestroyRef).onDestroy(() => this.arreter());
  }

  /** Lecture réactive : appelée dans un template, elle crée la dépendance. */
  quantite(id: string): number | null {
    return this._stocks().get(id)?.quantite ?? null;
  }

  estDisponible(id: string): boolean | null {
    return this._stocks().get(id)?.disponible ?? null;
  }

  surveiller(ids: readonly string[]): void {
    this.arreter();
    this._surveilles.set([...ids]);
    this.rafraichir();
    this.minuterie = setInterval(() => this.rafraichir(), PERIODE_STOCK_MS);
  }

  rafraichir(): void {
    for (const id of this._surveilles()) {
      void this.interroger(id);
    }
  }

  arreter(): void {
    if (this.minuterie === null) return;
    clearInterval(this.minuterie);
    this.minuterie = null;
  }

  /** Une panne de stock ne doit pas casser l'affichage du catalogue. */
  private async interroger(id: string): Promise<void> {
    try {
      this.enregistrer(await firstValueFrom(this.http.get<EtatStock>(`${this.base}/stocks/${id}`)));
    } catch {
      // volontairement ignoré : le badge restera sur sa dernière valeur connue
    }
  }

  /**
   * `update` avec recopie : la Map précédente n'est jamais modifiée.
   * C'est ce qui rend le changement observable par les signaux dépendants.
   */
  private enregistrer(etat: EtatStock): void {
    this._stocks.update((precedents) => new Map(precedents).set(etat.id, etat));
  }
}
