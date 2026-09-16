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

  async rechercher(filtres: Filtres): Promise<PageProduits> {
    const dto = await firstValueFrom(
      this.http.get<PageDto<ProduitDto>>(`${this.base}/produits`, { params: versParams(filtres) }),
    );
    return {
      items: dto.items.map(versProduit),
      total: dto.total,
      facettes: dto.facettes,
    };
  }

  async parId(id: string): Promise<Produit> {
    const dto = await firstValueFrom(this.http.get<ProduitDto>(`${this.base}/produits/${id}`));
    return versProduit(dto);
  }
}

/**
 * Exportée à part pour être testable sans HttpClient, et réutilisable telle
 * quelle par httpResource au TP 7.
 */
export function versParams(filtres: Filtres): HttpParams {
  let params = new HttpParams().set('tri', filtres.tri).set('page', filtres.page);
  if (filtres.recherche.trim()) params = params.set('q', filtres.recherche.trim());
  if (filtres.piece) params = params.set('piece', filtres.piece);
  if (filtres.matiere) params = params.set('matiere', filtres.matiere);
  if (filtres.prixMax !== null) params = params.set('prixMax', filtres.prixMax);
  return params;
}
