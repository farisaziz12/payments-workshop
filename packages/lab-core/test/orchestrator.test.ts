import { beforeEach, describe, expect, it } from 'vitest';
import type { RetryInput, RetryPlan, RoutingDecision, RoutingInput, Segment } from '../src/contracts/index';
import { sendToGateway } from '../src/server/gateways';
import { MAX_ATTEMPTS, burst, runCharge, type LabPolicy } from '../src/server/orchestrator';
import { getStore, resetStore } from '../src/server/store';

const CARD_DE: Segment = { method: 'card', country: 'DE', currency: 'EUR' };
const SEPA_DE: Segment = { method: 'sepa_debit', country: 'DE', currency: 'EUR' };

/** A policy that always sends everything to one gateway and never retries. */
const straightTo = (gatewayId: RoutingDecision['gatewayId']): LabPolicy => ({
  chooseGateway: (): RoutingDecision => ({ gatewayId, reason: 'test' }),
  planRetry: (): RetryPlan => ({ retry: false, reason: 'test' }),
});

beforeEach(() => {
  resetStore();
});

describe('the gateway simulator keeps its promises about idempotency', () => {
  it('returns the original capture when the same key comes back', () => {
    const first = sendToGateway({
      gatewayId: 'atlas',
      segment: CARD_DE,
      chargeId: 'chg_1',
      idempotencyKey: 'idem_1',
      amountMinor: 2000,
    });
    // Whatever the first attempt did, a repeat on the same key must not charge again.
    const second = sendToGateway({
      gatewayId: 'atlas',
      segment: CARD_DE,
      chargeId: 'chg_1',
      idempotencyKey: 'idem_1',
      amountMinor: 2000,
    });

    if (first.outcome === 'succeeded') {
      expect(second.deduplicated).toBe(true);
      expect(getStore().ledger.captured).toBe(1);
    }
  });

  it('never takes the money on a failure', () => {
    // The whole retry policy rests on this. A failed attempt has to leave the payment
    // exactly where it was, or "send it somewhere else" is a coin toss with a customer.
    getStore().activeIncidents.add('card-de-atlas-unavailable');

    for (let index = 0; index < 60; index += 1) {
      const response = sendToGateway({
        gatewayId: 'atlas',
        segment: CARD_DE,
        chargeId: `chg_${index}`,
        idempotencyKey: `idem_${index}`,
        amountMinor: 2000,
      });
      if (response.outcome === 'failed') {
        expect(getStore().captures.has(`idem_${index}`)).toBe(false);
      }
    }

    const failures = 60 - getStore().ledger.captured;
    expect(failures).toBeGreaterThan(0);
    expect(getStore().ledger.capturedMinor).toBe(getStore().ledger.captured * 2000);
  });

  it('refuses a method it does not support, and counts it as misrouted', () => {
    const response = sendToGateway({
      gatewayId: 'atlas',
      segment: SEPA_DE,
      chargeId: 'chg_1',
      idempotencyKey: 'idem_1',
      amountMinor: 2000,
    });

    expect(response.outcome).toBe('failed');
    expect(response.failureCode).toBe('unsupported_method');
    expect(getStore().ledger.misrouted).toBe(1);
  });
});

describe('the orchestrator does what the policy says, within limits', () => {
  it('records an unrouted attempt when the policy routes nowhere', () => {
    runCharge(straightTo(null), CARD_DE);

    const attempts = getStore().attempts;
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.outcome).toBe('no_route');
    expect(getStore().ledger.abandoned).toBe(1);
  });

  it('stops at the ceiling even when the policy always says retry', () => {
    const alwaysRetry: LabPolicy = {
      chooseGateway: (): RoutingDecision => ({ gatewayId: 'atlas', reason: 'test' }),
      planRetry: (input: RetryInput): RetryPlan => ({
        retry: true,
        gatewayId: 'atlas',
        idempotencyKey: input.attempt.idempotencyKey,
        reason: 'test',
      }),
    };

    // Force failures by sending a method Atlas cannot take.
    runCharge(alwaysRetry, SEPA_DE);
    expect(getStore().attempts.length).toBeLessThanOrEqual(MAX_ATTEMPTS);
  });

  it('catches a policy that throws and says so on the attempt', () => {
    const broken: LabPolicy = {
      chooseGateway: (_input: RoutingInput): RoutingDecision => {
        throw new Error('undefined is not a function');
      },
      planRetry: (): RetryPlan => ({ retry: false, reason: 'test' }),
    };

    runCharge(broken, CARD_DE);
    const attempt = getStore().attempts[0];
    expect(attempt?.outcome).toBe('no_route');
    expect(attempt?.reason).toContain('chooseGateway threw');
  });
});

describe('the run is deterministic', () => {
  it('produces the same outcomes from the same seed', () => {
    const policy = straightTo('atlas');
    burst(policy, 40);
    const first = getStore().attempts.map((attempt) => `${attempt.outcome}:${attempt.failureCode ?? ''}`);

    resetStore();
    burst(policy, 40);
    const second = getStore().attempts.map((attempt) => `${attempt.outcome}:${attempt.failureCode ?? ''}`);

    expect(second).toEqual(first);
  });
});
