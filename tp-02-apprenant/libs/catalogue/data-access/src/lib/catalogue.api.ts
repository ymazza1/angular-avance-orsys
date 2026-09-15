import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Filtres, Produit } from '@maison/catalogue/domaine';
import { API_URL } from '@maison/partage/util';
import { firstValueFrom } from 'rxjs';
import { PageDto, ProduitDto, versProduit } from './produit.dto';

export interface PageProduits {
  readonly items: readonly Produit[];
  readonly total: number;
  readonly facettes: Facettes;
}

export interface Facettes {
  readonly pieces: readonly Facette[];
  readonly matieres: readonly Facette[];
}

export interface Facette {
  readonly valeur: string;
  readonly nb: number;
}

export const PAGE_VIDE: PageProduits = {
  items: [],
  total: 0,
  facettes: { pieces: [], matieres: [] },
};

/**
 * Adaptateur HTTP : aucune règle métier ici. Il traduit des paramètres de
 * domaine en requête, et une réponse en objets de domaine.
 *
 * L'API est volontairement promise-based au TP 2. Le TP 3 la repassera en
 * Observable, parce qu'une promesse ne sait ni s'annuler ni se composer.
 */
@Injectable({ providedIn: 'root' })
export class CatalogueApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_URL);

  /**
   * TODO TP 2 — étape 3
   * GET {base}/produits avec les paramètres issus des filtres, puis mapping
   * de chaque DTO vers le domaine.
   */
  async rechercher(filtres: Filtres): Promise<PageProduits> {
    throw new Error('TP 2 — CatalogueApi.rechercher reste à écrire');
  }

  /** TODO TP 2 — étape 3 : GET {base}/produits/{id} */
  async parId(id: string): Promise<Produit> {
    throw new Error('TP 2 — CatalogueApi.parId reste à écrire');
  }
}

/**
 * TODO TP 2 — étape 3
 * Traduit les filtres en paramètres de requête.
 *
 * Règles vérifiées par les tests :
 *   - `tri` et `page` sont toujours envoyés ;
 *   - les critères non renseignés (null, chaîne vide) ne sont PAS envoyés ;
 *   - la recherche est nettoyée de ses espaces avant envoi.
 *
 * Exportée à part pour être testable sans HttpClient — et réutilisable par
 * httpResource au TP 7.
 */
export function versParams(filtres: Filtres): HttpParams {
  throw new Error('TP 2 — versParams reste à écrire');
}
