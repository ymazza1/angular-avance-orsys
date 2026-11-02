#!/usr/bin/env node
/**
 * Chasse aux mutants.
 *
 * Un test qui passe ne prouve rien tant qu'on n'a pas vérifié qu'il sait
 * échouer. Ce script introduit une par une de petites erreurs dans le code du
 * domaine — un `>=` devenu `>`, un `&&` devenu `||` — puis relance les tests.
 *
 *   mutant TUÉ      : au moins un test a échoué. Le code est couvert.
 *   mutant SURVIVANT: tous les tests passent malgré l'erreur. Un trou.
 *
 * Usage :
 *   node tools/mutants/chasse.mjs                 tous les mutants
 *   node tools/mutants/chasse.mjs catalogue       ceux d'un projet
 *
 * Ce n'est pas un outil de production — pour ça, voyez Stryker. C'est une
 * démonstration, volontairement lisible en une page.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = join(import.meta.dirname, '..', '..');

/** Chaque mutant : un fichier, un remplacement unique, un projet à tester. */
const MUTANTS = [
  {
    nom: 'seuil de volume inclusif → exclusif',
    fichier: 'libs/catalogue/domaine/src/lib/produit.ts',
    avant: 'gabarit.volumeM3 >= VOLUME_VOLUMINEUX_M3',
    apres: 'gabarit.volumeM3 > VOLUME_VOLUMINEUX_M3',
    projet: 'catalogue-domaine',
  },
  {
    nom: 'disponibilité : stock > 0 → stock >= 0',
    fichier: 'libs/catalogue/domaine/src/lib/produit.ts',
    avant: 'return produit.stock > 0;',
    apres: 'return produit.stock >= 0;',
    projet: 'catalogue-domaine',
  },
  {
    nom: 'recherche exploitable : minimum ignoré',
    fichier: 'libs/catalogue/domaine/src/lib/filtres.ts',
    avant: 'nettoyee.length >= LONGUEUR_MINIMALE_RECHERCHE',
    apres: 'nettoyee.length >= 1',
    projet: 'catalogue-domaine',
  },
  {
    nom: 'franco de port : seuil strict → large',
    fichier: 'libs/livraison/domaine/src/lib/strategies.ts',
    avant: 'montantTotal >= SEUIL_FRANCO_EUROS',
    apres: 'montantTotal > SEUIL_FRANCO_EUROS',
    projet: 'livraison-domaine',
  },
  {
    nom: 'point relais : et → ou',
    fichier: 'libs/commande/domaine/src/lib/commande.ts',
    avant: 'ligne.poidsKg <= POIDS_MAX_POINT_RELAIS_KG && ligne.volumeM3 <= VOLUME_MAX_POINT_RELAIS_M3',
    apres: 'ligne.poidsKg <= POIDS_MAX_POINT_RELAIS_KG || ligne.volumeM3 <= VOLUME_MAX_POINT_RELAIS_M3',
    projet: 'commande-domaine',
  },
  {
    nom: 'modes disponibles : every → some',
    fichier: 'libs/commande/domaine/src/lib/commande.ts',
    avant: 'panier.every(accepteEnPointRelais)',
    apres: 'panier.some(accepteEnPointRelais)',
    projet: 'commande-domaine',
  },
  {
    nom: 'marge d expiration supprimée',
    fichier: 'libs/auth/domaine/src/lib/session.ts',
    avant: 'session.expireLe - MARGE_EXPIRATION_MS <= maintenant',
    apres: 'session.expireLe <= maintenant',
    projet: 'auth-domaine',
  },
  {
    nom: 'quantité zéro ne retire plus la ligne',
    fichier: 'libs/panier/domaine/src/lib/panier.ts',
    avant: 'if (quantite <= 0) return retirer(panier, produitId);',
    apres: 'if (quantite < 0) return retirer(panier, produitId);',
    projet: 'panier-domaine',
  },
];

const filtre = process.argv[2];
const selection = filtre ? MUTANTS.filter((m) => m.projet.includes(filtre)) : MUTANTS;

if (selection.length === 0) {
  console.error(`Aucun mutant pour « ${filtre} ».`);
  process.exit(1);
}

function testsPassent(projet) {
  try {
    execSync(`npx nx test ${projet} --skip-nx-cache`, { cwd: RACINE, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

const survivants = [];

for (const mutant of selection) {
  const chemin = join(RACINE, mutant.fichier);
  const original = readFileSync(chemin, 'utf8');

  if (!original.includes(mutant.avant)) {
    console.log(`⊘  ${mutant.nom} — code introuvable, mutant ignoré`);
    continue;
  }

  writeFileSync(chemin, original.replace(mutant.avant, mutant.apres));
  try {
    const survit = testsPassent(mutant.projet);
    console.log(`${survit ? '☠  SURVIVANT' : '✓  tué       '}  ${mutant.nom}`);
    if (survit) survivants.push(mutant);
  } finally {
    writeFileSync(chemin, original);
  }
}

console.log(`\n${selection.length - survivants.length}/${selection.length} mutants tués.`);

if (survivants.length > 0) {
  console.log('\nMutants survivants — écrivez le test qui les aurait attrapés :');
  for (const mutant of survivants) {
    console.log(`  · ${mutant.nom}`);
    console.log(`    ${mutant.fichier}`);
    console.log(`    ${mutant.avant}  →  ${mutant.apres}`);
  }
  process.exit(1);
}
