# Payments and Monetization at Scale for Frontend Engineers

Exercise repository for the workshop by **Faris Aziz**.

Two labs, 25 minutes each. In the first you keep payments flowing while somebody breaks a
gateway underneath you. In the second you work out why billing suspended a customer whose
money was already on its way.

Everything runs on your machine. No provider account, no API keys, no card details, no
money, and no internet connection once you have installed.

## 🚀 Start here

```bash
corepack enable      # if you do not have pnpm
pnpm install
pnpm exercise 01     # http://localhost:3001
```

Then open **[exercises/01.game-day](./exercises/01.game-day/README.md)** and work from there.

Needs Node 20.9 or newer. `.nvmrc` pins 22.

## 🗺 Where things are

| Path | What it is |
| --- | --- |
| [`exercises/01.game-day/`](./exercises/01.game-day/README.md) | Lab 1. Routing and retries under an incident |
| [`exercises/02.grace-periods/`](./exercises/02.grace-periods/README.md) | Lab 2. Grace periods and a rail that answers late |
| `exercises/**/NN.problem.*/` | The starter you edit |
| `exercises/**/NN.solution.*/` | The finished version |
| `packages/lab-core/` | Everything built for you: contracts, simulated gateways, server, UI kit |
| [`docs/`](./docs/payment-contracts.md) | Contracts, the game day runbook, troubleshooting, agent setup, provenance |

## 🔌 Commands

| Command | What it does |
| --- | --- |
| `pnpm exercise 01` | Start a starter. `02` for the second lab |
| `pnpm solution 01` | Start the finished version |
| `pnpm compare 01` | Both at once, separate state |
| `pnpm reset 01` | Clear the simulated state without restarting |
| `pnpm test:exercise 01` | Your progress, one line per task |
| `pnpm check` | Typecheck, lint, test and build |

Ports run 3001 and 3002 for lab 1, 3003 and 3004 for lab 2. Port taken?
`pnpm exercise 01 --port 4001`.

**Two suites disagree on purpose.** `pnpm test` must pass: it runs the shared unit tests and
the behaviour tests against the finished versions. `pnpm test:exercise 01` is supposed to
fail on a fresh checkout, because its failures are the specification. It always exits 0.

## 📖 Documentation

| Doc | Read it when |
| --- | --- |
| [Payment contracts](./docs/payment-contracts.md) | You want the routing rules, the failure taxonomy and the grace period policy |
| [The game day](./docs/game-day.md) | You want to know what each fault does, and the clock in lab 2 |
| [Troubleshooting](./docs/troubleshooting.md) | Ports, persistence, dev server limits |
| [Agent setup](./docs/agent-setup.md) | You want to use an AI assistant. Entirely optional |
| [References](./docs/references.md) | You want to know where the conventions came from |

## ⚠️ About the simulation

The gateways and the banks here are simulated. They are not models of any real payment
provider or scheme, and the two rails are not complete implementations of anything. Real
systems add authentication steps, partial captures, settlement windows, scheme calendars,
refunds and disputes that these labs do not attempt. The shapes are true. The details are
illustrative.
