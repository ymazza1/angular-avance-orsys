import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/angular'],
  {
    ignores: ['**/dist', '**/node_modules', '**/.nx'],
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          // TODO TP 1 — étape 4
          // Déclarer ici les contraintes de dépendance entre tags.
          // Tant que ce tableau est vide, la règle ne protège rien :
          // n'importe quelle lib peut importer n'importe quelle autre.
          depConstraints: [],
        },
      ],
    },
  },
];
