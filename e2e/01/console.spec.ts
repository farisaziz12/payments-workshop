import { expect, test } from '@playwright/test';
import { resetLab, sendTraffic, setIncident } from './helpers';

/** The console itself: it has to show the incident, not just survive it. */
test.describe('the payments console', () => {
  test.beforeEach(async ({ request }) => {
    await resetLab(request);
  });

  test('shows a rate, a gateway table and a chaos panel', async ({ page, request }) => {
    await sendTraffic(request, 80);
    await page.goto('/');

    await expect(page.getByTestId('overall-rate')).toContainText('%');
    await expect(page.getByTestId('gateway-atlas')).toBeVisible();
    await expect(page.getByTestId('incident-card-de-atlas-unavailable')).toBeVisible();
    await expect(page.getByTestId('segment-card:DE:EUR')).toBeVisible();
  });

  test('shows an injected fault as active, and keeps reporting attempts', async ({ page, request }) => {
    await setIncident(request, 'card-de-atlas-unavailable', true);
    await sendTraffic(request, 200);
    await page.goto('/');

    // The panel is the record of what was broken on purpose, and the feed is the record of
    // what the orchestrator did about it. Both have to be legible while traffic is moving.
    await expect(page.getByTestId('incident-card-de-atlas-unavailable')).toBeChecked();
    await expect(page.getByTestId('attempt-row').first()).toBeVisible();
    await expect(page.getByTestId('segment-rate-card:DE:EUR')).toContainText('%');
  });

  test('resets from the chaos panel', async ({ page, request }) => {
    await sendTraffic(request, 60);
    await page.goto('/');

    await page.getByTestId('reset').click();
    await expect(page.getByTestId('ledger-captured')).toHaveText('0');
  });
});
