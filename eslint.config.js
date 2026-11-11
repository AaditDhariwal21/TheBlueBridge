import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Tailwind arbitrary values such as `bg-[#123456]` or `p-[13px]` bypass the
// design tokens. Colours and sizes must come from client/src/styles/tokens.css.
const ARBITRARY_TOKEN_BYPASS = String.raw`/\[(#[0-9a-fA-F]{3,8}|-?\d+(\.\d+)?px)\]/`;

/** Type-aware TypeScript rules shared by client and server. */
const typescript = {
  extends: [
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    parserOptions: {
      // Each file is checked against its nearest tsconfig (client/ or server/).
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
  },
};

export default tseslint.config(
  { ignores: ['**/dist', '**/node_modules', '**/coverage'] },

  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  // ---------------------------------------------------------------- client
  {
    files: ['client/src/**/*.{ts,tsx}', 'client/vite.config.ts'],
    ...typescript,
    extends: [
      ...typescript.extends,
      jsxA11y.flatConfigs.strict,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: { ...typescript.languageOptions, globals: globals.browser },
    rules: {
      ...typescript.rules,
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is not allowed. Render text as React children.',
        },
        {
          selector: `Literal[value=${ARBITRARY_TOKEN_BYPASS}]`,
          message: 'Use a design token instead of an arbitrary hex/px value.',
        },
        {
          selector: `TemplateElement[value.raw=${ARBITRARY_TOKEN_BYPASS}]`,
          message: 'Use a design token instead of an arbitrary hex/px value.',
        },
      ],
    },
  },

  // ---------------------------------------------------------------- server
  {
    files: ['server/{src,test}/**/*.ts'],
    ...typescript,
    languageOptions: { ...typescript.languageOptions, globals: globals.node },
    rules: {
      ...typescript.rules,
      // node:test's describe/it return promises the runner itself awaits.
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: [
            { from: 'package', package: 'node:test', name: ['describe', 'it', 'test'] },
          ],
        },
      ],
    },
  },
);
