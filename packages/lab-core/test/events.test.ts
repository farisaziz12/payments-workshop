import { beforeEach, describe, expect, it } from 'vitest';
import type { ProviderEvent } from '../src/contracts/index.js';
import {
  decideEntitlement,
  deliverDue,
  deliverEverythingNow,
  getScenario,
  getStore,
  handleProviderEvent,
  checkout,
  readTimeline,
  resetStore,
} from '../src/server/index.js';

const WORKSPACE = 'ws_test';

function startPayment(scenarioId: Parameters<typeof getScenario>[0], method: 'card' | 'bank_debit' = 'bank_debit') {
  getStore().scenarioId = scenarioId;
  const result = checkout({ purchaseId: 'pur_test', workspaceId: WORKSPACE, method });
  return result.payment;
}

function event(overrides: Partial<ProviderEvent> & { paymentId: string }): ProviderEvent {
  return {
    eventId: 'ev_manual',
    type: 'payment.succeeded',
    sequence: 2,
    occurredAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  resetStore();
});

describe('provider event rules', () => {
  it('applies a newer event and moves the payment forward', () => {
    const payment = startPayment('delayed-success');
    expect(payment.status).toBe('processing');

    const result = handleProviderEvent(event({ paymentId: payment.paymentId }));

    expect(result.outcome).toBe('applied');
    expect(getStore().payments.get(payment.paymentId)?.status).toBe('succeeded');
  });

  it('ignores a second delivery of the same event id', () => {
    const payment = startPayment('delayed-success');
    handleProviderEvent(event({ paymentId: payment.paymentId, eventId: 'ev_same' }));

    const repeat = handleProviderEvent(
      event({ paymentId: payment.paymentId, eventId: 'ev_same', type: 'payment.failed', sequence: 9 }),
    );

    expect(repeat.outcome).toBe('ignored_duplicate');
    expect(getStore().payments.get(payment.paymentId)?.status).toBe('succeeded');
  });

  it('ignores an older sequence that arrives after a newer one', () => {
    const payment = startPayment('delayed-success');
    handleProviderEvent(event({ paymentId: payment.paymentId, eventId: 'ev_new', sequence: 3 }));

    const stale = handleProviderEvent(
      event({ paymentId: payment.paymentId, eventId: 'ev_old', type: 'payment.processing', sequence: 2 }),
    );

    expect(stale.outcome).toBe('ignored_stale');
    expect(getStore().payments.get(payment.paymentId)?.status).toBe('succeeded');
  });

  it('treats a repeated sequence with a new event id as stale, not as an update', () => {
    const payment = startPayment('delayed-success');
    handleProviderEvent(event({ paymentId: payment.paymentId, eventId: 'ev_a', sequence: 2 }));

    const same = handleProviderEvent(
      event({ paymentId: payment.paymentId, eventId: 'ev_b', type: 'payment.failed', sequence: 2 }),
    );

    expect(same.outcome).toBe('ignored_stale');
    expect(getStore().payments.get(payment.paymentId)?.status).toBe('succeeded');
  });

  it('applies an event that skips a sequence instead of buffering it', () => {
    const payment = startPayment('delayed-success');

    const result = handleProviderEvent(event({ paymentId: payment.paymentId, sequence: 7 }));

    expect(result.outcome).toBe('applied');
    expect(getStore().payments.get(payment.paymentId)?.lastAppliedSequence).toBe(7);
  });

  it('applies a newer event after a terminal state rather than ignoring everything post-terminal', () => {
    const payment = startPayment('delayed-success');
    handleProviderEvent(event({ paymentId: payment.paymentId, eventId: 'ev_ok', sequence: 2 }));

    const later = handleProviderEvent(
      event({ paymentId: payment.paymentId, eventId: 'ev_later', type: 'payment.failed', sequence: 3 }),
    );

    expect(later.outcome).toBe('applied');
    expect(getStore().payments.get(payment.paymentId)?.status).toBe('failed');
  });

  it('rejects an event for a payment this server has never seen', () => {
    const result = handleProviderEvent(event({ paymentId: 'pay_nope' }));

    expect(result.outcome).toBe('rejected_unknown_payment');
    expect(readTimeline()[0]?.outcome).toBe('rejected_unknown_payment');
  });

  it('rejects an event whose type it does not understand', () => {
    const payment = startPayment('delayed-success');

    const result = handleProviderEvent({
      ...event({ paymentId: payment.paymentId }),
      type: 'payment.refunded' as never,
    });

    expect(result.outcome).toBe('rejected_unknown_type');
    expect(getStore().payments.get(payment.paymentId)?.status).toBe('processing');
  });

  it('records every decision in the timeline, including the ones that changed nothing', () => {
    const payment = startPayment('delayed-success');
    handleProviderEvent(event({ paymentId: payment.paymentId, eventId: 'ev_1', sequence: 2 }));
    handleProviderEvent(event({ paymentId: payment.paymentId, eventId: 'ev_1', sequence: 2 }));

    const outcomes = readTimeline()
      .map((entry) => entry.outcome)
      .filter(Boolean);

    expect(outcomes).toContain('applied');
    expect(outcomes).toContain('ignored_duplicate');
  });
});

describe('delivery', () => {
  it('delivers nothing before the due time and everything after it', () => {
    const payment = startPayment('delayed-success');
    expect(deliverDue(Date.now())).toBe(0);
    expect(getStore().payments.get(payment.paymentId)?.status).toBe('processing');

    expect(deliverDue(Date.now() + 10_000)).toBe(1);
    expect(getStore().payments.get(payment.paymentId)?.status).toBe('succeeded');
  });

  it('delivers due events in sequence order when they share a due time', () => {
    const payment = startPayment('out-of-order-event');
    deliverEverythingNow();

    const applied = readTimeline().filter((entry) => entry.outcome === 'applied');
    expect(getStore().payments.get(payment.paymentId)?.status).toBe('succeeded');
    expect(applied.length).toBeGreaterThan(0);
  });

  it('never delivers the same scheduled event twice', () => {
    const payment = startPayment('delayed-success');
    deliverDue(Date.now() + 10_000);
    expect(deliverDue(Date.now() + 20_000)).toBe(0);
    expect(getStore().payments.get(payment.paymentId)?.lastAppliedSequence).toBe(2);
  });

  it('keeps the newer state when a stale event is delivered afterwards', () => {
    const payment = startPayment('out-of-order-event');
    deliverEverythingNow();

    expect(getStore().payments.get(payment.paymentId)?.status).toBe('succeeded');
    expect(readTimeline().some((entry) => entry.outcome === 'ignored_stale')).toBe(true);
  });

  it('ignores the duplicate copy in the duplicate-event scenario', () => {
    const payment = startPayment('duplicate-event');
    deliverEverythingNow();

    expect(getStore().payments.get(payment.paymentId)?.status).toBe('succeeded');
    expect(readTimeline().some((entry) => entry.outcome === 'ignored_duplicate')).toBe(true);
  });
});

describe('checkout idempotency', () => {
  it('returns the same payment when the same purchase is submitted twice', () => {
    getStore().scenarioId = 'delayed-success';
    const first = checkout({ purchaseId: 'pur_1', workspaceId: WORKSPACE, method: 'bank_debit' });
    const second = checkout({ purchaseId: 'pur_1', workspaceId: WORKSPACE, method: 'bank_debit' });

    expect(second.replayed).toBe(true);
    expect(second.payment.paymentId).toBe(first.payment.paymentId);
    expect(getStore().payments.size).toBe(1);
  });

  it('allows a real retry after a failure', () => {
    getStore().scenarioId = 'instant-decline';
    const declined = checkout({ purchaseId: 'pur_2', workspaceId: WORKSPACE, method: 'card' });
    expect(declined.payment.status).toBe('failed');

    getStore().scenarioId = 'instant-success';
    const retry = checkout({ purchaseId: 'pur_2', workspaceId: WORKSPACE, method: 'card' });

    expect(retry.replayed).toBe(false);
    expect(retry.payment.paymentId).not.toBe(declined.payment.paymentId);
    expect(retry.payment.status).toBe('succeeded');
  });

  it('falls back to a matching scenario when the method and the scenario disagree', () => {
    getStore().scenarioId = 'instant-success';
    const result = checkout({ purchaseId: 'pur_3', workspaceId: WORKSPACE, method: 'bank_debit' });

    expect(result.payment.method).toBe('bank_debit');
    expect(result.payment.status).toBe('processing');
  });
});

describe('entitlement policy', () => {
  it('grants nothing before a payment exists', () => {
    expect(decideEntitlement(WORKSPACE)).toMatchObject({ access: 'none', reason: 'no_payment' });
  });

  it('grants nothing while the payment is processing', () => {
    startPayment('delayed-success');
    expect(decideEntitlement(WORKSPACE)).toMatchObject({ access: 'none', reason: 'payment_processing' });
  });

  it('grants nothing when the payment failed', () => {
    startPayment('instant-decline', 'card');
    expect(decideEntitlement(WORKSPACE)).toMatchObject({ access: 'none', reason: 'payment_failed' });
  });

  it('grants access once a succeeded payment exists for this workspace', () => {
    const payment = startPayment('instant-success', 'card');
    expect(decideEntitlement(WORKSPACE)).toMatchObject({
      access: 'active',
      reason: 'payment_succeeded',
      grantedByPaymentId: payment.paymentId,
    });
  });

  it('grants nothing to a different workspace', () => {
    startPayment('instant-success', 'card');
    expect(decideEntitlement('ws_someone_else')).toMatchObject({ access: 'none', reason: 'no_payment' });
  });

  it('refuses a succeeded payment whose purchase belongs to another workspace', () => {
    const payment = startPayment('instant-success', 'card');
    const purchase = getStore().purchases.get(payment.purchaseId);
    if (purchase) purchase.workspaceId = 'ws_elsewhere';

    expect(decideEntitlement(WORKSPACE)).toMatchObject({
      access: 'none',
      reason: 'payment_for_other_workspace',
    });
  });

  it('turns access on only after the delayed event lands', () => {
    startPayment('delayed-success');
    expect(decideEntitlement(WORKSPACE).access).toBe('none');

    deliverEverythingNow();

    expect(decideEntitlement(WORKSPACE).access).toBe('active');
  });

  it('leaves access off when the delayed payment ends in a failure', () => {
    startPayment('delayed-failure');
    deliverEverythingNow();

    expect(decideEntitlement(WORKSPACE)).toMatchObject({ access: 'none', reason: 'payment_failed' });
  });
});

describe('reset', () => {
  it('clears purchases, payments, events and the timeline', () => {
    startPayment('delayed-success');
    resetStore();

    expect(getStore().payments.size).toBe(0);
    expect(getStore().purchases.size).toBe(0);
    expect(readTimeline()).toHaveLength(0);
    expect(decideEntitlement(WORKSPACE).access).toBe('none');
  });

  it('is repeatable: the same scenario produces the same result twice', () => {
    const runOnce = () => {
      resetStore();
      const payment = startPayment('delayed-success');
      deliverEverythingNow();
      return getStore().payments.get(payment.paymentId)?.status;
    };

    expect(runOnce()).toBe('succeeded');
    expect(runOnce()).toBe('succeeded');
  });
});
