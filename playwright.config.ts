import { defineConfig, devices } from '@playwright/test';

/**
 * One config, one app per run. `pnpm e2e` walks the exercises and runs each on its own,
 * because every app keeps its state in memory: two runs against one port would reset each
 * other halfway through.
 *
 * Workers are pinned to one for the same reason.
 */
const EXERCISES: Record<string, { problem: number; solution: number }> = {
  '01': { problem: 3001, solution: 3002 },
  '02': { problem: 3003, solution: 3004 },
};

const key = process.env.E2E_EXERCISE ?? '01';
const target = process.env.E2E_TARGET === 'exercise' ? 'exercise' : 'solution';
const ports = EXERCISES[key] ?? EXERCISES['01']!;
const port = target === 'exercise' ? ports.problem : ports.solution;
const baseURL = `http://localhost:${port}`;

const projects = Object.entries(EXERCISES).flatMap(([exercise, entry]) => [
  {
    name: `exercise-${exercise}`,
    testDir: `./e2e/${exercise}`,
    use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${entry.problem}` },
  },
  {
    name: `solution-${exercise}`,
    testDir: `./e2e/${exercise}`,
    use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${entry.solution}` },
  },
]);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects,
  webServer: {
    command: `node scripts/lab.mjs ${target} ${key}`,
    url: `${baseURL}/api/${key === '02' ? 'billing' : 'dashboard'}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
