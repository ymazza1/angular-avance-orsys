import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Filtres, Produit } from '@maison/catalogue/domaine';
import { API_URL } from '@maison/partage/util';
import { map, Observable } from 'rxjs';
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
 * Adaptateur HTTP.
 *
 * FOURNI — la conversion Promise → Observable a déjà été faite pour vous : elle
 * est mécanique, et ce n'est pas le sujet du TP.
 *
 * Ce qu'il faut en retenir : une promesse ne sait ni s'annuler, ni se composer
 * avec un opérateur de temporisation. Le `firstValueFrom` du TP 2 jetait
 * justement la seule chose qui nous intéresse maintenant.
 */
@Injectable({ providedIn: 'root' })
export class CatalogueApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_URL);

  rechercher(filtres: Filtres): Observable<PageProduits> {
    return this.http
      .get<PageDto<ProduitDto>>(`${this.base}/produits`, { params: versParams(filtres) })
      .pipe(
        map((dto) => ({
          items: dto.items.map(versProduit),
          total: dto.total,
          facettes: dto.facettes,
        })),
      );
  }

  parId(id: string): Observable<Produit> {
    return this.http.get<ProduitDto>(`${this.base}/produits/${id}`).pipe(map(versProduit));
  }
}

/** Inchangée depuis le TP 2 : elle sera encore réutilisée telle quelle au TP 7. */
export function versParams(filtres: Filtres): HttpParams {
  let params = new HttpParams().set('tri', filtres.tri).set('page', filtres.page);
  if (filtres.recherche.trim()) params = params.set('q', filtres.recherche.trim());
  if (filtres.piece) params = params.set('piece', filtres.piece);
  if (filtres.matiere) params = params.set('matiere', filtres.matiere);
  if (filtres.prixMax !== null) params = params.set('prixMax', filtres.prixMax);
  return params;
}
