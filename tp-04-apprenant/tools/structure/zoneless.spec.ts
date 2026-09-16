import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Ajouté au TP 4.
 *
 * Une application zoneless le reste tant que personne ne réintroduit Zone.js —
 * et la réintroduction est facile : une dépendance transitive, un polyfill
 * remis « pour débloquer un test », un `NgZone` injecté pour contourner un
 * rafraîchissement manquant.
 *
 * Ces tests rendent la propriété vérifiable plutôt que déclarative.
 */

const RACINE = join(__dirname, '..', '..');

function fichiersApplicatifs(): string[] {
  const resultat: string[] = [];
  const parcourir = (courant: string) => {
    for (const entree of readdirSync(courant)) {
      if (entree === 'node_modules' || entree === 'dist') continue;
      const complet = join(courant, entree);
      if (statSync(complet).isDirectory()) parcourir(complet);
      else if (complet.endsWith('.ts') && !complet.endsWith('.spec.ts')) resultat.push(complet);
    }
  };
  for (const dossier of ['libs', 'apps']) parcourir(join(RACINE, dossier));
  return resultat;
}

function lireJson(chemin: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(RACINE, chemin), 'utf8'));
}

describe('zoneless', () => {
  it('zone.js n est pas une dépendance du projet', () => {
    const paquet = lireJson('package.json') as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const toutes = { ...paquet.dependencies, ...paquet.devDependencies };
    expect(Object.keys(toutes)).not.toContain('zone.js');
  });

  it('aucun polyfill zone.js dans la configuration de build', () => {
    const projet = JSON.stringify(lireJson('apps/boutique/project.json'));

    expect(projet).not.toContain('zone.js');
  });

  it('aucun NgZone injecté dans le code applicatif', () => {
    const fautifs = fichiersApplicatifs()
      .filter((fichier) => /\bNgZone\b/.test(readFileSync(fichier, 'utf8')))
      .map((fichier) => fichier.slice(RACINE.length + 1));

    expect(fautifs).toEqual([]);
  });

  /**
   * `detectChanges()` en code applicatif est le symptôme d'un état qui n'est
   * pas réactif : on force le rafraîchissement au lieu de laisser un signal
   * notifier. Dans les tests, c'est `whenStable()` qui prend le relais.
   */
  it('aucun detectChanges manuel dans le code applicatif', () => {
    const fautifs = fichiersApplicatifs()
      .filter((fichier) => /\.detectChanges\s*\(/.test(readFileSync(fichier, 'utf8')))
      .map((fichier) => fichier.slice(RACINE.length + 1));

    expect(fautifs).toEqual([]);
  });
});
