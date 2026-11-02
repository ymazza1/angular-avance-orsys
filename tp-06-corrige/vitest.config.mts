import { defineConfig } from 'vitest/config';

/**
 * Tests de structure du workspace.
 * Ils ne montent aucun composant : ils lisent la configuration du dépôt.
 * Lancement : npm run test:structure
 */
export default defineConfig({
  test: {
    name: 'structure',
    include: ['tools/**/*.spec.ts'],
    environment: 'node',
    reporters: ['verbose'],
  },
});
