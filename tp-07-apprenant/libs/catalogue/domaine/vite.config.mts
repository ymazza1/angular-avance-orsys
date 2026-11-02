import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { defineConfig } from 'vitest/config';

/**
 * Bibliothèque de domaine : aucun plugin Angular, environnement node.
 * Si un test d'ici a besoin de jsdom ou de TestBed, c'est que la règle
 * métier testée n'est pas à sa place.
 */
export default defineConfig({
  root: __dirname,
  plugins: [nxViteTsPaths()],
  test: {
    name: 'catalogue-domaine',
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    // Retirer cette ligne pour activer les tests bonus (voir l'énoncé du TP).
    exclude: ['**/*.bonus.spec.ts'],
  },
});
