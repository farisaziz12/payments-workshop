# 🌪 The game day

Exercise 01 runs on traffic somebody breaks on purpose. This page is the runbook.

Everything is deterministic. Traffic comes from a seeded generator, so the same run replays
after a reset and a problem an attendee saw is a problem you can reproduce. Nothing rolls an
unseeded die.

## ⚡ The faults

Each one is a gateway failing a single segment, because that is the shape real degradation
takes. Switch them on in the chaos panel, or over the API:

```bash
curl -X POST http://localhost:3001/api/simulator/incident \
  -H 'content-type: application/json' \
  -d '{"incidentId":"card-de-atlas-timeout","active":true}'
```

| Fault | Gateway | Segment | Failure | What it teaches |
| --- | --- | --- | --- | --- |
| `card-de-atlas-timeout` | Atlas | `card:DE:EUR` | `gateway_timeout`, 80% | The headline rate barely moves while a segment dies. Move only the traffic that is hurting |
| `sepa-de-borealis-outage` | Borealis | `sepa_debit:DE:EUR` | `gateway_unavailable`, 90% | Failover is not always available. Borealis is the only gateway that takes SEPA |
| `cirrus-rate-limit` | Cirrus | every segment | `rate_limited`, 65% | The gateway you failed over to has its own limits |

The first one is the game day. The other two are worth switching on afterwards, and
switching on together is worth it once.

## 🎛 The other controls

- **Advance traffic.** It flows on its own, five attempts a second, whenever the console is
  open. Each poll advances the simulation, so nothing runs in the background behind you.
- **Send 60 now.** A burst, for when you want an answer rather than a wait.
- **Pause traffic.** Freezes the generator. Health keeps ageing out of the window.
- **Reset.** Clears attempts, captures, the ledger and every fault, and reseeds the
  generator. `pnpm reset 01` does the same from a terminal.

## 📊 Reading the console

**The headline rate** is the number a status page would show. With the Atlas fault on it
sits near 79%, which looks like a bad afternoon.

**The segment cards** are where the outage is. One of them is near zero.

**The ledger** is the money. "Charged twice" only moves when a retry uses a fresh
idempotency key. "Misrouted" only moves when routing sent a payment somewhere that cannot
accept it. Both should stay at zero, and both climb on the starter.

**The attempt feed** carries the reason your routing gave for each decision, which is why
the exercise asks you to write one.

## 🗺 Fault to acceptance check

| Fault | Behaviour test | End-to-end spec |
| --- | --- | --- |
| `card-de-atlas-timeout` | `[Task 1]` moves traffic away from a failing gateway | `e2e/01/game-day.spec.ts` |
| Collateral damage | `[Task 1]` leaves sterling cards where they were | `e2e/01/game-day.spec.ts` |
| `sepa-de-borealis-outage` | `[Task 1]` still sends SEPA to its only gateway | `e2e/01/game-day.spec.ts` |
| Retry and idempotency | `[Task 2]` reuses the original idempotency key | `e2e/01/game-day.spec.ts` |
| Health windowing | `packages/lab-core/test/health.test.ts` | |
| Determinism and the attempt ceiling | `packages/lab-core/test/orchestrator.test.ts` | |

## ⏱ The clock in exercise 02

Exercise 02 has no traffic and no faults. It has a clock, and the billing job runs every
time the clock moves. The three accounts and the two bank events are fixed:

| Day | What the banks do |
| --- | --- |
| 0 | Acme's card is declined in the request |
| 2 | Harbour's bank returns the debit, `insufficient_funds` |
| 4 | Northstar's bank confirms the debit |

Advance a day at a time from the console, or `POST /api/clock` with `{ "hours": 24 }`.

## ⚠️ What these simulations are not

The gateways are not models of any real provider and the rails are not complete
implementations of anything. Real systems add authentication steps, partial captures,
settlement windows, scheme calendars, disputes and delivery guarantees that neither lab
attempts. The shapes are true. The details are illustrative.
