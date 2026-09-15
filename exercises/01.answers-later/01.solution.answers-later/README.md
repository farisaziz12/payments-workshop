# Solution 01: the payment that answers later

Reference implementation for [Exercise 01](../README.md). Start there if you have not tried it yet. Reading this first is the one reliable way to get nothing out of the exercise.

## 🔌 How to run

```bash
pnpm solution 01      # http://localhost:3002
pnpm compare 01       # starter on 3001 and this on 3002, side by side
```

## 🔍 Key implementation choices

**A failed request and a failed payment are different types.** `ApiResult<T>` is `{ ok: true, data }` or `{ ok: false, kind }`, and a decline is an `ok: true` carrying `status: 'failed'`. The 4xx statuses are reserved for malformed requests. That one decision is what makes the timeout scenario tractable: `paymentView.ts` cannot accidentally report "your payment failed" when the honest answer is "we don't know yet", because the two arrive as different shapes.

**The unknown state polls and does not offer a retry.** After a timeout the customer sees *We could not confirm the result*, the screen keeps asking the server, and there is no retry button. A retry button there is an invitation to pay twice at the exact moment you are least sure what happened. Checkout is idempotent, so a second submission would be safe anyway, but "safe because of a server-side guard" is not a reason to design a footgun into the UI.

**The status switch has no `default` branch.** Add a fifth `PaymentStatus` to the contract and TypeScript fails the build at this function, which is where you want to be told.

**`restoreCheckout` treats the URL as a lookup key and nothing more.** It reads an id from `?purchase=` or localStorage, then asks the server. A `not_found` mints a fresh id; an unreachable server keeps the id and reports no payment rather than inventing one. `?status=success` is ignored completely. A query parameter is something the customer's own browser can put there, so it can carry a hint, never a fact.

**`deriveAccess` ignores two of the three things it is handed.** `clientStatus` and `search` are in the signature on purpose. Access renders from `entitlement.access` plus a check that `entitlement.workspaceId` matches the workspace being viewed, so a decision about one workspace cannot unlock another. Keep that check in production even when it looks redundant. "Redundant" is doing a lot of work in a multi-tenant app.

**Entitlement is recomputed, not stored on the client.** The workspace page polls `/api/entitlements/:workspaceId` and renders whatever comes back. A succeeded payment is not a settled one, and refunds and disputes can take the money back later, so treating entitlement as a decision you keep making leaves room for that. Nothing in this lab produces a refund, which is why the shape matters more than the simulation.

**Events are ordered by a per-payment sequence, and deduplicated by event id.** Both rules live in `packages/lab-core/src/server/events.ts`, outside the exercise. The rule we deliberately did not write is "ignore everything once the payment is terminal". It looks like it solves the out-of-order scenario, and it does, right up until the first refund event arrives after a success and gets silently dropped. Version the state and compare versions.

**A gap in the sequence is applied, not buffered.** If sequence 4 arrives while the payment is on 2, the handler applies it and notes the gap. Waiting for 3 means waiting for something that may never come, and 4 is more current than 2 either way.

**The starter's bugs are behavioural, never type errors.** The starter type checks, lints and builds. If a deliberate bug could be caught by `tsc`, an attendee would find it by saving the file rather than by reasoning about payment state, and the exercise would teach nothing.

## 🧭 What is still out of scope

Refunds, disputes, chargebacks, settlement, reconciliation, tax calculation, proration, dunning, multi-provider routing, and real provider SDKs. The simulated provider here produces exactly two timelines so the lesson stays visible. It is not a model of any real payment rail.
