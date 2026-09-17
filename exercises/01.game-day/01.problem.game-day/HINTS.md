# 💰 Hints

Numbered to match the 🦆 comments in the code and the labels in `pnpm test:exercise 01`.
Three levels per task: read level 1, go back to the code, and only come back for level 2 if
you are still stuck. Level 3 is nearly the answer.

---

## 🦆 Task 1: `src/lab/routing.ts`

**💰 Level 1.** The function never looks at `input.segment` and never looks at
`input.health`. Before you reach for health, ask the cheaper question: can the gateway you
are about to name even accept this method and this currency? The gateway table is right
there in `input.gateways`, and every gateway carries a `supports` list.

**💰 Level 2.** Three filters, in this order, and the order matters.

1. `supportsSegment(gateway, input.segment)`, imported from `@bigpdf/lab-core/contracts`.
   A gateway that cannot take the payment is not a candidate, however healthy it looks.
2. Not in `input.tried`. That is the list of gateways this charge has already been sent to.
3. Not degraded for this segment.

If nothing survives, return `{ gatewayId: null, reason: '...' }`. Otherwise sort what is
left by `priority`, lowest first, and take the head.

**💰 Level 3.** The health argument is the whole snapshot, and which part you read is the
exercise.

```ts
const health = segmentHealthFor(input.health, input.segment);   // this segment only
const atlas = gatewayHealthFor(health, 'atlas');                 // ...and one gateway in it
```

`input.health.gateways` is the same gateway measured across every segment at once. Atlas
failing German cards drags that number down while British cards on Atlas are perfectly
fine, so a policy that reads it moves traffic that was never in trouble onto a gateway that
authorises less and costs more.

One case left: every eligible gateway is degraded. Degraded is not dead. Sending nothing
would turn a partial outage into a total one, so pick the one doing least badly and say so
in the reason.

---

## 🦆 Task 2: `src/lab/retryPolicy.ts`

**💰 Level 1.** One import decides almost all of this: `failureKind(code)` from
`@bigpdf/lab-core/contracts`. It sorts a failure into `hard`, `technical` or `config`. Two
of those three should never be retried at all.

**💰 Level 2.** Walk the kinds in order and return early.

- `hard` means the issuer or the bank answered. Sending it to a different gateway does not
  change their answer, and a burst of retries is what card testing looks like from their side.
- `config` means it was routed somewhere that cannot accept it. That is a bug in task 1,
  and retrying it treats a bug as weather.
- `technical` means the gateway turned the request away without touching the money. Nobody
  decided this payment, so it is worth another gateway.

Then check `input.attemptsSoFar` against `input.maxAttempts` before you retry anything.

**💰 Level 3.** For the technical case, you already have a function that knows how to pick a
gateway sensibly, and `input.tried` is exactly what it needs to avoid repeating itself:

```ts
import { chooseGateway } from './routing';

const next = chooseGateway({
  segment: input.attempt.segment,
  gateways: input.gateways,
  health: input.health,
  tried: input.tried,
});
```

If `next.gatewayId` is null there is nowhere to go, so do not retry.

One line left, and the starter gets it wrong on every attempt:

```ts
idempotencyKey: input.attempt.idempotencyKey,
```

The same key, not a new one. The key is how a gateway tells your second attempt at this
payment from a brand new payment, so it belongs to the charge rather than to the attempt.
Mint a fresh one on every retry and one payment arrives at the gateways as three unrelated
ones, with nothing tying them together when somebody has to reconcile them. Watch the key
on the retry rows in the attempt feed: it should be the same string all the way down a
charge.
