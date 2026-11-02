import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Garde-fous de performance.
 *
 * Trois règles qu'on vérifie d'habitude en revue de code, et qu'on oublie une
 * fois sur deux. Les transformer en tests, c'est la même démarche qu'au TP 1
 * avec les frontières de modules : ce qui n'est pas vérifié par une machine
 * finit par ne plus être vrai.
 */

const RACINE = join(__dirname, '..', '..');

function composants(): { chemin: string; source: string }[] {
  const resultat: { chemin: string; source: string }[] = [];
  const parcourir = (courant: string) => {
    for (const entree of readdirSync(courant)) {
      if (entree === 'node_modules' || entree === 'dist') continue;
      const complet = join(courant, entree);
      if (statSync(complet).isDirectory()) parcourir(complet);
      else if (complet.endsWith('.component.ts') || complet.endsWith('.page.ts')) {
        resultat.push({
          chemin: complet.slice(RACINE.length + 1),
          source: readFileSync(complet, 'utf8'),
        });
      }
    }
  };
  parcourir(join(RACINE, 'libs'));
  return resultat;
}

function templateDe(source: string): string {
  const debut = source.indexOf('template: `');
  if (debut === -1) return '';
  const fin = source.indexOf('`,', debut + 11);
  return source.slice(debut + 11, fin === -1 ? undefined : fin);
}

interface Budget {
  type: string;
  maximumWarning?: string;
  maximumError?: string;
}

function budgets(): Budget[] {
  const projet = JSON.parse(readFileSync(join(RACINE, 'apps/boutique/project.json'), 'utf8'));
  return projet.targets.build.configurations.production.budgets ?? [];
}

function enKo(valeur: string | undefined): number {
  if (!valeur) return Number.POSITIVE_INFINITY;
  const nombre = Number.parseFloat(valeur);
  return valeur.toLowerCase().includes('mb') ? nombre * 1024 : nombre;
}

describe('budgets de bundle', () => {
  it('un budget initial est déclaré', () => {
    expect(budgets().map((b) => b.type)).toContain('initial');
  });

  /**
   * Un budget d'erreur à 800 ko sur un bundle de 300 ko ne protège de rien :
   * il laisse passer un triplement. Un budget utile est juste au-dessus de la
   * valeur mesurée.
   */
  it('le budget initial est serré autour de la taille réelle', () => {
    const initial = budgets().find((b) => b.type === 'initial');

    expect(enKo(initial?.maximumError)).toBeLessThanOrEqual(360);
  });

  it('le budget initial avertit avant de bloquer', () => {
    const initial = budgets().find((b) => b.type === 'initial');

    expect(enKo(initial?.maximumWarning)).toBeLessThan(enKo(initial?.maximumError));
  });

  it('un budget encadre les styles de composant', () => {
    expect(budgets().map((b) => b.type)).toContain('anyComponentStyle');
  });
});

describe('templates', () => {
  /**
   * Une expression de template est réévaluée à CHAQUE vérification de la vue.
   * Un appel de service dans une liaison s'exécute donc une fois par produit
   * et par cycle — alors qu'un `computed` ne recalcule que si une dépendance
   * a changé.
   */
  it('aucun appel de méthode de service dans une liaison', () => {
    // Un signal en lecture — `facade.filtres()` — ne prend pas d'argument et
    // ne coûte rien. C'est l'appel AVEC argument qui refait un calcul à
    // chaque cycle : `stocks.quantite(produit.id)`.
    const appelAvecArgument = /\[\w+\]="(?:this\.)?\w+\.\w+\([^)]+\)/;

    const fautifs = composants()
      .filter(({ source }) => appelAvecArgument.test(templateDe(source)))
      .map(({ chemin }) => chemin);

    expect(fautifs).toEqual([]);
  });

  it('chaque @for déclare un track', () => {
    const fautifs = composants()
      .filter(({ source }) => {
        const template = templateDe(source);
        // La condition d'un @for peut contenir des parenthèses — `lignes()` —
        // donc on lit jusqu'à l'accolade ouvrante, pas jusqu'au premier `)`.
        const boucles = template.match(/@for\s*\([\s\S]*?\)\s*\{/g) ?? [];
        return boucles.some((boucle) => !boucle.includes('track'));
      })
      .map(({ chemin }) => chemin);

    expect(fautifs).toEqual([]);
  });
});

describe('images', () => {
  /**
   * NgOptimizedImage impose width/height — donc plus de décalage de mise en
   * page — et génère le chargement paresseux et les jeux de sources.
   */
  it('les images de produit passent par NgOptimizedImage', () => {
    const carte = composants().find(({ chemin }) => chemin.includes('carte-produit'));

    expect(carte?.source).toContain('NgOptimizedImage');
  });

  it('aucune image sans dimensions déclarées', () => {
    const fautifs = composants()
      .filter(({ source }) => {
        const balises = templateDe(source).match(/<img[^>]*>/g) ?? [];
        return balises.some((img) => !img.includes('width') || !img.includes('height'));
      })
      .map(({ chemin }) => chemin);

    expect(fautifs).toEqual([]);
  });
});
