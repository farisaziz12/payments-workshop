# Payments and Monetization at Scale for Frontend Engineers

Exercise repository for the workshop by **Faris Aziz**.

One lab, 25 minutes. You fix a checkout that tells customers a story its own server disagrees with.

Everything runs on your machine. No provider account, no API keys, no card details, no money, and no internet connection once you have installed.

## 🚀 Start here

```bash
corepack enable      # if you do not have pnpm
pnpm install
pnpm exercise 01     # http://localhost:3001
```

Then open **[exercises/01.two-timelines](./exercises/01.two-timelines/README.md)** and work from there.

Needs Node 20.9 or newer. `.nvmrc` pins 22.

## 🗺 Where things are

| Path | What it is |
| --- | --- |
| [`exercises/01.two-timelines/`](./exercises/01.two-timelines/README.md) | The lab. Start here |
| `exercises/01.two-timelines/01.problem.two-timelines/` | The starter you edit, port 3001 |
| `exercises/01.two-timelines/01.solution.two-timelines/` | The finished version, port 3002 |
| `packages/lab-core/` | Everything that is built for you: contracts, simulated provider, server, UI kit |
| [`docs/`](./docs/payment-state-contracts.md) | Contracts, scenarios, troubleshooting, agent setup, provenance |

## 🔌 Commands

| Command | What it does |
| --- | --- |
| `pnpm exercise 01` | Start the starter |
| `pnpm solution 01` | Start the finished version |
| `pnpm compare 01` | Both at once, separate state |
| `pnpm reset 01` | Clear the simulated state without restarting |
| `pnpm test:exercise 01` | Your progress, one line per task |
| `pnpm check` | Typecheck, lint, test and build |

Port taken? `pnpm exercise 01 --port 4001`.

**Two suites disagree on purpose.** `pnpm test` must pass: it runs the shared unit tests and the behaviour tests against the finished version. `pnpm test:exercise 01` is supposed to fail on a fresh checkout, because its failures are the specification. It always exits 0.

## 📖 Documentation

| Doc | Read it when |
| --- | --- |
| [Payment and entitlement contracts](./docs/payment-state-contracts.md) | You want the state machine, the event rules and the access policy |
| [Scenarios](./docs/chaos-scenarios.md) | You want to know what each simulated scenario does |
| [Troubleshooting](./docs/troubleshooting.md) | Ports, persistence, dev server limits |
| [Agent setup](./docs/agent-setup.md) | You want to use an AI assistant. Entirely optional |
| [References](./docs/references.md) | You want to know where the conventions came from |

## ⚠️ About the simulation

The provider is called SimPay and it is simulated. It is not a model of any real payment provider, and its two timelines are not a complete implementation of any real payment rail. Real rails add authentication steps, partial captures, settlement windows, refunds, disputes and delivery guarantees that this lab does not attempt. The shapes are true. The details are illustrative.
