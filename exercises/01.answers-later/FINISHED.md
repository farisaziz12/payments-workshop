# 🏁 Finished

Three fixes, and each one moved a decision to where it belongs.

| You changed | The idea underneath |
| --- | --- |
| `paymentView.ts` | The browser cannot know what happened to a payment. It renders what the server reported, and admits it when there was no answer |
| `restoreCheckout.ts` | State survives a reload because the server holds it, not the tab |
| `accessDecision.ts` | Access is a decision the server made. The browser displays it |

## 🌶 Stretch goals

**Read the delivery scenarios.** Turn on **The success event is delivered twice** and **An older event arrives after a newer one**, then read the timeline. Both are handled on the server already. Can you say why the ordering rule is the per-payment sequence rather than "ignore anything after a terminal state"? What would that shortcut do to a refund?

**Follow a duplicate submission.** Press **Submit again** and watch the server return the existing payment. Where would a duplicate charge have come from if the purchase id were minted on every render?

**Sketch a refund.** A succeeded payment is not a settled one. What would have to change if a refund could arrive an hour later? Which of your three fixes survive untouched?

**Make `requires_action` real.** The contract has it and the UI handles it, but no scenario produces one. Adding a scenario is about ten lines in `packages/lab-core/src/server/scenarios.ts`.

## 📚 Going deeper

- [Payment and entitlement contracts](../../docs/payment-state-contracts.md) for the state machine and the event rules
- [Scenarios](../../docs/chaos-scenarios.md) for what each one produces and what is deliberately not built
- [`01.solution.answers-later/README.md`](./01.solution.answers-later/README.md) for why the reference implementation is written the way it is
