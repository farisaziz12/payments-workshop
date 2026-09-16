import { describe, expect, it } from 'vitest';
import type { DunningStage, Invoice, InvoicePaymentState, PaymentMethod } from '@bigpdf/lab-core/contracts';
import { REMINDER_TO_SUSPENSION_DAYS } from '@bigpdf/lab-core/contracts';
import { decideDunning } from '@lab/02/lab/dunningDecision';
import { graceWindowFor } from '@lab/02/lab/graceWindow';

const DAY_MS = 24 * 60 * 60 * 1000;
const MONDAY = Date.parse('2026-03-02T09:00:00.000Z');

function invoice(overrides: {
  method?: PaymentMethod;
  paymentState?: InvoicePaymentState;
  stage?: DunningStage;
  returnedOnDay?: number;
  paidOnDay?: number;
}): Invoice {
  const iso = new Date(MONDAY).toISOString();
  return {
    invoiceId: 'inv_test',
    workspaceId: 'ws_test',
    workspaceName: 'Test',
    amountMinor: 2000,
    currency: 'EUR',
    method: overrides.method ?? 'sepa_debit',
    dueAt: iso,
    submittedAt: iso,
    paymentState: overrides.paymentState ?? 'submitted',
    stage: overrides.stage ?? 'none',
    returnedAt:
      overrides.returnedOnDay === undefined
        ? undefined
        : new Date(MONDAY + overrides.returnedOnDay * DAY_MS).toISOString(),
    returnReason: overrides.returnedOnDay === undefined ? undefined : 'insufficient_funds',
    paidAt:
      overrides.paidOnDay === undefined ? undefined : new Date(MONDAY + overrides.paidOnDay * DAY_MS).toISOString(),
  };
}

/**
 * Decide on a given day, using whatever window `graceWindowFor` produces.
 *
 * The two tasks are deliberately wired together here: a dunning policy that ignores the
 * window it was handed cannot be rescued by getting the window right.
 */
function on(day: number, overrides: Parameters<typeof invoice>[0]) {
  const target = invoice(overrides);
  return decideDunning({
    invoice: target,
    now: MONDAY + day * DAY_MS,
    window: graceWindowFor(target),
  });
}

describe('[Task 2] a payment still in flight is left alone', () => {
  it('does nothing to a SEPA debit on day 2', () => {
    // The money is in transit and no bank has said otherwise. This is the one that
    // suspends paying customers in production.
    expect(on(2, {}).action).toBe('wait');
  });

  it('does nothing to a SEPA debit on day 4, still inside the window', () => {
    expect(on(4, {}).action).toBe('wait');
  });

  it('explains why it is waiting', () => {
    expect(on(2, {}).reason.trim().length).toBeGreaterThan(0);
  });

  it('leaves a card alone before its window closes', () => {
    expect(on(0, { method: 'card' }).action).toBe('wait');
  });
});

describe('[Task 2] a decided failure is acted on, whatever the window says', () => {
  it('reminds a returned debit on the day the bank returned it', () => {
    // The window existed to find out whether the bank would return it. It has. Sitting on
    // that answer until day 7 is not caution, it is a slow response to a known problem.
    expect(on(2, { paymentState: 'returned', returnedOnDay: 2 }).action).toBe('remind');
  });

  it('suspends a returned debit once the reminder has had its days', () => {
    const day = 2 + REMINDER_TO_SUSPENSION_DAYS;
    expect(on(day, { paymentState: 'returned', returnedOnDay: 2, stage: 'reminded' }).action).toBe('suspend');
  });

  it('reminds a declined card once its 24 hours are up', () => {
    expect(on(2, { method: 'card', paymentState: 'returned', returnedOnDay: 0 }).action).toBe('remind');
  });
});

describe('[Task 2] the window closing with no answer escalates, in stages', () => {
  it('reminds rather than suspending the first time', () => {
    expect(on(8, {}).action).toBe('remind');
  });

  it('does not suspend an account the same day it was reminded', () => {
    expect(on(8, { stage: 'reminded' }).action).toBe('wait');
  });

  it('suspends once the reminder has had its days', () => {
    expect(on(20, { stage: 'reminded' }).action).toBe('suspend');
  });

  it('says something a support agent could read out loud', () => {
    expect(on(20, { stage: 'reminded' }).reason.trim().length).toBeGreaterThan(0);
  });
});

describe('[Task 2] money arriving undoes the damage', () => {
  it('clears dunning when a late payment confirms', () => {
    expect(on(6, { paymentState: 'paid', paidOnDay: 5, stage: 'suspended' }).action).toBe('clear');
  });

  it('leaves a paid account that was never chased alone', () => {
    expect(on(6, { paymentState: 'paid', paidOnDay: 4 }).action).toBe('wait');
  });
});
