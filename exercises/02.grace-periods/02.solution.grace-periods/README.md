# Solution 02: the grace period

Reference implementation for [exercise 02](../README.md). Start there if you have not tried
it yet. Reading this first is the one reliable way to get nothing out of the exercise.

## 🔌 How to run

```bash
pnpm solution 02      # http://localhost:3004
pnpm compare 02       # starter on 3003 and this on 3004, with separate state
```

## 📅 The window, and why it is measured from submission

`graceWindowFor` branches on `invoice.method` and nothing else, because the window is a fact
about the rail.

A card gets `CARD_GRACE_HOURS` after the due date. The authorisation happened inside the
request, so whatever the card was going to do it has already done, and 24 hours is a
courtesy rather than a wait for information.

A SEPA debit gets `SEPA_RETURN_BUSINESS_DAYS` business days after `submittedAt`. Submission
is when the bank's clock starts. In this lab the due date and the submission date are the
same day, which is exactly why it is worth measuring from the right one: in a real system
they drift apart, and the version measured from `dueAt` fails quietly when they do.

`addBusinessDays` steps a day at a time and skips Saturday and Sunday. Day 0 is a Monday on
purpose: five calendar days lands on the Saturday, two days early, and both of those days
are days a bank could still have confirmed in. The loop is longer than the arithmetic and
much harder to get subtly wrong.

Bank holidays are not modelled, and the solution says so in a comment rather than pretending
otherwise. A scheme calendar is a real dependency in production, and the direction of that
error is always against the customer.

The `Math.max` at the end is a guard rather than a rule. A rail that answers later should
never end up with less patience than one that answers immediately.

## ⚖️ The decision, and the order of the two questions

`decideDunning` asks what the rail said before it asks what the clock says. That order is
the whole exercise.

`paid` stops everything and clears any dunning that already happened. Note that it clears
rather than leaving the flag: a customer who was suspended and then paid should get the
product back without anyone filing a ticket.

`returned` acts today. The window exists to find out whether the bank will send the debit
back. Once it has, the window has served its purpose and waiting out the remainder is a slow
response to a known problem. Escalation still starts with a reminder, because a returned
debit is usually a full account rather than a customer who has left.

`submitted` is the only branch where the clock matters, and it is the one the starter gets
backwards. Before the deadline, silence is what a working payment sounds like.

Escalation is shared by both branches and counts from the moment something actually
happened: `returnedAt` when the bank answered, the window deadline when it did not. That is
what lets the reason strings name a real event rather than a number of days.

## 🚧 What this does not model

Bank holidays, multiple invoices per account, partial payments, retries of a failed debit,
mandate management, per-country scheme differences, tax and credit notes, and every form of
customer communication except the two stages here. The shapes are true. The details are
illustrative.
