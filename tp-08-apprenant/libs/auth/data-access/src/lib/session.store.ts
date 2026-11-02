import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { estAdmin, estUtilisable, Session, versSession } from '@maison/auth/domaine';
import { API_URL } from '@maison/partage/util';
import { firstValueFrom } from 'rxjs';

interface ReponseAuth {
  jeton: string;
  rafraichissement: string;
  role: string;
  nom: string;
  expireDans: number;
}

/**
 * État de session.
 *
 * Le jeton vit **en mémoire**, pas dans localStorage : tout script tiers peut
 * lire le stockage du navigateur. Le prix à payer est qu'un rechargement de
 * page déconnecte — d'où le jeton de rafraîchissement, qui lui pourrait vivre
 * dans un cookie HttpOnly posé par le serveur.
 *
 * C'est un compromis, pas une vérité : à discuter avec le contexte du projet.
 *
 * TODO TP 8 — étape 2
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_URL);

  private readonly _session = signal<Session | null>(null);
  private readonly _erreur = signal<string | null>(null);

  readonly session = this._session.asReadonly();
  readonly erreur = this._erreur.asReadonly();

  readonly estConnecte = computed(() => this._session() !== null);
  readonly estAdmin = computed(() => estAdmin(this._session()));
  readonly nom = computed(() => this._session()?.nom ?? null);

  /** Jeton utilisable maintenant, ou null s'il n'y en a pas ou s'il a expiré. */
  /** TODO TP 8 — étape 2 : null si absent OU expiré. */
  jetonValide(maintenant = Date.now()): string | null {
    throw new Error('TP 8 — jetonValide reste à écrire');
  }

  /**
   * TODO TP 8 — étape 2
   * POST {base}/auth/connexion. Renvoie true/false, ne rejette jamais :
   * un échec d'identifiants est un état, pas une exception.
   */
  async connexion(email: string, motDePasse: string): Promise<boolean> {
    throw new Error('TP 8 — connexion reste à écrire');
  }

  /**
   * TODO TP 8 — étape 2
   * POST {base}/auth/refresh. Sans session courante, ne fait AUCUNE requête.
   * Un échec doit déconnecter proprement plutôt que laisser une session morte.
   */
  async rafraichir(): Promise<boolean> {
    throw new Error('TP 8 — rafraichir reste à écrire');
  }

  deconnexion(): void {
    this._session.set(null);
  }
}
