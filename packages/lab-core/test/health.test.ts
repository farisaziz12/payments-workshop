import { describe, expect, it } from 'vitest';
import type { Attempt, FailureCode, GatewayId, Segment } from '../src/contracts/index';
import { segmentHealthFor } from '../src/contracts/index';
import { summariseHealth, HEALTH_WINDOW_MS } from '../src/server/health';

const CARD_DE: Segment = { method: 'card', country: 'DE', currency: 'EUR' };
const CARD_GB: Segment = { method: 'card', country: 'GB', currency: 'GBP' };

const NOW = Date.parse('2026-03-02T10:00:00.000Z');

let counter = 0;

function attempt(input: {
  segment: Segment;
  gatewayId: GatewayId;
  outcome: 'succeeded' | 'failed';
  failureCode?: FailureCode;
  ageMs?: number;
}): Attempt {
  counter += 1;
  return {
    attemptId: `att_${counter}`,
    chargeId: `chg_${counter}`,
    idempotencyKey: `idem_${counter}`,
    segment: input.segment,
    amountMinor: 2000,
    gatewayId: input.gatewayId,
    outcome: input.outcome,
    failureCode: input.failureCode,
    reason: 'test',
    feeMinor: 0,
    at: new Date(NOW - (input.ageMs ?? 1000)).toISOString(),
    sequence: counter,
  };
}

const many = (count: number, build: () => Attempt): Attempt[] => Array.from({ length: count }, build);

describe('health only counts what is inside the window', () => {
  it('ignores attempts older than the window', () => {
    const snapshot = summariseHealth(
      [
        ...many(10, () => attempt({ segment: CARD_DE, gatewayId: 'atlas', outcome: 'succeeded' })),
        ...many(10, () =>
          attempt({
            segment: CARD_DE,
            gatewayId: 'atlas',
            outcome: 'failed',
            failureCode: 'gateway_unavailable',
            ageMs: HEALTH_WINDOW_MS + 5000,
          }),
        ),
      ],
      NOW,
    );

    expect(snapshot.attempts).toBe(10);
    expect(snapshot.overallSuccessRate).toBe(1);
  });

  it('reports a full rate when there is nothing to report', () => {
    const snapshot = summariseHealth([], NOW);
    expect(snapshot.attempts).toBe(0);
    expect(snapshot.overallSuccessRate).toBe(1);
  });
});

describe('health refuses to call an outage on a thin sample', () => {
  it('marks a small run of failures as too few attempts rather than degraded', () => {
    const snapshot = summariseHealth(
      many(3, () =>
        attempt({
          segment: CARD_DE,
          gatewayId: 'atlas',
          outcome: 'failed',
          failureCode: 'gateway_unavailable',
        }),
      ),
      NOW,
    );

    const segment = snapshot.segments.find((entry) => entry.key === 'card:DE:EUR');
    expect(segment?.thinSample).toBe(true);
    expect(segment?.degraded).toBe(false);
  });

  it('calls it degraded once the sample is big enough', () => {
    const snapshot = summariseHealth(
      many(20, () =>
        attempt({
          segment: CARD_DE,
          gatewayId: 'atlas',
          outcome: 'failed',
          failureCode: 'gateway_unavailable',
        }),
      ),
      NOW,
    );

    const segment = snapshot.segments.find((entry) => entry.key === 'card:DE:EUR');
    expect(segment?.degraded).toBe(true);
    expect(segment?.thinSample).toBe(false);
  });
});

describe('the global gateway number is not the segment number', () => {
  it('shows a gateway as degraded overall while one of its segments is untouched', () => {
    const snapshot = summariseHealth(
      [
        ...many(20, () =>
          attempt({
            segment: CARD_DE,
            gatewayId: 'atlas',
            outcome: 'failed',
            failureCode: 'gateway_unavailable',
          }),
        ),
        ...many(16, () => attempt({ segment: CARD_GB, gatewayId: 'atlas', outcome: 'succeeded' })),
      ],
      NOW,
    );

    const global = snapshot.gateways.find((entry) => entry.gatewayId === 'atlas');
    expect(global?.degraded).toBe(true);

    // The same gateway, measured inside the segment that is fine.
    const gb = segmentHealthFor(snapshot, CARD_GB);
    const atlasForGb = gb?.gateways.find((entry) => entry.gatewayId === 'atlas');
    expect(atlasForGb?.successRate).toBe(1);
    expect(atlasForGb?.degraded).toBe(false);
  });

  it('counts technical failures separately from decided ones', () => {
    const snapshot = summariseHealth(
      [
        ...many(10, () =>
          attempt({
            segment: CARD_DE,
            gatewayId: 'atlas',
            outcome: 'failed',
            failureCode: 'gateway_unavailable',
          }),
        ),
        ...many(10, () =>
          attempt({
            segment: CARD_DE,
            gatewayId: 'atlas',
            outcome: 'failed',
            failureCode: 'issuer_declined',
          }),
        ),
      ],
      NOW,
    );

    const atlas = snapshot.gateways.find((entry) => entry.gatewayId === 'atlas');
    expect(atlas?.attempts).toBe(20);
    expect(atlas?.technicalFailures).toBe(10);
  });
});
