import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  plugins: [angular(), nxViteTsPaths()],
  test: {
    name: 'catalogue-feature',
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    // Retirer cette ligne pour activer les tests bonus (voir l'énoncé du TP).
    exclude: ['**/*.bonus.spec.ts'],
    setupFiles: ['../../../tools/test-setup.ts'],
  },
});
