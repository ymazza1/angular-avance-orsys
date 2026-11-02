import { describe, expect, it } from 'vitest';
import { estAdmin, estExpiree, estUtilisable, MARGE_EXPIRATION_MS, Session, versSession } from './session';

const MAINTENANT = 1_000_000;

function uneSession(surcharges: Partial<Session> = {}): Session {
  return {
    jeton: 'j-1',
    rafraichissement: 'r-1',
    role: 'client',
    nom: 'Camille Roux',
    expireLe: MAINTENANT + 30_000,
    ...surcharges,
  };
}

describe('estAdmin', () => {
  it('reconnaît un administrateur', () => {
    expect(estAdmin(uneSession({ role: 'admin' }))).toBe(true);
  });

  it('refuse un client', () => {
    expect(estAdmin(uneSession())).toBe(false);
  });

  it('refuse une absence de session', () => {
    expect(estAdmin(null)).toBe(false);
  });
});

describe('estExpiree', () => {
  it('considère une session sans jeton comme expirée', () => {
    expect(estExpiree(null, MAINTENANT)).toBe(true);
  });

  it('accepte une session encore valable', () => {
    expect(estExpiree(uneSession(), MAINTENANT)).toBe(false);
  });

  it('applique la marge de sécurité', () => {
    const limite = uneSession({ expireLe: MAINTENANT + MARGE_EXPIRATION_MS });

    expect(estExpiree(limite, MAINTENANT)).toBe(true);
  });

  it('refuse une session dépassée', () => {
    expect(estExpiree(uneSession({ expireLe: MAINTENANT - 1 }), MAINTENANT)).toBe(true);
  });
});

describe('estUtilisable', () => {
  it('exige une session présente et fraîche', () => {
    expect(estUtilisable(uneSession(), MAINTENANT)).toBe(true);
    expect(estUtilisable(null, MAINTENANT)).toBe(false);
    expect(estUtilisable(uneSession({ expireLe: 0 }), MAINTENANT)).toBe(false);
  });
});

describe('versSession', () => {
  it('convertit la durée en instant d expiration', () => {
    const session = versSession(
      { jeton: 'j', rafraichissement: 'r', role: 'admin', nom: 'Yanis', expireDans: 30 },
      MAINTENANT,
    );

    expect(session.expireLe).toBe(MAINTENANT + 30_000);
  });

  it('ramène un rôle inconnu à client', () => {
    const session = versSession(
      { jeton: 'j', rafraichissement: 'r', role: 'superviseur', nom: 'X', expireDans: 30 },
      MAINTENANT,
    );

    expect(session.role).toBe('client');
  });
});
