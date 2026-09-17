# 🌪 The game day

Exercise 01 runs on traffic somebody breaks on purpose. This page is the runbook.

Everything is deterministic. Traffic comes from a seeded generator, so the same run replays
after a reset and a problem an attendee saw is a problem you can reproduce. Nothing rolls an
unseeded die.

## ⚡ The faults

Each one is a gateway failing a single segment, because that is the shape real degradation
takes. All three refuse the request outright, so nothing is ever captured on a failed
attempt and every failure in this lab is one you can act on. Switch them on in the chaos
panel, or over the API:

```bash
curl -X POST http://localhost:3001/api/simulator/incident \
  -H 'content-type: application/json' \
  -d '{"incidentId":"card-de-atlas-unavailable","active":true}'
```

| Fault | Gateway | Segment | Failure | What it teaches |
| --- | --- | --- | --- | --- |
| `card-de-atlas-unavailable` | Atlas | `card:DE:EUR` | `gateway_unavailable`, 80% | The headline rate moves a fraction of what the segment does. Move only the traffic that is hurting |
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

**The headline rate** is the number a status page would show. It falls when the Atlas fault
goes on, but nowhere near as far as one segment does: German cards are about a third of the
traffic and the other four segments are untouched. How far it falls also depends on what the
attendee's retry policy is doing at the time, so do not promise them a number.

**The segment cards** are where the outage is. German cards drop to roughly a fifth of their
normal rate the moment the fault is on, whatever the headline says. That gap is the lab.

**The ledger** is the money. "Misrouted" only moves when routing sent a payment somewhere
that cannot accept it, and it climbs from the first second on the starter. "Not routed"
counts charges the orchestrator refused to send anywhere.

**The attempt feed** carries the reason your routing gave for each decision, which is why
the exercise asks you to write one. Retry rows also carry their idempotency key, so a
policy that mints a fresh one per attempt is visible rather than theoretical.

## 🗺 Fault to acceptance check

| Fault | Behaviour test | End-to-end spec |
| --- | --- | --- |
| `card-de-atlas-unavailable` | `[Task 1]` moves traffic away from a failing gateway | `e2e/01/game-day.spec.ts` |
| Collateral damage | `[Task 1]` leaves sterling cards where they were | `e2e/01/game-day.spec.ts` |
| `sepa-de-borealis-outage` | `[Task 1]` still sends SEPA to its only gateway | `e2e/01/game-day.spec.ts` |
| Retry and idempotency | `[Task 2]` reuses the original idempotency key | `e2e/01/game-day.spec.ts` |
| A failure never captures | `packages/lab-core/test/orchestrator.test.ts` | |
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
