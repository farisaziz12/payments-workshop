import { expect, test } from '@playwright/test';
import { WORKSPACE_ID, chooseScenario, deliverScheduledEvents, payWith, resetLab } from './helpers';

test.describe('the workspace follows the server, not the browser', () => {
  test.beforeEach(async ({ request }) => {
    await resetLab(request);
  });

  test('is locked before anyone pays', async ({ page }) => {
    await page.goto(`/workspace/${WORKSPACE_ID}`);

    await expect(page.getByTestId('access')).toHaveAttribute('data-unlocked', 'false');
  });

  test('stays locked while a bank debit is still being confirmed', async ({ page, request }) => {
    await chooseScenario(request, 'delayed-success');
    await page.goto('/');
    await payWith(page, 'bank_debit');
    await expect(page.getByTestId('server-status')).toHaveText('processing');

    await page.getByTestId('workspace-link').click();

    // Wait until the browser is actually holding "processing" before checking access,
    // otherwise this passes on the first paint for the wrong reason.
    await expect(page.getByTestId('client-status')).toHaveText('processing');
    await expect(page.getByTestId('server-entitlement')).toContainText('payment_processing');
    await expect(page.getByTestId('access')).toHaveAttribute('data-unlocked', 'false');
  });

  test('unlocks once the provider confirms the payment', async ({ page, request }) => {
    await chooseScenario(request, 'delayed-success');
    await page.goto('/');
    await payWith(page, 'bank_debit');
    await expect(page.getByTestId('server-status')).toHaveText('processing');
    await deliverScheduledEvents(page);
    await expect(page.getByTestId('server-status')).toHaveText('succeeded');

    await page.getByTestId('workspace-link').click();

    await expect(page.getByTestId('access')).toHaveAttribute('data-unlocked', 'true');
  });

  test('stays locked after a decline', async ({ page, request }) => {
    await chooseScenario(request, 'instant-decline');
    await page.goto('/');
    await payWith(page, 'card');
    await expect(page.getByTestId('status')).toHaveAttribute('data-tone', 'failure');

    await page.getByTestId('workspace-link').click();

    await expect(page.getByTestId('access')).toHaveAttribute('data-unlocked', 'false');
  });

  test('a ?paid=1 in the URL unlocks nothing', async ({ page }) => {
    await page.goto(`/workspace/${WORKSPACE_ID}?paid=1`);

    await expect(page.getByTestId('access')).toHaveAttribute('data-unlocked', 'false');
  });
});
