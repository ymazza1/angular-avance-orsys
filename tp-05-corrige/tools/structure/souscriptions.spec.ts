import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Ajouté au TP 3.
 *
 * Une souscription manuelle dans du code applicatif est presque toujours une
 * fuite en puissance : il faut se souvenir de se désabonner, et personne ne s'en
 * souvient six mois plus tard. Les alternatives ne manquent pas — `toSignal`,
 * le pipe `async`, `takeUntilDestroyed` — et toutes se nettoient seules.
 *
 * Ce test rend la règle vérifiable. Les fichiers de test en sont exclus : y
 * souscrire à la main est légitime et sans conséquence.
 */

const RACINE = join(__dirname, '..', '..');
const SOURCES = ['libs', 'apps'];

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
  for (const dossier of SOURCES) parcourir(join(RACINE, dossier));
  return resultat;
}

describe('souscriptions', () => {
  it('aucun subscribe manuel dans le code applicatif', () => {
    const fautifs = fichiersApplicatifs()
      .filter((fichier) => /\.subscribe\s*\(/.test(readFileSync(fichier, 'utf8')))
      .map((fichier) => fichier.slice(RACINE.length + 1));

    expect(fautifs).toEqual([]);
  });

  it('aucun Subject exposé publiquement par une façade', () => {
    const fautifs = fichiersApplicatifs()
      .filter((fichier) => fichier.endsWith('.facade.ts'))
      .filter((fichier) => {
        const contenu = readFileSync(fichier, 'utf8');
        return /^\s*(readonly\s+)?\w+\s*=\s*new\s+\w*Subject/m.test(contenu);
      })
      .map((fichier) => fichier.slice(RACINE.length + 1));

    expect(fautifs).toEqual([]);
  });
});
