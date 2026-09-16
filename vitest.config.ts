import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const here = import.meta.dirname;

/**
 * Projects, per exercise:
 *
 *   core          unit tests for the shared plumbing. Must always pass.
 *   solution-nn   behaviour tests pointed at the finished lab files. Must always pass.
 *   exercise-nn   the same behaviour tests pointed at the starter. Expected to fail
 *                 until the tasks are done, which is what `pnpm test:exercise` reports.
 */
const EXERCISES = [
  { key: '01', slug: '01.game-day', name: 'game-day' },
  { key: '02', slug: '02.grace-periods', name: 'grace-periods' },
];

const core = {
  '@bigpdf/lab-core/contracts': path.join(here, 'packages/lab-core/src/contracts/index.ts'),
  '@bigpdf/lab-core/server': path.join(here, 'packages/lab-core/src/server/index.ts'),
  '@bigpdf/lab-core/ui': path.join(here, 'packages/lab-core/src/ui/index.ts'),
};

const behaviour = (target: 'exercise' | 'solution', exercise: (typeof EXERCISES)[number]) => ({
  plugins: [react()],
  resolve: {
    alias: {
      [`@lab/${exercise.key}`]: path.join(
        here,
        'exercises',
        exercise.slug,
        `${exercise.key}.${target === 'exercise' ? 'problem' : 'solution'}.${exercise.name}`,
        'src',
      ),
      ...core,
    },
  },
  test: {
    name: `${target}-${exercise.key}`,
    root: here,
    environment: 'jsdom',
    globals: false,
    include: [`tests/behaviour/${exercise.key}/**/*.test.ts`, `tests/behaviour/${exercise.key}/**/*.test.tsx`],
    setupFiles: [path.join(here, 'tests/setup.ts')],
  },
});

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: core },
        test: {
          name: 'core',
          root: here,
          environment: 'node',
          include: ['packages/lab-core/test/**/*.test.ts'],
        },
      },
      ...EXERCISES.flatMap((exercise) => [behaviour('exercise', exercise), behaviour('solution', exercise)]),
    ],
  },
});
