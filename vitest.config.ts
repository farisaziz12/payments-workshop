import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const here = import.meta.dirname;

/**
 * Three test projects:
 *
 *   core      unit tests for the shared plumbing. Must always pass.
 *   solution  behaviour tests pointed at the finished lab files. Must always pass.
 *   exercise  the same behaviour tests pointed at the starter. Expected to fail
 *             until the TODOs are done, which is what `pnpm test:exercise` reports.
 */
const behaviour = (name: 'exercise' | 'solution', appDir: string) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@lab/app': path.join(here, appDir, 'src'),
      '@bigpdf/lab-core/contracts': path.join(here, 'packages/lab-core/src/contracts/index.ts'),
      '@bigpdf/lab-core/server': path.join(here, 'packages/lab-core/src/server/index.ts'),
      '@bigpdf/lab-core/ui': path.join(here, 'packages/lab-core/src/ui/index.ts'),
    },
  },
  test: {
    name,
    root: here,
    environment: 'jsdom',
    globals: false,
    include: ['tests/behaviour/**/*.test.ts', 'tests/behaviour/**/*.test.tsx'],
    setupFiles: [path.join(here, 'tests/setup.ts')],
  },
});

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '@bigpdf/lab-core/contracts': path.join(here, 'packages/lab-core/src/contracts/index.ts'),
            '@bigpdf/lab-core/server': path.join(here, 'packages/lab-core/src/server/index.ts'),
          },
        },
        test: {
          name: 'core',
          root: here,
          environment: 'node',
          include: ['packages/lab-core/test/**/*.test.ts'],
        },
      },
      behaviour('exercise', 'exercises/01.answers-later/01.problem.answers-later'),
      behaviour('solution', 'exercises/01.answers-later/01.solution.answers-later'),
    ],
  },
});
