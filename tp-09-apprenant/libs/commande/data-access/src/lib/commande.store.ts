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
   * TODO TP 9 — étape 2
   * Envoie la commande. Ne rejette JAMAIS : chaque issue est un statut.
   *
   * Points vérifiés par les tests :
   *   - un panier vide ne déclenche aucune requête ;
   *   - le corps n'envoie que produitId et quantite par ligne ;
   *   - le panier n'est vidé QU'EN CAS DE SUCCÈS ;
   *   - l'état d'envoi se termine, y compris après une erreur.
   */
  async envoyer(commande: Commande, lignes: Panier): Promise<ResultatCommande> {
    throw new Error('TP 9 — CommandeStore.envoyer reste à écrire');
  }

  /**
   * Traduit une erreur HTTP en statut métier.
   *
   * C'est la même discipline que le mapping DTO du TP 2 : aucun composant n'a
   * à connaître `HttpErrorResponse` ni la valeur 409.
   *
   * TODO TP 9 — étape 2 : 401, 409 (avec produitId), et le reste.
   */
  private interpreter(erreur: unknown): ResultatCommande {
    throw new Error('TP 9 — interpreter reste à écrire');
  }

  private conclure(resultat: ResultatCommande): ResultatCommande {
    this._dernier.set(resultat);
    return resultat;
  }
}
