import { defineConfig, devices } from '@playwright/test';

/**
 * One config, two targets. `pnpm e2e` runs the solution, `pnpm e2e:exercise` runs the
 * starter, and each boots only its own app so the two never share a port or a store.
 *
 * Workers are pinned to one: the lab's application server keeps its state in memory,
 * so parallel tests would be reading each other's payments.
 */
const target = process.env.E2E_TARGET === 'exercise' ? 'exercise' : 'solution';
const port = target === 'exercise' ? 3001 : 3002;
const baseURL = `http://localhost:${port}`;

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
  projects: [
    { name: 'exercise', use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3001' } },
    { name: 'solution', use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3002' } },
  ],
  webServer: {
    command: `node scripts/lab.mjs ${target} 01`,
    url: `${baseURL}/api/timeline`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
