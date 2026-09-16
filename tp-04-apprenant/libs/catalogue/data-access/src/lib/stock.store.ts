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
 * TODO TP 4 — étapes 2 à 4
 *
 * Ce service se met à jour depuis un `setInterval`, donc en dehors de tout
 * événement Angular. Sous Zone.js, le rafraîchissement de l'affichage était
 * accidentel : Zone.js interceptait le timer et déclenchait un cycle global.
 * Ici, rien ne l'intercepte — c'est au signal de notifier, et à rien d'autre.
 *
 * Contraintes vérifiées par les tests :
 *   - chaque mise à jour produit une NOUVELLE Map (ne mutez pas celle en place) ;
 *   - une erreur réseau ne doit pas effacer la dernière valeur connue ;
 *   - la minuterie doit s'arrêter, y compris à la destruction de l'injecteur ;
 *   - pas de `subscribe` : le test de structure du TP 3 l'interdit.
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
    // TODO TP 4 — étape 4 : déclarer le nettoyage ici, au même endroit que la
    // ressource qu'il libère (indice : DestroyRef).
  }

  /**
   * TODO TP 4 — étape 2
   * Lecture réactive : appelée dans un template, elle doit créer la dépendance.
   * `null` si le produit n'a pas encore été interrogé — un état distinct de la
   * rupture.
   */
  quantite(id: string): number | null {
    throw new Error('TP 4 — StockStore.quantite reste à écrire');
  }

  /** TODO TP 4 — étape 2 */
  estDisponible(id: string): boolean | null {
    throw new Error('TP 4 — StockStore.estDisponible reste à écrire');
  }

  /**
   * TODO TP 4 — étape 3
   * Surveiller une nouvelle liste : arrêter la surveillance précédente,
   * interroger tout de suite, puis toutes les PERIODE_STOCK_MS.
   */
  surveiller(ids: readonly string[]): void {
    throw new Error('TP 4 — StockStore.surveiller reste à écrire');
  }

  /** TODO TP 4 — étape 3 */
  rafraichir(): void {
    throw new Error('TP 4 — StockStore.rafraichir reste à écrire');
  }

  /** TODO TP 4 — étape 4 */
  arreter(): void {
    throw new Error('TP 4 — StockStore.arreter reste à écrire');
  }

  /**
   * TODO TP 4 — étape 3
   * Une panne de stock ne doit pas casser l'affichage du catalogue.
   */
  private async interroger(id: string): Promise<void> {
    throw new Error('TP 4 — StockStore.interroger reste à écrire');
  }

  /**
   * TODO TP 4 — étape 2
   * Attention : `this._stocks().set(...)` muterait la Map EN PLACE, et ne
   * notifierait personne. C'est le piège central de ce TP.
   */
  private enregistrer(etat: EtatStock): void {
    throw new Error('TP 4 — StockStore.enregistrer reste à écrire');
  }
}
