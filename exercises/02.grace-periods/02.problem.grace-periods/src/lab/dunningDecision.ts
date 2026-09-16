/**
 * The window has been worked out. What does billing actually do today?
 *
 * 🧾 Also pure. The billing run calls it once per account per clock move and then does
 *    exactly what it says.
 *
 * 🧾 What you are handed, in `input`:
 *      invoice   including `paymentState` and `stage`, what dunning has already done
 *      now       the simulated clock, in epoch milliseconds
 *      window    whatever your `graceWindowFor` returned for this invoice
 *
 * 🧾 The four actions:
 *      wait      do nothing today, and say why
 *      remind    email the customer. The first stage
 *      suspend   take the product away. Visible, interrupting, and remembered
 *      clear     the money arrived. Undo any dunning
 *
 * 🧾 `REMINDER_TO_SUSPENSION_DAYS` is exported from `@bigpdf/lab-core/contracts`. A
 *    reminded account gets that long before suspension.
 *
 * 🧾 `paymentState` is the other half of the decision, and it cuts both ways. A debit still
 *    in flight inside its window deserves silence. A debit the bank has already returned
 *    deserves action today, even if the window has days left to run: waiting out a window
 *    after you have the answer is just slow.
 */
import type { DunningDecision, DunningInput } from '@bigpdf/lab-core/contracts';

export function decideDunning(input: DunningInput): DunningDecision {
  // 🦆 Task 2: this ignores the window it was handed and ignores what the payment is
  //    actually doing. It compares the clock to the due date and escalates on a timer.
  //
  //    Three things are wrong with it:
  //      - it never looks at `input.window`, so fixing task 1 changes nothing,
  //      - it never looks at `invoice.paymentState`, so an account that paid on day 4 is
  //        still suspended on day 5,
  //      - it acts on the calendar rather than on evidence, so Harbour, whose bank
  //        returned the debit on day 2, is treated the same as Northstar, whose bank is
  //        still thinking about it.
  //
  //    What you return is a `DunningDecision`: an action, and a reason a customer support
  //    agent could read out loud.
  const daysPastDue = Math.floor((input.now - Date.parse(input.invoice.dueAt)) / (24 * 60 * 60 * 1000));

  if (daysPastDue >= 2) {
    return { action: 'suspend', reason: `${daysPastDue} days past due` };
  }
  if (daysPastDue >= 1) {
    return { action: 'remind', reason: `${daysPastDue} day past due` };
  }
  return { action: 'wait', reason: 'Not due yet' };
}
