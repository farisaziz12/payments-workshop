# 🏁 Finished

Two functions, and each one moved a decision to where the evidence is.

| You changed | The idea underneath |
| --- | --- |
| `routing.ts` | Failures cluster by segment. An aggregate is the last place you will see one, and the first place you will over-react to one |
| `retryPolicy.ts` | What kind of failure it was decides what you may do next. The idempotency key decides whether the customer pays for your retry |

## 🧠 The part worth taking to work

**The number on the status page is the wrong number.** Overall authorisation went from 94%
to 79% while one segment was completely dead. Slice by method, country, currency and
gateway, and alert on the slice.

**Failover is a capability, not a reflex.** Two of the three gateways in this lab cannot
take everything. Real ones differ by scheme, currency, country, card type and whether the
merchant account was set up on a Friday. Check eligibility before you check preference.

**A retry is a decision about someone else's money.** Retrying an issuer decline is card
testing. Retrying a timeout on a fresh key is a double charge. The kind of failure is the
only thing that should decide, and the key should never change inside one charge.

## 🔭 If you have time

- **Add a cost dimension.** Cirrus costs 2.10% against Atlas at 1.45%. Make the routing
  prefer the cheaper gateway when both are healthy, and measure what that does to the fee
  total on the dashboard.
- **Switch on two faults at once.** Break Atlas for German cards and rate limit Cirrus.
  Watch what your failover does when the place it was failing over to has its own problem.
- **Make `thinSample` matter.** Right now a thin sample is treated as healthy. Try treating
  it as unknown instead, and see what that does in the first few seconds after a reset.
- **Write the alert.** Given the health snapshot, what condition would you page someone on?
  Sample size, duration and a threshold, and all three are judgement calls.

## ➡️ Next

[Exercise 02](../02.grace-periods/README.md) is about the other end of a payment: what your
billing system does while a payment is still in flight, and what it costs when the answer is
five days away.
