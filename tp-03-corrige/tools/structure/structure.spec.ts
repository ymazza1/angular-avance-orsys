import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Tests de structure du workspace.
 *
 * Ils ne testent pas du code : ils testent la configuration du dépôt.
 * C'est le filet qui empêche l'architecture de s'éroder silencieusement —
 * exactement comme un test unitaire empêche une régression de comportement.
 *
 * Lancement : npm run test:structure
 */

const RACINE = join(__dirname, '..', '..');

const LIBS_ATTENDUES = [
  { chemin: 'libs/catalogue/domaine', nom: 'catalogue-domaine', type: 'domaine', domaine: 'catalogue' },
  { chemin: 'libs/catalogue/data-access', nom: 'catalogue-data-access', type: 'data-access', domaine: 'catalogue' },
  { chemin: 'libs/catalogue/ui', nom: 'catalogue-ui', type: 'ui', domaine: 'catalogue' },
  { chemin: 'libs/catalogue/feature', nom: 'catalogue-feature', type: 'feature', domaine: 'catalogue' },
  { chemin: 'libs/livraison/domaine', nom: 'livraison-domaine', type: 'domaine', domaine: 'livraison' },
  { chemin: 'libs/livraison/data-access', nom: 'livraison-data-access', type: 'data-access', domaine: 'livraison' },
  { chemin: 'libs/partage/util', nom: 'partage-util', type: 'util', domaine: 'partage' },
] as const;

/** Ce que chaque type a le droit d'importer. Le reste est interdit. */
const DEPENDANCES_AUTORISEES: Record<string, readonly string[]> = {
  'type:app': ['type:feature', 'type:ui', 'type:util'],
  'type:feature': ['type:feature', 'type:ui', 'type:data-access', 'type:domaine', 'type:util'],
  'type:ui': ['type:ui', 'type:domaine', 'type:util'],
  'type:data-access': ['type:data-access', 'type:domaine', 'type:util'],
  'type:domaine': ['type:domaine', 'type:util'],
  'type:util': ['type:util'],
};

function lireProjet(chemin: string): { name: string; tags?: string[] } {
  return JSON.parse(readFileSync(join(RACINE, chemin, 'project.json'), 'utf8'));
}

function lireEslint(): string {
  return readFileSync(join(RACINE, 'eslint.config.mjs'), 'utf8');
}

function fichiersTypeScript(dossier: string): string[] {
  const absolu = join(RACINE, dossier);
  const resultat: string[] = [];
  const parcourir = (courant: string) => {
    for (const entree of readdirSync(courant)) {
      const complet = join(courant, entree);
      if (statSync(complet).isDirectory()) parcourir(complet);
      else if (complet.endsWith('.ts')) resultat.push(complet);
    }
  };
  parcourir(absolu);
  return resultat;
}

describe('tags des projets', () => {
  it.each(LIBS_ATTENDUES)('$nom porte un tag de type', ({ chemin, type }) => {
    const projet = lireProjet(chemin);

    expect(projet.tags ?? []).toContain(`type:${type}`);
  });

  it.each(LIBS_ATTENDUES)('$nom porte un tag de domaine', ({ chemin, domaine }) => {
    const projet = lireProjet(chemin);

    expect(projet.tags ?? []).toContain(`domaine:${domaine}`);
  });

  it('l application porte elle aussi ses tags', () => {
    const projet = lireProjet('apps/boutique');

    expect(projet.tags ?? []).toEqual(expect.arrayContaining(['type:app', 'domaine:boutique']));
  });
});

describe('règles de frontières', () => {
  it('la règle enforce-module-boundaries est activée', () => {
    expect(lireEslint()).toContain('@nx/enforce-module-boundaries');
  });

  it.each(Object.keys(DEPENDANCES_AUTORISEES))('une contrainte existe pour %s', (tag) => {
    expect(lireEslint()).toContain(tag);
  });

  it('un composant de présentation ne peut pas atteindre la couche data-access', () => {
    const config = lireEslint();
    const contrainteUi = extraireContrainte(config, 'type:ui');

    expect(contrainteUi).not.toContain('type:data-access');
  });

  it('une bibliothèque de domaine ne peut pas atteindre la couche data-access', () => {
    const contrainteDomaine = extraireContrainte(lireEslint(), 'type:domaine');

    expect(contrainteDomaine).not.toContain('type:data-access');
  });
});

describe('pureté du domaine', () => {
  const libsDomaine = LIBS_ATTENDUES.filter((l) => l.type === 'domaine');

  it.each(libsDomaine)('$nom n importe rien d Angular', ({ chemin }) => {
    const fautifs = fichiersTypeScript(chemin).filter((fichier) =>
      readFileSync(fichier, 'utf8').includes("from '@angular/"),
    );

    expect(fautifs).toEqual([]);
  });

  it.each(libsDomaine)('$nom n importe pas rxjs', ({ chemin }) => {
    const fautifs = fichiersTypeScript(chemin).filter((fichier) =>
      readFileSync(fichier, 'utf8').includes("from 'rxjs'"),
    );

    expect(fautifs).toEqual([]);
  });
});

/**
 * Extrait le bloc de contraintes associé à un tag source, pour pouvoir
 * vérifier ce qu'il autorise sans dépendre du formatage exact du fichier.
 */
function extraireContrainte(config: string, tagSource: string): string {
  const debut = config.indexOf(tagSource);
  if (debut === -1) return '';
  const fin = config.indexOf('}', debut);
  return config.slice(debut, fin === -1 ? undefined : fin);
}
