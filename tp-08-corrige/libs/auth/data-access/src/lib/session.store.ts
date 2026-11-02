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
  jetonValide(maintenant = Date.now()): string | null {
    const session = this._session();
    return estUtilisable(session, maintenant) ? (session as Session).jeton : null;
  }

  async connexion(email: string, motDePasse: string): Promise<boolean> {
    this._erreur.set(null);
    try {
      const reponse = await firstValueFrom(
        this.http.post<ReponseAuth>(`${this.base}/auth/connexion`, { email, motDePasse }),
      );
      this._session.set(versSession(reponse, Date.now()));
      return true;
    } catch {
      this._erreur.set('identifiants_invalides');
      return false;
    }
  }

  async rafraichir(): Promise<boolean> {
    const session = this._session();
    if (session === null) return false;
    try {
      const reponse = await firstValueFrom(
        this.http.post<ReponseAuth>(`${this.base}/auth/refresh`, {
          rafraichissement: session.rafraichissement,
        }),
      );
      this._session.set(versSession(reponse, Date.now()));
      return true;
    } catch {
      this.deconnexion();
      return false;
    }
  }

  deconnexion(): void {
    this._session.set(null);
  }
}
