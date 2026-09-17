import { expect, test } from '@playwright/test';
import { CARD_DE, CARD_GB, SEPA_DE, attemptsOn, dashboard, resetLab, segmentOf, sendTraffic, setIncident } from './helpers';

/**
 * The game day itself, driven through the API.
 *
 * Every assertion is about what the orchestrator did with live traffic, which is the only
 * thing that matters here. The starter fails all of these, and the failures are readable:
 * traffic stays on a gateway that is turning it away, and SEPA debits go to gateways that
 * cannot take them.
 */
test.describe('routing under an incident', () => {
  test.beforeEach(async ({ request }) => {
    await resetLab(request);
  });

  test('moves German cards off the refusing gateway and recovers the segment', async ({ request }) => {
    await sendTraffic(request, 120);
    const before = segmentOf(await dashboard(request), CARD_DE);
    expect(before.successRate).toBeGreaterThan(0.8);

    await setIncident(request, 'card-de-atlas-unavailable', true);
    await sendTraffic(request, 200);

    const after = segmentOf(await dashboard(request), CARD_DE);
    expect(after.successRate).toBeGreaterThan(0.7);
    expect(after.degraded).toBe(false);
  });

  test('leaves sterling cards on the primary gateway while German cards move', async ({ request }) => {
    await setIncident(request, 'card-de-atlas-unavailable', true);
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

  test('keeps one charge on one idempotency key, however many gateways it takes', async ({ request }) => {
    await setIncident(request, 'card-de-atlas-unavailable', true);
    // A short burst, so every attempt it produces still fits in the feed the dashboard
    // returns. The retries worth reading happen before health has enough of a sample to
    // move German cards off Atlas.
    const state = await sendTraffic(request, 25);
    expect(state.recent.some((attempt) => attempt.retryOf)).toBe(true);

    // The key belongs to the charge, not to the attempt. A retry that mints a fresh one
    // turns a single payment into several as far as the gateways are concerned.
    const keysPerCharge = new Map<string, Set<string>>();
    for (const attempt of state.recent) {
      if (!attempt.gatewayId) continue;
      const keys = keysPerCharge.get(attempt.chargeId) ?? new Set<string>();
      keys.add(attempt.idempotencyKey);
      keysPerCharge.set(attempt.chargeId, keys);
    }

    for (const [chargeId, keys] of keysPerCharge) {
      expect([...keys], `charge ${chargeId} was sent under more than one key`).toHaveLength(1);
    }
  });
});
