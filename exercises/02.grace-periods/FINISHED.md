# 🏁 Finished

Two functions, and both of them moved a decision off the calendar and onto the evidence.

| You changed | The idea underneath |
| --- | --- |
| `graceWindow.ts` | How long to wait is a property of the rail. A number that is right for cards is not a cautious choice for direct debits, it is the wrong unit |
| `dunningDecision.ts` | What the rail has said comes before what the clock says. Silence inside a window is not a signal; a return is, the day it arrives |

## 🧠 The part worth taking to work

**Find every hard-coded duration in your billing code and ask which rail it was written
for.** Grace periods, retry schedules, "payment pending" banners that give up after an hour,
reconciliation jobs that alert on anything unmatched overnight. Most of them were written
the week the first card payment shipped.

**Suspension is not a database flag.** It interrupts work, it emails a paying customer to
say they did not pay, and undoing it does not undo the email. That asymmetry is the argument
for waiting the full window on a rail that is slow but usually fine.

**Both directions are bugs.** Chasing too early loses customers who paid. Waiting out a
window after the bank already said no is a week of free product and a harder conversation
later. The fix for both is the same: act on what the rail actually told you.

## 🔭 If you have time

- **Add bank holidays.** The lab skips weekends and ignores holidays, so a debit submitted
  before Christmas gets a window that is two days short. A scheme calendar is a real
  dependency, and the error always runs against the customer.
- **Make the reminder softer and earlier.** Send a "we have not heard from your bank yet"
  note on day 2 that does not accuse anyone of anything, and keep suspension where it is.
- **Add a second cycle.** Real dunning gives a failed renewal several retries over a couple
  of weeks before it suspends anything. Where would that go?
- **Write the support answer.** Given the account card, what would you tell the customer in
  the email at the top of the exercise README?

## ➡️ Back

[Exercise 01](../01.game-day/README.md) is the other end of the same system: what happens in
the seconds when a payment is being attempted, rather than the days after it was submitted.
