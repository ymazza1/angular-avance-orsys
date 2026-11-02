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

/**
 * TODO TP 8 — étape 1
 * Attention à la marge : un jeton qui expire dans MARGE_EXPIRATION_MS est déjà
 * considéré comme périmé. Un test vérifie ce cas limite.
 */
export function estExpiree(session: Session | null, maintenant: number): boolean {
  throw new Error('TP 8 — estExpiree reste à écrire');
}

/** TODO TP 8 — étape 1 */
export function estUtilisable(session: Session | null, maintenant: number): boolean {
  throw new Error('TP 8 — estUtilisable reste à écrire');
}

/** Construit une session à partir de la réponse d'authentification. */
/**
 * TODO TP 8 — étape 1
 * L'API renvoie une DURÉE en secondes ; le domaine manipule un INSTANT.
 * Un rôle inconnu doit retomber sur 'client' — jamais l'inverse.
 */
export function versSession(
  reponse: { jeton: string; rafraichissement: string; role: string; nom: string; expireDans: number },
  maintenant: number,
): Session {
  throw new Error('TP 8 — versSession reste à écrire');
}
