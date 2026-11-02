/**
 * Domaine de l'authentification : ce que l'application sait d'une session,
 * sans rien connaître de HTTP ni du stockage.
 */

export type Role = 'client' | 'admin';

export interface Session {
  readonly jeton: string;
  readonly rafraichissement: string;
  readonly role: Role;
  readonly nom: string;
  /** Instant d'expiration, en millisecondes depuis l'époque. */
  readonly expireLe: number;
}

/**
 * Marge de sécurité : on considère un jeton périmé un peu avant sa fin réelle,
 * pour ne pas partir en requête avec un jeton qui expirera en vol.
 */
export const MARGE_EXPIRATION_MS = 2_000;

export function estAdmin(session: Session | null): boolean {
  return session?.role === 'admin';
}

export function estConnecte(session: Session | null): boolean {
  return session !== null;
}

export function estExpiree(session: Session | null, maintenant: number): boolean {
  if (session === null) return true;
  return session.expireLe - MARGE_EXPIRATION_MS <= maintenant;
}

export function estUtilisable(session: Session | null, maintenant: number): boolean {
  return estConnecte(session) && !estExpiree(session, maintenant);
}

/** Construit une session à partir de la réponse d'authentification. */
export function versSession(
  reponse: { jeton: string; rafraichissement: string; role: string; nom: string; expireDans: number },
  maintenant: number,
): Session {
  return {
    jeton: reponse.jeton,
    rafraichissement: reponse.rafraichissement,
    role: reponse.role === 'admin' ? 'admin' : 'client',
    nom: reponse.nom,
    expireLe: maintenant + reponse.expireDans * 1000,
  };
}
