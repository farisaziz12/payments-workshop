import { describe, expect, it } from 'vitest';
import type { Invoice, PaymentMethod } from '@bigpdf/lab-core/contracts';
import { CARD_GRACE_HOURS } from '@bigpdf/lab-core/contracts';
import { graceWindowFor } from '@lab/02/lab/graceWindow';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Day zero of the lab. A Monday, which is the case a calendar day version gets wrong. */
const MONDAY = Date.parse('2026-03-02T09:00:00.000Z');

function invoice(method: PaymentMethod, at: number = MONDAY): Invoice {
  const iso = new Date(at).toISOString();
  return {
    invoiceId: 'inv_test',
    workspaceId: 'ws_test',
    workspaceName: 'Test',
    amountMinor: 2000,
    currency: 'EUR',
    method,
    dueAt: iso,
    submittedAt: iso,
    paymentState: 'submitted',
    stage: 'none',
  };
}

const deadlineOf = (method: PaymentMethod, at?: number): number =>
  Date.parse(graceWindowFor(invoice(method, at)).deadline);

describe('[Task 1] a card gets the short window', () => {
  it('gives a card 24 hours after the due date', () => {
    expect(deadlineOf('card')).toBe(MONDAY + CARD_GRACE_HOURS * HOUR_MS);
  });

  it('explains the window it chose', () => {
    expect(graceWindowFor(invoice('card')).reason.trim().length).toBeGreaterThan(0);
  });
});

describe('[Task 1] a SEPA debit gets the window the scheme actually allows', () => {
  it('waits substantially longer than a card', () => {
    expect(deadlineOf('sepa_debit')).toBeGreaterThan(deadlineOf('card'));
  });

  it('gives a Monday debit until the following Monday', () => {
    // Five business days from Monday 2 March is Monday 9 March. A calendar day version
    // lands on Saturday 7 March, two days early, and those are two days in which the bank
    // could still have confirmed.
    const deadline = deadlineOf('sepa_debit');
    expect(deadline).toBeGreaterThanOrEqual(Date.parse('2026-03-09T00:00:00.000Z'));
    expect(deadline).toBeLessThan(Date.parse('2026-03-10T00:00:00.000Z'));
  });

  it('skips the weekend for a debit submitted mid week', () => {
    // Thursday 5 March plus five business days is Thursday 12 March.
    const thursday = Date.parse('2026-03-05T09:00:00.000Z');
    const deadline = deadlineOf('sepa_debit', thursday);
    expect(deadline).toBeGreaterThanOrEqual(Date.parse('2026-03-12T00:00:00.000Z'));
    expect(deadline).toBeLessThan(Date.parse('2026-03-13T00:00:00.000Z'));
  });

  it('never lands on a Saturday or a Sunday', () => {
    for (let offset = 0; offset < 7; offset += 1) {
      const submitted = MONDAY + offset * DAY_MS;
      const weekday = new Date(deadlineOf('sepa_debit', submitted)).getUTCDay();
      expect(weekday).not.toBe(0);
      expect(weekday).not.toBe(6);
    }
  });

  it('is never shorter than the card window', () => {
    // A rail that answers later cannot justify less patience than one that answers now.
    for (let offset = 0; offset < 7; offset += 1) {
      const submitted = MONDAY + offset * DAY_MS;
      expect(deadlineOf('sepa_debit', submitted)).toBeGreaterThanOrEqual(deadlineOf('card', submitted));
    }
  });

  it('says why the window is that long', () => {
    expect(graceWindowFor(invoice('sepa_debit')).reason.trim().length).toBeGreaterThan(0);
  });
});
