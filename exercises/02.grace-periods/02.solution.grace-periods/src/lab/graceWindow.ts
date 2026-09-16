/**
 * How long do we wait before we decide someone has not paid?
 *
 * The window is a property of the payment rail, not of the customer or of the invoice.
 * That is the whole idea, and every other line here follows from it.
 *
 * A card authorises inside the request. Whatever it was going to do, it has done, so 24
 * hours after the due date is already generous.
 *
 * A SEPA direct debit is submitted and then waits. The payer's bank has up to five
 * business days to send it back. Before that window closes, silence is what a working
 * payment sounds like, and treating silence as non-payment suspends people who paid.
 */
import type { GraceWindow, Invoice } from '@bigpdf/lab-core/contracts';
import { CARD_GRACE_HOURS, SEPA_RETURN_BUSINESS_DAYS } from '@bigpdf/lab-core/contracts';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function graceWindowFor(invoice: Invoice): GraceWindow {
  const cardDeadline = Date.parse(invoice.dueAt) + CARD_GRACE_HOURS * HOUR_MS;

  if (invoice.method === 'card') {
    return {
      deadline: new Date(cardDeadline).toISOString(),
      reason: `A card answers in the request, so ${CARD_GRACE_HOURS} hours after the due date`,
    };
  }

  // Measured from submission, because that is when the bank's clock starts, not from the
  // invoice date. They are the same day here, and in production they are often not.
  const sepaDeadline = addBusinessDays(Date.parse(invoice.submittedAt), SEPA_RETURN_BUSINESS_DAYS);

  // Never shorter than the card window. A rail that answers later cannot justify less
  // patience than one that answers immediately.
  const deadline = Math.max(sepaDeadline, cardDeadline);

  return {
    deadline: new Date(deadline).toISOString(),
    reason: `A SEPA debit can be returned for ${SEPA_RETURN_BUSINESS_DAYS} business days after submission`,
  };
}

/**
 * Add business days, skipping Saturday and Sunday.
 *
 * Day 0 of this lab is a Monday, which is the case that catches a calendar day version:
 * five calendar days lands on the Saturday, two days early, and those two days are the
 * ones where a bank could still have confirmed.
 *
 * Bank holidays are a further complication and this lab ignores them. Production code
 * should not: a scheme calendar is a real dependency, and the direction of the error is
 * always against the customer.
 */
function addBusinessDays(from: number, days: number): number {
  let cursor = from;
  let remaining = days;

  while (remaining > 0) {
    cursor += DAY_MS;
    const weekday = new Date(cursor).getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    if (!isWeekend) remaining -= 1;
  }

  return cursor;
}
