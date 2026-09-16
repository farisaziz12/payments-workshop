import { expect, test } from '@playwright/test';
import { NORTHSTAR, advanceDays, resetClock } from './helpers';

/** The console has to make the decision legible, whichever way the decision went. */
test.describe('the billing console', () => {
  test.beforeEach(async ({ request }) => {
    await resetClock(request);
  });

  test('shows the clock, three accounts and the window behind each decision', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('clock-day')).toContainText('Day 0');
    await expect(page.getByTestId('account-ws_northstar')).toBeVisible();
    await expect(page.getByTestId('account-ws_acme')).toBeVisible();
    await expect(page.getByTestId('account-ws_harbour')).toBeVisible();
    await expect(page.getByTestId('window-reason-ws_northstar')).not.toBeEmpty();
  });

  test('advances the clock from the console', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('advance-day').click();
    await expect(page.getByTestId('clock-day')).toContainText('Day 1');
  });

  test('says why it is doing whatever it is doing to the SEPA account', async ({ page, request }) => {
    await advanceDays(request, 2);
    await page.goto('/');

    await expect(page.getByTestId(`decision-reason-${NORTHSTAR}`)).not.toBeEmpty();
    await expect(page.getByTestId(`payment-${NORTHSTAR}`)).toContainText('In flight');
  });
});
