# 🏁 Finished

Two functions, and each one moved a decision to where the evidence is.

| You changed | The idea underneath |
| --- | --- |
| `routing.ts` | Failures cluster by segment. An aggregate is the last place you will see one, and the first place you will over-react to one |
| `retryPolicy.ts` | What kind of failure it was decides what you may do next. The idempotency key decides whether the gateways can tell your retry from a new payment |

## 🧠 The part worth taking to work

**The number on the status page is the wrong number.** German cards fell to about a fifth of
their normal rate, and overall authorisation moved a fraction of that, because the other four
segments were fine. The headline dropped just enough to look like a bad afternoon. Slice by
method, country, currency and gateway, and alert on the slice.

**Failover is a capability, not a reflex.** Two of the three gateways in this lab cannot
take everything. Real ones differ by scheme, currency, country, card type and whether the
merchant account was set up on a Friday. Check eligibility before you check preference.

**A retry is a decision about someone else's money.** Retrying an issuer decline is card
testing. The kind of failure is the only thing that should decide, and the key should never
change inside one charge, because that key is all a gateway has to tell your second attempt
from a second payment.

## 🔭 If you have time

- **Add a cost dimension.** Cirrus costs 2.10% against Atlas at 1.45%. Make the routing
  prefer the cheaper gateway when both are healthy, and measure what that does to the fee
  total on the dashboard.
- **Switch on two faults at once.** Take Atlas down for German cards and rate limit Cirrus.
  Watch what your failover does when the place it was failing over to has its own problem.
- **Make `thinSample` matter.** Right now a thin sample is treated as healthy. Try treating
  it as unknown instead, and see what that does in the first few seconds after a reset.
- **Write the alert.** Given the health snapshot, what condition would you page someone on?
  Sample size, duration and a threshold, and all three are judgement calls.

## ➡️ Next

[Exercise 02](../02.grace-periods/README.md) is about the other end of a payment: what your
billing system does while a payment is still in flight, and what it costs when the answer is
five days away.
