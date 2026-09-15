import { expect, test } from '@playwright/test';
import { chooseScenario, deliverScheduledEvents, payWith, resetLab, timelineText } from './helpers';

test.describe('deliveries that go wrong', () => {
  test.beforeEach(async ({ request }) => {
    await resetLab(request);
  });

  test('the same event delivered twice changes the payment once', async ({ page, request }) => {
    await chooseScenario(request, 'duplicate-event');
    await page.goto('/');
    await payWith(page, 'bank_debit');
    await deliverScheduledEvents(page);

    await expect(page.getByTestId('server-status')).toHaveText('succeeded');
    await expect(page.getByTestId('timeline')).toContainText('duplicate');
    expect(await timelineText(page)).toContain('ignored a duplicate delivery');
  });

  test('an older event arriving late does not undo the newer state', async ({ page, request }) => {
    await chooseScenario(request, 'out-of-order-event');
    await page.goto('/');
    await payWith(page, 'bank_debit');
    await deliverScheduledEvents(page);

    await expect(page.getByTestId('server-status')).toHaveText('succeeded');
    await expect(page.getByTestId('timeline')).toContainText('stale');
  });

  test('submitting the same purchase twice creates one payment, not two', async ({ page, request }) => {
    await chooseScenario(request, 'delayed-success');
    await page.goto('/');
    await payWith(page, 'bank_debit');
    await expect(page.getByTestId('server-status')).toHaveText('processing');

    await page.getByTestId('resubmit').click();

    await expect(page.getByTestId('timeline')).toContainText('returning the existing payment');
    const timeline = await timelineText(page);
    expect(timeline.match(/answered "processing"/g) ?? []).toHaveLength(1);
  });
});

test.describe('the payment succeeded but the browser never heard', () => {
  test.beforeEach(async ({ request }) => {
    await resetLab(request);
    await chooseScenario(request, 'client-timeout-success');
  });

  test('does not tell the customer the payment failed', async ({ page }) => {
    await page.goto('/');
    await payWith(page, 'card');

    await expect(page.getByTestId('status')).not.toHaveAttribute('data-tone', 'failure');
  });

  test('reports an unknown outcome, then settles on the truth from the server', async ({ page }) => {
    await page.goto('/');
    await payWith(page, 'card');

    await expect(page.getByTestId('status')).toHaveAttribute('data-tone', 'unknown');
    await expect(page.getByTestId('status')).toHaveAttribute('data-tone', 'success', { timeout: 20_000 });
  });
});
