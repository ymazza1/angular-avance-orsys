import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Commande } from '@maison/commande/domaine';
import { Panier } from '@maison/panier/domaine';
import { PanierStore } from '@maison/panier/data-access';
import { API_URL } from '@maison/partage/util';
import { firstValueFrom } from 'rxjs';

/**
 * Résultat d'un envoi de commande.
 *
 * Une union discriminée plutôt qu'un booléen : chaque issue porte ce dont
 * l'interface a besoin pour réagir. Avec `{ succes: false }`, il faudrait un
 * second champ pour savoir quoi afficher — et rien n'obligerait à le remplir.
 */
export type ResultatCommande =
  | { readonly statut: 'enregistree'; readonly reference: string }
  | { readonly statut: 'panier-vide' }
  | { readonly statut: 'stock-insuffisant'; readonly produitId: string }
  | { readonly statut: 'non-authentifie' }
  | { readonly statut: 'indisponible' };

interface ReponseCommande {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class CommandeStore {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_URL);
  private readonly panier = inject(PanierStore);

  private readonly _envoi = signal(false);
  private readonly _dernier = signal<ResultatCommande | null>(null);

  readonly envoiEnCours = this._envoi.asReadonly();
  readonly dernierResultat = this._dernier.asReadonly();
  readonly reference = computed(() => {
    const resultat = this._dernier();
    return resultat?.statut === 'enregistree' ? resultat.reference : null;
  });

  /**
   * Envoie la commande. Ne rejette jamais : chaque issue est un statut.
   *
   * Le panier n'est vidé qu'en cas de succès — perdre un panier sur une erreur
   * réseau serait pire que l'erreur elle-même.
   */
  async envoyer(commande: Commande, lignes: Panier): Promise<ResultatCommande> {
    if (lignes.length === 0) return this.conclure({ statut: 'panier-vide' });

    this._envoi.set(true);
    try {
      const reponse = await firstValueFrom(
        this.http.post<ReponseCommande>(`${this.base}/commandes`, {
          ...commande,
          lignes: lignes.map((ligne) => ({
            produitId: ligne.produitId,
            quantite: ligne.quantite,
          })),
        }),
      );
      this.panier.vider();
      return this.conclure({ statut: 'enregistree', reference: reponse.id });
    } catch (erreur) {
      return this.conclure(this.interpreter(erreur));
    } finally {
      this._envoi.set(false);
    }
  }

  /**
   * Traduit une erreur HTTP en statut métier.
   *
   * C'est la même discipline que le mapping DTO du TP 2 : aucun composant n'a
   * à connaître `HttpErrorResponse` ni la valeur 409.
   */
  private interpreter(erreur: unknown): ResultatCommande {
    if (!(erreur instanceof HttpErrorResponse)) return { statut: 'indisponible' };
    if (erreur.status === 401) return { statut: 'non-authentifie' };
    if (erreur.status === 409) {
      return { statut: 'stock-insuffisant', produitId: erreur.error?.produitId ?? '' };
    }
    return { statut: 'indisponible' };
  }

  private conclure(resultat: ResultatCommande): ResultatCommande {
    this._dernier.set(resultat);
    return resultat;
  }
}
