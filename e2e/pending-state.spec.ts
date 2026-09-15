import { expect, test } from '@playwright/test';
import { chooseScenario, deliverScheduledEvents, payWith, resetLab } from './helpers';

test.describe('a bank debit that is accepted, then succeeds', () => {
  test.beforeEach(async ({ request }) => {
    await resetLab(request);
    await chooseScenario(request, 'delayed-success');
  });

  test('shows the payment as pending, not as paid, while the server says processing', async ({ page }) => {
    await page.goto('/');
    await payWith(page, 'bank_debit');

    await expect(page.getByTestId('server-status')).toHaveText('processing');
    await expect(page.getByTestId('status')).toHaveAttribute('data-tone', 'pending');
    await expect(page.getByTestId('status-title')).not.toContainText('received');
  });

  test('keeps asking the server while the outcome is still open', async ({ page }) => {
    await page.goto('/');
    await payWith(page, 'bank_debit');

    await expect(page.getByTestId('polling')).toHaveText('yes');
  });

  test('turns into a success on its own once the provider event lands', async ({ page }) => {
    await page.goto('/');
    await payWith(page, 'bank_debit');
    await expect(page.getByTestId('status')).toHaveAttribute('data-tone', 'pending');

    await deliverScheduledEvents(page);

    await expect(page.getByTestId('status')).toHaveAttribute('data-tone', 'success');
    await expect(page.getByTestId('server-status')).toHaveText('succeeded');
  });
});

test.describe('a bank debit that is accepted, then fails', () => {
  test('ends as a failure, not as a slow success', async ({ page, request }) => {
    await resetLab(request);
    await chooseScenario(request, 'delayed-failure');

    await page.goto('/');
    await payWith(page, 'bank_debit');
    await expect(page.getByTestId('status')).toHaveAttribute('data-tone', 'pending');

    await deliverScheduledEvents(page);

    await expect(page.getByTestId('status')).toHaveAttribute('data-tone', 'failure');
    await expect(page.getByTestId('server-status')).toHaveText('failed');
  });
});

test.describe('a card that answers immediately', () => {
  test('shows success straight away', async ({ page, request }) => {
    await resetLab(request);
    await chooseScenario(request, 'instant-success');

    await page.goto('/');
    await payWith(page, 'card');

    await expect(page.getByTestId('status')).toHaveAttribute('data-tone', 'success');
  });

  test('shows a decline as a failure with a retry', async ({ page, request }) => {
    await resetLab(request);
    await chooseScenario(request, 'instant-decline');

    await page.goto('/');
    await payWith(page, 'card');

    await expect(page.getByTestId('status')).toHaveAttribute('data-tone', 'failure');
    await expect(page.getByTestId('retry')).toBeVisible();
  });
});
