import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  plugins: [nxViteTsPaths()],
  test: {
    name: 'panier-domaine',
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    // Retirer cette ligne pour activer les tests bonus (voir l'énoncé du TP).
    exclude: ['**/*.bonus.spec.ts'],
  },
});
