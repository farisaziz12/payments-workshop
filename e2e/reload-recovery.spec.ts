import { expect, test } from '@playwright/test';
import { chooseScenario, deliverScheduledEvents, payWith, resetLab } from './helpers';

test.describe('coming back to a payment that is still being confirmed', () => {
  test.beforeEach(async ({ request }) => {
    await resetLab(request);
    await chooseScenario(request, 'delayed-success');
  });

  test('a reload still shows the pending payment, not an empty checkout', async ({ page }) => {
    await page.goto('/');
    await payWith(page, 'bank_debit');
    await expect(page.getByTestId('server-status')).toHaveText('processing');
    const purchase = await page.getByTestId('purchase-id').innerText();

    await page.reload();

    await expect(page.getByTestId('purchase-id')).toHaveText(purchase);
    await expect(page.getByTestId('server-status')).toHaveText('processing');
    await expect(page.getByTestId('status')).toHaveAttribute('data-tone', 'pending');
  });

  test('an event that arrives while the tab is closed is still there when the customer returns', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    await payWith(page, 'bank_debit');
    await expect(page.getByTestId('server-status')).toHaveText('processing');
    const purchaseUrl = page.url();

    // The customer closes the tab. The provider's event lands anyway.
    await page.goto('about:blank');
    const delivered = await request.post('/api/simulator/deliver-now');
    expect(delivered.ok()).toBeTruthy();

    await page.goto(purchaseUrl);

    await expect(page.getByTestId('server-status')).toHaveText('succeeded');
    await expect(page.getByTestId('status')).toHaveAttribute('data-tone', 'success');
  });

  test('a returning customer with only the URL sees the real state', async ({ page, context }) => {
    await page.goto('/');
    await payWith(page, 'bank_debit');
    await expect(page.getByTestId('server-status')).toHaveText('processing');
    const purchaseUrl = page.url();
    await deliverScheduledEvents(page);
    await expect(page.getByTestId('server-status')).toHaveText('succeeded');

    // A different browser, so nothing in localStorage. Only the link.
    const fresh = await context.browser()!.newContext();
    const freshPage = await fresh.newPage();
    await freshPage.goto(purchaseUrl);

    await expect(freshPage.getByTestId('server-status')).toHaveText('succeeded');
    await fresh.close();
  });

  test('a made-up ?status=success does not fake a paid checkout', async ({ page }) => {
    await page.goto('/?status=success');

    await expect(page.getByTestId('server-status')).toHaveText('no payment yet');
    await expect(page.getByTestId('status')).not.toHaveAttribute('data-tone', 'success');
  });
});
