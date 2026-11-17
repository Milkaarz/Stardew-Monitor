import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', 'build/**', 'release/**', 'legacy/**', 'data/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['frontend/src/**/*.{js,jsx}'],
    languageOptions: { globals: { ...globals.browser } },
    // JSX: variáveis usadas apenas em JSX não são detectadas pelo no-unused-vars sem plugin de React
    rules: { 'no-unused-vars': 'off' },
  },
  {
    files: ['ecosystem.config.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
  },
];
