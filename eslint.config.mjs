import nextConfig from 'eslint-config-next/core-web-vitals';
import tsConfig from 'eslint-config-next/typescript';

/**
 * One flat config for the whole workspace. `next lint` no longer exists in Next 16,
 * so `pnpm lint` runs ESLint directly.
 */
const config = [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  ...nextConfig,
  ...tsConfig,
  {
    // The Next apps live in subdirectories, so tell the Next rules where to look.
    settings: { next: { rootDir: ['exercises/*/*.problem.*', 'exercises/*/*.solution.*'] } },
  },
  {
    rules: {
      // The lab files hand you props you are meant to ignore. Ignoring them is the lesson,
      // so an underscore-prefixed parameter is not a mistake.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    // The shared UI kit is plain React: it is rendered by Next, but it does not depend on it,
    // which is what lets the behaviour tests import it in a bare jsdom environment.
    // Its two navigation links are also deliberately full page loads, so that returning to a
    // page really does start from nothing but the URL, the way a customer's bookmark would.
    files: ['packages/lab-core/src/ui/**/*.{ts,tsx}'],
    rules: { '@next/next/no-html-link-for-pages': 'off' },
  },
  {
    // A starter must never reach into the finished implementation.
    files: ['exercises/**/*.problem.*/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/*.solution.*/**', '@stacknotes/solution-*'],
              message: 'The starter cannot import from the solution. Work it out in the exercise files.',
            },
          ],
        },
      ],
    },
  },
];

export default config;
