import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // Module boundaries: a module imports only from the core (src/models, utils, middleware...) and
  // from its own folder. A collection that another module needs belongs in src/models.
  // The rule reads the import text, so it does not see require() or import(): reviews catch those.
  ...[
    // a file at the top of a module: '../x' is another module
    { files: ['src/modules/*/*.ts'], sibling: String.raw`^\.\./(?!\.\./)` },
    // a file one folder deeper: '../x' is its own module, '../../x' is another module
    { files: ['src/modules/*/*/*.ts'], sibling: String.raw`^\.\./\.\./(?!\.\./)` },
  ].map(({ files, sibling }) => ({
    files,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [sibling, '(^|/)modules/'].map((regex) => ({
            regex,
            message:
              'Do not import from another module. Shared collections live in src/models: import them from there.',
          })),
        },
      ],
    },
  })),
  {
    files: ['**/*.js', '**/*.mjs', 'jest.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
