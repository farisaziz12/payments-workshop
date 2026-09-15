import { expect, test } from '@playwright/test';
import { WORKSPACE_ID, chooseScenario, payWith, resetLab } from './helpers';

test.describe('reset and repeatability', () => {
  test('reset clears payments, access and the timeline', async ({ page, request }) => {
    await resetLab(request);
    await chooseScenario(request, 'instant-success');
    await page.goto('/');
    await payWith(page, 'card');
    await expect(page.getByTestId('status')).toHaveAttribute('data-tone', 'success');

    await page.getByTestId('reset').click();

    await expect(page.getByTestId('server-status')).toHaveText('no payment yet');

    // Reset records itself, so the timeline is not empty afterwards. What matters is
    // that nothing about the previous payment survived it.
    await expect(page.getByTestId('timeline')).toContainText('Reset: purchases, payments');
    await expect(page.getByTestId('timeline')).not.toContainText('answered "succeeded"');
    await expect(page.getByTestId('timeline')).not.toContainText('Submitted');

    await page.goto(`/workspace/${WORKSPACE_ID}`);
    await expect(page.getByTestId('access')).toHaveAttribute('data-unlocked', 'false');
  });

  test('the same scenario gives the same result twice', async ({ page, request }) => {
    for (const run of [1, 2]) {
      await resetLab(request);
      await chooseScenario(request, 'instant-decline');
      await page.goto('/');
      await payWith(page, 'card');

      await expect(page.getByTestId('server-status'), `run ${run}`).toHaveText('failed');
      await expect(page.getByTestId('status'), `run ${run}`).toHaveAttribute('data-tone', 'failure');
    }
  });
});
