/**
 * The window has been worked out. What does billing actually do today?
 *
 * Two questions, in this order, and the order stops both of the mistakes this exercise is
 * about.
 *
 *   1. What does the rail say? Paid means stop. Returned means the bank has answered, so
 *      act today rather than waiting out a window whose purpose has already been served.
 *   2. Only then, what does the clock say? Inside the window, silence means the payment is
 *      probably working.
 *
 * Doing the clock first is the starter's bug, and it suspends people whose money is in
 * transit. Doing only the rail is the opposite bug: nothing ever escalates.
 */
import type { DunningDecision, DunningInput } from '@bigpdf/lab-core/contracts';
import { REMINDER_TO_SUSPENSION_DAYS } from '@bigpdf/lab-core/contracts';

const DAY_MS = 24 * 60 * 60 * 1000;

export function decideDunning(input: DunningInput): DunningDecision {
  const { invoice, now, window } = input;

  if (invoice.paymentState === 'paid') {
    return invoice.stage === 'none'
      ? { action: 'wait', reason: 'Paid. Nothing to chase' }
      : { action: 'clear', reason: 'The money arrived, so the account goes back to normal' };
  }

  // The bank has answered and the answer was no. The window existed to find this out, so
  // there is nothing left to wait for. Escalation still starts at a reminder: a returned
  // debit is often a full account rather than a customer who has left.
  if (invoice.paymentState === 'returned') {
    const since = Date.parse(invoice.returnedAt ?? invoice.dueAt);
    return escalate(invoice.stage, now, since, 'the bank returned the payment');
  }

  const deadline = Date.parse(window.deadline);
  if (now < deadline) {
    return {
      action: 'wait',
      reason: `Still inside the grace window. ${window.reason}`,
    };
  }

  return escalate(invoice.stage, now, deadline, 'the grace window closed with no confirmation');
}

/** Remind first, suspend later. Nobody should lose the product without a warning. */
function escalate(
  stage: DunningInput['invoice']['stage'],
  now: number,
  since: number,
  because: string,
): DunningDecision {
  if (stage === 'none') {
    return { action: 'remind', reason: `Reminder sent because ${because}` };
  }

  if (stage === 'reminded') {
    const suspendAt = since + REMINDER_TO_SUSPENSION_DAYS * DAY_MS;
    if (now >= suspendAt) {
      return {
        action: 'suspend',
        reason: `Suspended ${REMINDER_TO_SUSPENSION_DAYS} days after the reminder, because ${because}`,
      };
    }
    return { action: 'wait', reason: 'Reminded already. Giving them the two days before suspension' };
  }

  return { action: 'wait', reason: 'Already suspended' };
}
