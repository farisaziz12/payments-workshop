/**
 * How long do we wait before we decide someone has not paid?
 *
 * 🧾 This function is pure. It gets an invoice and returns a deadline. The billing run
 *    calls it for every account, every time the clock moves.
 *
 * 🧾 What is on the invoice:
 *      method         'card' or 'sepa_debit'
 *      dueAt          the date on the invoice
 *      submittedAt    when the payment was actually sent to the rail
 *      paymentState   'submitted', 'paid' or 'returned'
 *
 * 🧾 Two constants are exported from `@bigpdf/lab-core/contracts`:
 *      CARD_GRACE_HOURS             24
 *      SEPA_RETURN_BUSINESS_DAYS    5
 *
 * 🧾 A card authorises inside the request. If it was going to fail, it already has, so 24
 *    hours after the due date is a generous window.
 *
 * 🧾 A SEPA direct debit is different in a way that matters. It is submitted, and the
 *    payer's bank can send it back for up to five business days afterwards. Until that
 *    window closes, hearing nothing is the normal sound of a payment working.
 */
import type { GraceWindow, Invoice } from '@bigpdf/lab-core/contracts';
import { CARD_GRACE_HOURS } from '@bigpdf/lab-core/contracts';

const HOUR_MS = 60 * 60 * 1000;

export function graceWindowFor(invoice: Invoice): GraceWindow {
  // 🦆 Task 1: this gives every invoice 24 hours from the due date, whatever rail the
  //    money is travelling on.
  //
  //    For a card that is right. For a SEPA debit it is not a conservative choice, it is
  //    the wrong unit: the bank has not been asked yet, and will not have finished for
  //    days. Advance the clock to day 2 and watch what this does to Northstar, whose
  //    payment is perfectly fine and still in transit.
  //
  //    What you return is a `GraceWindow`:
  //      deadline   an ISO string. The moment we stop giving the benefit of the doubt
  //      reason     one line, shown on the account card. Say what the window is measured
  //                 from, and why it is that long
  //
  //    Business days, not calendar days. A debit submitted on a Monday has until the
  //    following Monday, because Saturday and Sunday are not banking days. Day 0 in this
  //    lab is a Monday, so a calendar day version lands on a Saturday and is wrong by two
  //    days in the direction that suspends paying customers.
  return {
    deadline: new Date(Date.parse(invoice.dueAt) + CARD_GRACE_HOURS * HOUR_MS).toISOString(),
    reason: `${CARD_GRACE_HOURS} hours after the invoice was due`,
  };
}
