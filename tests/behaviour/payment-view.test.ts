/**
 * [TODO 1] Does the checkout screen describe what the server actually said?
 *
 * These run against whichever app the vitest project points at:
 *   pnpm test            the solution. Must pass.
 *   pnpm test:exercise   the starter. Fails until TODO 1 is done, on purpose.
 */
import { describe, expect, it } from 'vitest';
import type { ApiResult, Payment, PaymentStatus } from '@bigpdf/lab-core/contracts';
import { toCustomerView } from '@lab/app/lab/paymentView';

function payment(status: PaymentStatus, overrides: Partial<Payment> = {}): ApiResult<Payment> {
  return {
    ok: true,
    data: {
      paymentId: 'pay_1',
      purchaseId: 'pur_1',
      workspaceId: 'ws_northstar',
      method: status === 'processing' ? 'bank_debit' : 'card',
      amountMinor: 2000,
      currency: 'EUR',
      status,
      lastAppliedSequence: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    },
  };
}

describe('[TODO 1] the customer sees the payment state the server reported', () => {
  it('shows a payment that succeeded as paid, and stops polling', () => {
    const view = toCustomerView(payment('succeeded'));

    expect(view.tone).toBe('success');
    expect(view.keepPolling).toBe(false);
  });

  it('does not call a processing payment paid', () => {
    const view = toCustomerView(payment('processing'));

    expect(view.tone).not.toBe('success');
    expect(view.tone).toBe('pending');
  });

  it('keeps asking the server while a payment is processing', () => {
    expect(toCustomerView(payment('processing')).keepPolling).toBe(true);
  });

  it('does not offer a retry button while a payment is processing', () => {
    expect(toCustomerView(payment('processing')).canRetry).toBe(false);
  });

  it('treats a payment waiting on the customer’s bank as pending, not paid', () => {
    const view = toCustomerView(payment('requires_action'));

    expect(view.tone).toBe('pending');
    expect(view.keepPolling).toBe(true);
  });

  it('shows a declined payment as a failure and offers a retry', () => {
    const view = toCustomerView(payment('failed', { failureCode: 'card_declined' }));

    expect(view.tone).toBe('failure');
    expect(view.canRetry).toBe(true);
    expect(view.keepPolling).toBe(false);
  });
});

describe('[TODO 1] a request that never came back is not a failed payment', () => {
  const unanswered: Array<[string, ApiResult<Payment>]> = [
    ['a timeout', { ok: false, kind: 'timeout' }],
    ['a dropped connection', { ok: false, kind: 'network' }],
  ];

  it.each(unanswered)('does not report %s as a failed payment', (_label, result) => {
    expect(toCustomerView(result).tone).not.toBe('failure');
  });

  it.each(unanswered)('marks %s as an unknown outcome', (_label, result) => {
    expect(toCustomerView(result).tone).toBe('unknown');
  });

  it.each(unanswered)('keeps asking the server after %s', (_label, result) => {
    expect(toCustomerView(result).keepPolling).toBe(true);
  });

  it.each(unanswered)('does not invite a retry after %s, which could pay twice', (_label, result) => {
    expect(toCustomerView(result).canRetry).toBe(false);
  });

  it('never tells the customer their payment failed when we simply do not know', () => {
    const view = toCustomerView({ ok: false, kind: 'timeout' });

    expect(view.title.toLowerCase()).not.toContain('did not go through');
    expect(view.title.toLowerCase()).not.toContain('declined');
  });
});
