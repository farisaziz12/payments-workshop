---
name: payment-review
description: Review a change for payment-state and entitlement correctness against this lab's rules. Use when reviewing a diff or a file that touches payment status, checkout submission, provider events, polling, or workspace access, or when someone asks whether their payment handling is correct.
argument-hint: "[file, diff or branch to review]"
---

# Reviewing payment state and entitlement

$ARGUMENTS

Work through these in order. For each finding, name the file and line, say what would go wrong for a real customer, and propose the smallest fix. If a section does not apply to the change, say so and move on rather than padding the review.

## 1. Authority

- Does anything treat a value from the browser as proof of payment? A query parameter, a redirect, a `localStorage` entry, a button click, a client-held payment object.
- Does the frontend set payment or entitlement state anywhere, rather than reading it?
- Is access rendered from the server's entitlement, or re-derived from a payment status the client happens to hold?

## 2. Failure versus non-answer

- Is a request that timed out or lost its connection ever reported as a failed payment?
- Is a decline carried as an HTTP 200 with `status: 'failed'`, with 4xx reserved for malformed requests?
- After an unknown outcome, does the code reconcile with the server instead of guessing, and does it avoid offering a retry that could charge twice?

## 3. State coverage

- Are all four of `requires_action`, `processing`, `succeeded`, `failed` handled?
- Is `processing` treated as its own state, not as a slow success?
- Does a `switch` on status avoid a `default` branch, so a new status fails the build here rather than silently rendering as something else?

## 4. Idempotency

- Is the purchase id stable across retries, reloads and re-renders? An id minted inside a render or a `useState` initialiser that reruns is a duplicate charge waiting to happen.
- Is the server, not a disabled button, the thing preventing a second payment?
- Is a retry after a failure allowed to create a genuinely new attempt?

## 5. Event ordering

- Are events deduplicated by event id?
- Is ordering decided by a per-payment sequence rather than arrival time?
- **Is there a blanket "ignore anything after a terminal state" rule?** Flag it. It passes this lab's tests and silently drops the first refund or dispute.
- Does a gap in the sequence block, waiting for an event that may never arrive?

## 6. Recovery

- Can the current state be recovered from the server after a reload, a closed tab, or a link opened in another browser?
- Is a missing or unknown purchase id handled distinctly from an unreachable server?

## 7. Repository rules

- Does anything under `exercises/` import from `solutions/`?
- Do `?status` or `?paid` appear outside the three lab files?
- Do both apps still type check, lint and build with the deliberate bugs in place?
- Does the change add a network dependency, a credential, or an install hook?

Run `pnpm lint` (which includes the boundary and documentation checks), `pnpm typecheck` and `pnpm test` before you conclude, and report what they actually printed.
