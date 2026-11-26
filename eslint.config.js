import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/',
      'dist-test/',
      'release/',
      'coverage/',
      'test-results/',
      'playwright-report/',
    ],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.webextensions },
    },
    rules: {
      // innerHTML with untrusted text was the XSS hole in v1 — keep it out.
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Build DOM nodes with textContent instead.' },
      ],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'test/**/*.js', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['test/**/*.js', 'test/**/*.mjs'],
    // e2e callbacks run inside the extension, so `chrome` is in scope there.
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.webextensions } },
  },
];
