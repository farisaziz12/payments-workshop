import { expect, test } from '@playwright/test';
import { CARD_DE, CARD_GB, SEPA_DE, attemptsOn, dashboard, resetLab, segmentOf, sendTraffic, setIncident } from './helpers';

/**
 * The game day itself, driven through the API.
 *
 * Every assertion is about what the orchestrator did with live traffic, which is the only
 * thing that matters here. The starter fails all of these, and the failures are readable:
 * traffic stays on a gateway that is timing out, and money gets taken twice.
 */
test.describe('routing under an incident', () => {
  test.beforeEach(async ({ request }) => {
    await resetLab(request);
  });

  test('moves German cards off the failing gateway and recovers the segment', async ({ request }) => {
    await sendTraffic(request, 120);
    const before = segmentOf(await dashboard(request), CARD_DE);
    expect(before.successRate).toBeGreaterThan(0.8);

    await setIncident(request, 'card-de-atlas-timeout', true);
    await sendTraffic(request, 200);

    const after = segmentOf(await dashboard(request), CARD_DE);
    expect(after.successRate).toBeGreaterThan(0.7);
    expect(after.degraded).toBe(false);
  });

  test('leaves sterling cards on the primary gateway while German cards move', async ({ request }) => {
    await setIncident(request, 'card-de-atlas-timeout', true);
    await sendTraffic(request, 300);
    const state = await dashboard(request);

    // The segment that was never in trouble should not have been moved anywhere.
    expect(attemptsOn(state, CARD_GB, 'atlas')).toBeGreaterThan(0);
    expect(attemptsOn(state, CARD_GB, 'cirrus')).toBe(0);
  });

  test('never sends a SEPA debit to a gateway that cannot take it', async ({ request }) => {
    await sendTraffic(request, 200);
    const state = await dashboard(request);

    expect(attemptsOn(state, SEPA_DE, 'atlas')).toBe(0);
    expect(attemptsOn(state, SEPA_DE, 'cirrus')).toBe(0);
    expect(state.ledger.misrouted).toBe(0);
  });

  test('does not charge anyone twice when a gateway times out', async ({ request }) => {
    await setIncident(request, 'card-de-atlas-timeout', true);
    await sendTraffic(request, 300);

    const state = await dashboard(request);
    expect(state.ledger.duplicateCaptures).toBe(0);
  });
});
