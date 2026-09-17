/**
 * Health fixtures, built by running synthetic attempts through the real aggregator.
 *
 * Hand-writing a `HealthSnapshot` would let the fixtures drift away from what the server
 * actually produces, and then the tests would be checking a story rather than the lab.
 */
import type { Attempt, FailureCode, GatewayId, HealthSnapshot, Segment } from '@bigpdf/lab-core/contracts';
import { summariseHealth } from '@bigpdf/lab-core/server';

export const CARD_DE: Segment = { method: 'card', country: 'DE', currency: 'EUR' };
export const CARD_GB: Segment = { method: 'card', country: 'GB', currency: 'GBP' };
export const SEPA_DE: Segment = { method: 'sepa_debit', country: 'DE', currency: 'EUR' };

export const NOW = Date.parse('2026-03-02T10:00:00.000Z');

let counter = 0;

export function attempt(input: {
  segment: Segment;
  gatewayId: GatewayId;
  outcome: 'succeeded' | 'failed';
  failureCode?: FailureCode;
}): Attempt {
  counter += 1;
  return {
    attemptId: `att_${counter}`,
    chargeId: `chg_${counter}`,
    idempotencyKey: `idem_chg_${counter}`,
    segment: input.segment,
    amountMinor: 2000,
    gatewayId: input.gatewayId,
    outcome: input.outcome,
    failureCode: input.failureCode,
    reason: 'fixture',
    feeMinor: 0,
    at: new Date(NOW - 1000).toISOString(),
    sequence: counter,
  };
}

export function repeat(count: number, build: () => Attempt): Attempt[] {
  return Array.from({ length: count }, build);
}

/** Traffic where everything is fine. */
export function healthy(): HealthSnapshot {
  return summariseHealth(
    [
      ...repeat(20, () => attempt({ segment: CARD_DE, gatewayId: 'atlas', outcome: 'succeeded' })),
      ...repeat(20, () => attempt({ segment: CARD_GB, gatewayId: 'atlas', outcome: 'succeeded' })),
      ...repeat(20, () => attempt({ segment: SEPA_DE, gatewayId: 'borealis', outcome: 'succeeded' })),
    ],
    NOW,
  );
}

/**
 * Atlas is refusing German cards and nothing else.
 *
 * Note what this does to Atlas overall: its global success rate drops well below the
 * degraded threshold even though British cards on Atlas are untouched. That gap is the
 * whole point of the fixture.
 */
export function atlasBrokenForGermanCards(): HealthSnapshot {
  return summariseHealth(
    [
      ...repeat(20, () =>
        attempt({
          segment: CARD_DE,
          gatewayId: 'atlas',
          outcome: 'failed',
          failureCode: 'gateway_unavailable',
        }),
      ),
      ...repeat(16, () => attempt({ segment: CARD_GB, gatewayId: 'atlas', outcome: 'succeeded' })),
      ...repeat(20, () => attempt({ segment: SEPA_DE, gatewayId: 'borealis', outcome: 'succeeded' })),
    ],
    NOW,
  );
}

/** Borealis is dropping German SEPA debits, and it is the only gateway that takes SEPA. */
export function borealisBrokenForSepa(): HealthSnapshot {
  return summariseHealth(
    [
      ...repeat(20, () =>
        attempt({
          segment: SEPA_DE,
          gatewayId: 'borealis',
          outcome: 'failed',
          failureCode: 'gateway_unavailable',
        }),
      ),
      ...repeat(20, () => attempt({ segment: CARD_DE, gatewayId: 'atlas', outcome: 'succeeded' })),
    ],
    NOW,
  );
}

/** No traffic at all. Every decision has to survive knowing nothing. */
export function empty(): HealthSnapshot {
  return summariseHealth([], NOW);
}
