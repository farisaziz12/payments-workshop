# 💰 Hints

Numbered to match the 🦆 comments in the code and the labels in `pnpm test:exercise 02`.
Three levels per task: read level 1, go back to the code, and only come back for level 2 if
you are still stuck. Level 3 is nearly the answer.

---

## 🦆 Task 1: `src/lab/graceWindow.ts`

**💰 Level 1.** The function never looks at `invoice.method`, and it measures from
`dueAt` for everything. One of those two is wrong for a card as well: a debit's clock starts
when it is submitted to the bank, not when the invoice was raised. Here they are the same
day. In production they often are not.

**💰 Level 2.** Two branches.

A card keeps what the starter does: `CARD_GRACE_HOURS` after `dueAt`.

A SEPA debit gets `SEPA_RETURN_BUSINESS_DAYS` business days after `submittedAt`. Both
constants are exported from `@bigpdf/lab-core/contracts`.

Business days, not calendar days. Day 0 is Monday 2 March 2026. Five calendar days is
Saturday the 7th; five business days is Monday the 9th. Two days of difference, and both of
them are days a bank could still confirm in.

**💰 Level 3.** Counting business days is a small loop, and a loop is easier to get right
here than arithmetic on week numbers:

```ts
function addBusinessDays(from: number, days: number): number {
  let cursor = from;
  let remaining = days;
  while (remaining > 0) {
    cursor += DAY_MS;
    const weekday = new Date(cursor).getUTCDay();   // 0 is Sunday, 6 is Saturday
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return cursor;
}
```

One guard worth adding: take `Math.max` of the SEPA deadline and the card deadline. A rail
that answers later should never end up with less patience than one that answers immediately.

And say so in `reason`. It appears on the account card, and "5 business days after
submission" is the sentence that stops somebody shortening it again next quarter.

---

## 🦆 Task 2: `src/lab/dunningDecision.ts`

**💰 Level 1.** The function is handed `input.window` and never reads it, and it is handed
`input.invoice.paymentState` and never reads that either. Fixing task 1 changes nothing on
screen until this function reads the window, which is worth seeing for yourself before you
fix it.

**💰 Level 2.** Ask the rail before you ask the clock. Three states:

- `paid`: stop. If dunning already did something, `clear` it. If it never did, `wait`.
- `returned`: the bank has answered, so act today. The window existed to find this out, and
  waiting out the rest of it is just a slow response to a known problem.
- `submitted`: now the clock matters. Before `window.deadline`, `wait`. After it, escalate.

**💰 Level 3.** Escalation is two stages, and the same two whichever branch got you there:

```ts
if (stage === 'none') return { action: 'remind', reason: '...' };
if (stage === 'reminded' && now >= since + REMINDER_TO_SUSPENSION_DAYS * DAY_MS) {
  return { action: 'suspend', reason: '...' };
}
return { action: 'wait', reason: '...' };
```

`since` is what you are counting from: `invoice.returnedAt` when the bank answered, the
window deadline when it did not. Both are moments something actually happened, which is why
the reason you write can name them.

`REMINDER_TO_SUSPENSION_DAYS` is exported from `@bigpdf/lab-core/contracts`.

Write the reasons as if a support agent is going to read one out to the customer on the
phone, because in a real product that is exactly what happens.
