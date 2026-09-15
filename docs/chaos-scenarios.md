# 🌪 Scenarios

Every scenario is deterministic. Same clicks, same states, same events, same order, every time. Nothing in the simulation rolls dice, so a broken screen is worth debugging rather than re-rolling.

Scenarios are defined in `packages/lab-core/src/server/scenarios.ts` and selected in the control panel on the right of the checkout page, or over the API:

```bash
curl -X POST http://localhost:3001/api/simulator/scenario \
  -H 'content-type: application/json' -d '{"scenarioId":"delayed-success"}'
```

## ✅ Implemented and working

| Scenario | Method | What happens | Why it is here |
| --- | --- | --- | --- |
| `instant-success` | Card | Checkout returns `succeeded` | The baseline. Access turns on. |
| `instant-decline` | Card | Checkout returns `failed` with `card_declined`, in an HTTP 200 | A known failure, offered a retry, no access |
| `delayed-success` | Bank debit | Returns `processing`, then `payment.succeeded` after 6s | The second timeline. Pending is not paid |
| `delayed-failure` | Bank debit | Returns `processing`, then `payment.failed` after 6s | A pending payment is not a slow success |
| `client-timeout-success` | Card | Server records `succeeded` immediately, holds the response 5s; the browser aborts at 3s | A network error is not a payment failure |
| `duplicate-event` | Bank debit | The same `payment.succeeded`, same event id, delivered twice | Event handling must be idempotent |
| `out-of-order-event` | Bank debit | `payment.succeeded` (sequence 3) lands, then a stale `payment.processing` (sequence 2) | Order by version, not by arrival |

**Event arrives after the customer closes the tab** is a procedure rather than a scenario of its own:

1. Pick `delayed-success` and pay with bank debit.
2. Close the tab, or navigate away, before the six seconds are up.
3. Come back to the checkout URL, or open `/workspace/ws_northstar`.

The server applied the event while nobody was watching, because the server is where state lives. The `e2e/reload-recovery.spec.ts` spec automates exactly this.

## ⏭ Controls

- **Deliver scheduled events now.** Stop waiting for the six second timer. Deliveries keep their relative order, so this does not quietly fix `out-of-order-event`.
- **Send the same checkout request again.** Resubmits the same purchase. Watch the server return the existing payment instead of creating a second one.
- **Reset everything.** Clears purchases, payments, seen event ids, scheduled deliveries and the timeline, then clears `localStorage` and reloads. `pnpm reset 01` does the server half from a terminal.

## 🗺 Scenario to acceptance check

| Scenario | Behaviour test | End-to-end spec |
| --- | --- | --- |
| `instant-success` | `[TODO 1]` succeeded is paid | `e2e/pending-state.spec.ts`, `e2e/access-gating.spec.ts` |
| `instant-decline` | `[TODO 1]` declined is a failure with a retry | `e2e/pending-state.spec.ts`, `e2e/access-gating.spec.ts` |
| `delayed-success` | `[TODO 1]` processing is pending and polls; `[TODO 3]` locked while processing | `e2e/pending-state.spec.ts`, `e2e/reload-recovery.spec.ts`, `e2e/access-gating.spec.ts` |
| `delayed-failure` | `[TODO 1]` failure after pending | `e2e/pending-state.spec.ts` |
| `client-timeout-success` | `[TODO 1]` a timeout is unknown, not failed | `e2e/event-delivery.spec.ts` |
| `duplicate-event` | unit: `packages/lab-core/test/events.test.ts` | `e2e/event-delivery.spec.ts` |
| `out-of-order-event` | unit: `packages/lab-core/test/events.test.ts` | `e2e/event-delivery.spec.ts` |
| Resubmission | unit: checkout idempotency | `e2e/event-delivery.spec.ts` |
| Reset and repeatability | unit: reset | `e2e/reset.spec.ts` |

## 🔭 Future ideas, not implemented

These are honest gaps, not hidden features. Nothing in the app produces them today.

- **`requires_action`.** The status exists in the contract and the UI handles it, but no scenario emits it. Adding one is a stretch goal.
- **A refund after success.** The event rules are built so this would work (`sequence` 4 arriving after a success applies cleanly). There is no `payment.refunded` event type.
- **Delivery retries with backoff, and signature verification.** Real webhook infrastructure. Out of scope on purpose.
- **A pending payment that expires.** Banks give up eventually.
- **Two providers with different event vocabularies.** Routing and normalisation is its own workshop.

## ⚠️ What this simulation is not

SimPay is not a model of any real payment provider, and the two timelines are not a complete implementation of any real payment rail. Real rails add authentication steps, partial captures, settlement windows, currency and tax handling, disputes, and delivery guarantees that this lab does not attempt. Treat the shapes as true and the details as illustrative.
