# Solution 01: the game day

Reference implementation for [exercise 01](../README.md). Start there if you have not tried
it yet. Reading this first is the one reliable way to get nothing out of the exercise.

## 🔌 How to run

```bash
pnpm solution 01      # http://localhost:3002
pnpm compare 01       # starter on 3001 and this on 3002, with separate state
```

## 🧭 Routing, and why the order of the questions matters

`chooseGateway` asks three questions and the order is the whole design.

**Eligibility first.** `supportsSegment` is a fact about the gateway, not a preference.
Checking health first gets you a beautifully chosen gateway that returns "unsupported
method", which is the starter's most visible bug: SEPA debits to Atlas, and a Misrouted
counter that climbs all afternoon.

**Then health, sliced to this segment.** `segmentHealthFor(input.health, input.segment)`.
The snapshot also carries `health.gateways`, which is the same gateway measured across
every segment at once. That number is what a status page shows, and routing on it moves
British cards off Atlas because German cards are being refused. The test for that is
`leaves sterling cards where they were, because that segment is fine`.

**Then priority.** Lowest number wins, which is the configured commercial preference.

The last branch is the one worth arguing about. When every eligible gateway is degraded it
sends to the least bad one rather than refusing. Degraded is not dead: Borealis at 40% still
takes 40% of the money, and returning `null` there turns a provider's partial outage into a
total one of your own making.

## 🔁 Retry, and the line that costs money

`planRetry` is a switch on `failureKind` and almost nothing else.

`hard` never retries. The issuer answered. A different gateway asks the same issuer and gets
the same answer, and a burst of retries is indistinguishable from card testing.

`config` never retries. `unsupported_method` means routing sent it somewhere impossible.
Retrying is treating your own bug as weather.

`technical` retries, on a gateway `chooseGateway` picks with `tried` excluded, and on
`input.attempt.idempotencyKey`. `gateway_unavailable` and `rate_limited` are both the
gateway turning the request away before it goes near the money, so the payment is still
there to be sent somewhere else. The key stays the charge's own: one payment, one key,
however many gateways it takes, which is the only thing tying those attempts together for
anyone who later has to reconcile them.

Reusing `chooseGateway` here rather than writing a second selection rule keeps one policy in
one place. When the routing rules change, the retry path changes with them.

## 🚧 What this does not model

Delivery retries with backoff and jitter, signature verification, gateway-side rate limit
headers, per-issuer authorisation differences, network tokenisation, retries scheduled hours
later rather than immediately, and settlement of any kind. Every gateway here also answers
every request, which real ones do not. The shapes are true. The details are illustrative.
