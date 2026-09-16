import { describe, expect, it } from 'vitest';
import type { Attempt, FailureCode, GatewayId, HealthSnapshot, Segment } from '@bigpdf/lab-core/contracts';
import { GATEWAYS, MAX_ATTEMPTS } from '@bigpdf/lab-core/server';
import { planRetry } from '@lab/01/lab/retryPolicy';
import { CARD_DE, SEPA_DE, healthy } from './fixtures';

const KEY = 'idem_chg_original';

function failed(input: {
  segment?: Segment;
  gatewayId?: GatewayId;
  failureCode: FailureCode;
}): Attempt {
  return {
    attemptId: 'att_1',
    chargeId: 'chg_1',
    idempotencyKey: KEY,
    segment: input.segment ?? CARD_DE,
    amountMinor: 2000,
    gatewayId: input.gatewayId ?? 'atlas',
    outcome: 'failed',
    failureCode: input.failureCode,
    reason: 'fixture',
    feeMinor: 0,
    at: new Date().toISOString(),
    sequence: 1,
  };
}

function plan(input: {
  failureCode: FailureCode;
  segment?: Segment;
  gatewayId?: GatewayId;
  tried?: GatewayId[];
  attemptsSoFar?: number;
  health?: HealthSnapshot;
}) {
  const attempt = failed(input);
  return planRetry({
    attempt,
    failureCode: input.failureCode,
    gateways: GATEWAYS,
    health: input.health ?? healthy(),
    tried: input.tried ?? [attempt.gatewayId as GatewayId],
    attemptsSoFar: input.attemptsSoFar ?? 1,
    maxAttempts: MAX_ATTEMPTS,
  });
}

describe('[Task 2] a decided failure is never retried somewhere else', () => {
  const hard: FailureCode[] = ['issuer_declined', 'insufficient_funds', 'expired_card', 'invalid_account'];

  for (const failureCode of hard) {
    it(`does not retry ${failureCode}`, () => {
      expect(plan({ failureCode }).retry).toBe(false);
    });
  }

  it('does not retry a payment that was sent somewhere unable to accept it', () => {
    // The gateway did not fail. The routing did. Retrying treats a bug as weather.
    expect(plan({ failureCode: 'unsupported_method' }).retry).toBe(false);
  });

  it('explains why it stopped', () => {
    const result = plan({ failureCode: 'issuer_declined' });
    expect(result.reason.trim().length).toBeGreaterThan(0);
  });
});

describe('[Task 2] a technical failure is retried, carefully', () => {
  it('retries a timeout', () => {
    expect(plan({ failureCode: 'gateway_timeout' }).retry).toBe(true);
  });

  it('retries somewhere other than the gateway that just failed', () => {
    const result = plan({ failureCode: 'gateway_timeout', gatewayId: 'atlas', tried: ['atlas'] });
    expect(result.retry).toBe(true);
    if (result.retry) expect(result.gatewayId).not.toBe('atlas');
  });

  it('reuses the original idempotency key', () => {
    // A gateway that timed out may already have the money. The same key gets that capture
    // back. A fresh key takes it again, and the customer is the one who notices.
    const result = plan({ failureCode: 'gateway_timeout' });
    expect(result.retry).toBe(true);
    if (result.retry) expect(result.idempotencyKey).toBe(KEY);
  });

  it('retries a gateway that is unavailable, and one that is rate limiting', () => {
    expect(plan({ failureCode: 'gateway_unavailable' }).retry).toBe(true);
    expect(plan({ failureCode: 'rate_limited' }).retry).toBe(true);
  });

  it('gives up when there is nowhere else to send it', () => {
    // SEPA has exactly one gateway. Once it has been tried, a retry has no destination.
    const result = plan({
      failureCode: 'gateway_unavailable',
      segment: SEPA_DE,
      gatewayId: 'borealis',
      tried: ['borealis'],
    });
    expect(result.retry).toBe(false);
  });

  it('stops at the attempt ceiling', () => {
    const result = plan({ failureCode: 'gateway_timeout', attemptsSoFar: MAX_ATTEMPTS });
    expect(result.retry).toBe(false);
  });
});
