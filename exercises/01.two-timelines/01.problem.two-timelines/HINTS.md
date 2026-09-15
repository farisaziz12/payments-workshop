# 💡 Hints

Numbered to match the 🐨 comments in the code and the labels in `pnpm test:exercise 01`. Three levels per task: read level 1, go back to the code, and only come back for level 2 if you are still stuck. Level 3 is nearly the answer.

The order worth working in is 1, then 3, then 2. Task 3 is the cheapest and task 2 is the largest.

---

## 🐨 Task 1: `src/lab/paymentView.ts`

**Level 1.** Count the outcomes the function currently produces, then count the outcomes that can actually happen. `payment.status` alone has four values, and there is a fifth case where the server never answered at all. The starter has two branches.

**Level 2.** Deal with `result.ok === false` on its own, before you look at any payment. A timeout means the request did not come back. It says nothing about the money. The tone for that case is `unknown`, and you want `keepPolling: true` so the screen can go and find out, and `canRetry: false` so the customer does not pay twice while you are still asking.

**Level 3.** Once `result.ok` is true, switch on `result.data.status` and give each of the four a view of its own:

| status | tone | keepPolling | canRetry |
| --- | --- | --- | --- |
| `succeeded` | `success` | no | no |
| `processing` | `pending` | yes | no |
| `requires_action` | `pending` | yes | no |
| `failed` | `failure` | no | yes |

Write the switch without a `default` branch. TypeScript will then tell you if a status ever goes unhandled.

---

## 🐨 Task 2: `src/lab/restoreCheckout.ts`

**Level 1.** The function never awaits anything, and it has an `api` sitting unused in the context it was given. Whatever the customer's browser remembers is a question for the server, not an answer from it.

**Level 2.** The purchase id can be in two places: `context.search.get('purchase')` and `context.storage.getItem(PURCHASE_STORAGE_KEY)`. That constant is exported from `@stacknotes/lab-core/ui`, so add it to the import already at the top of the file. Take whichever you find. Then `await context.api.getPurchase(id)` and let the response decide what to return. Delete the `?status=success` branch entirely; there is nothing worth keeping in it.

**Level 3.** Three responses, three different things to do:

- `{ ok: true, data }`: the server knows this purchase. Return its id and `data.payment`, which may legitimately be `null` if nothing has been submitted yet.
- `{ ok: false, kind: 'not_found' }`: this id means nothing here. Fall through and mint a new one with `mintPurchaseId()`.
- `{ ok: false, kind: 'timeout' | 'network' }`: you could not reach the server. Keep the id so the poll can catch up, and return `payment: null` rather than inventing a state.

With nothing in the URL and nothing in storage, mint a fresh id and do not call the server at all.

---

## 🐨 Task 3: `src/lab/accessDecision.ts`

**Level 1.** Three things come in through `inputs`. Ask yourself which of them a stranger could set from their own browser. Two of them.

**Level 2.** `inputs.entitlement` is the server's decision, and it is the only input that came from a server. It is `null` while the first request is in flight, so handle that first: not unlocked, and say you are checking rather than pretending it is locked forever.

**Level 3.** The unlock condition is `entitlement.access === 'active'`, and also confirm `entitlement.workspaceId === inputs.workspaceId` so a decision about one workspace can never unlock another. For the locked case, map `entitlement.reason` to a sentence a customer would understand. The five reasons are `no_payment`, `payment_processing`, `payment_failed`, `payment_for_other_workspace` and `payment_succeeded`. `inputs.clientStatus` and `inputs.search` end up unused, and that is the point of the exercise.

---

## Still stuck?

Run `pnpm test:exercise 01`. Each failing test names the behaviour it wanted, which is usually enough to see what the code is missing. If you want to see one finished version, `pnpm solution 01` runs it on port 3002, and `exercises/01.two-timelines/01.solution.two-timelines/README.md` explains the choices in it. Try to get there yourself first. Reading it early is the one way to waste this exercise.
