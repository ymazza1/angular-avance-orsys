import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Vérification de l'environnement de formation.
 *
 * Ces tests ne testent pas votre code : ils testent votre poste de travail.
 * Ils doivent tous passer avant le TP 1 — un environnement bancal coûte plus
 * cher au groupe qu'un TP raté.
 *
 * Lancement : npm run test:structure
 */

const RACINE = join(__dirname, '..', '..');
const API = 'http://localhost:3333';

function versionInstallee(paquet: string): string {
  const fichier = join(RACINE, 'node_modules', paquet, 'package.json');
  if (!existsSync(fichier)) {
    throw new Error(
      `${paquet} n'est pas installé. Lancez : npm install --legacy-peer-deps`,
    );
  }
  return JSON.parse(readFileSync(fichier, 'utf8')).version;
}

async function interrogerApi(chemin: string): Promise<Response> {
  try {
    return await fetch(`${API}${chemin}`, { signal: AbortSignal.timeout(3000) });
  } catch {
    throw new Error(
      `L'API ne répond pas sur ${API}. Dans un second terminal : cd api && npm install && npm start`,
    );
  }
}

describe('poste de travail', () => {
  it('tourne sur Node 22 ou plus récent', () => {
    const majeure = Number(process.versions.node.split('.')[0]);

    expect(majeure).toBeGreaterThanOrEqual(22);
  });

  it('a installé les dépendances du workspace', () => {
    expect(existsSync(join(RACINE, 'node_modules'))).toBe(true);
  });
});

describe('versions attendues', () => {
  it('Angular 22', () => {
    expect(versionInstallee('@angular/core')).toMatch(/^22\./);
  });

  it('TypeScript 6.0 (Angular 22 exige >= 6.0 < 6.1)', () => {
    expect(versionInstallee('typescript')).toMatch(/^6\.0\./);
  });

  it('Nx 23', () => {
    expect(versionInstallee('nx')).toMatch(/^23\./);
  });

  it('Vitest est disponible', () => {
    expect(() => versionInstallee('vitest')).not.toThrow();
  });
});

describe('API de démonstration', () => {
  it('répond sur /api/sante', async () => {
    const reponse = await interrogerApi('/api/sante');

    await expect(reponse.json()).resolves.toMatchObject({ statut: 'ok' });
  });

  it('sert les 20 produits du catalogue', async () => {
    const reponse = await interrogerApi('/api/produits?taille=50');

    const page = (await reponse.json()) as { total: number };
    expect(page.total).toBe(20);
  });

  it('accepte le compte de démonstration', async () => {
    const reponse = await fetch(`${API}/api/auth/connexion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'client@maison.co', motDePasse: 'client' }),
      signal: AbortSignal.timeout(3000),
    });

    expect(reponse.status).toBe(200);
  });

  it('refuse un compte inconnu', async () => {
    const reponse = await fetch(`${API}/api/auth/connexion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'inconnu@maison.co', motDePasse: 'x' }),
      signal: AbortSignal.timeout(3000),
    });

    expect(reponse.status).toBe(401);
  });
});
