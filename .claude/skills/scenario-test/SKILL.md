---
name: scenario-test
description: Run the payment lab's deterministic scenarios and test suites, and explain which failures are expected. Use when someone asks to test the exercise, run the scenarios, check whether the starter or solution behaves correctly, or is confused about why pnpm test passes while pnpm test:exercise fails.
argument-hint: "[scenario id, or exercise|solution]"
---

# Testing the payment scenarios

$ARGUMENTS

## The two suites disagree on purpose

| Command | Expected result |
| --- | --- |
| `pnpm test` | **Passes.** Unit tests plus behaviour tests against the solution |
| `pnpm test:exercise 01` | **Fails**, with a per-task summary. Always exits 0 |
| `pnpm e2e` | **Passes.** Playwright against the solution |
| `pnpm e2e:exercise` | **Fails** on the task-dependent specs. Exits 0 |

A fresh checkout with `pnpm test` green and `pnpm test:exercise` red is correct. Never change the starter to make the second one pass, and never report the starter's failures as a broken repository. When you report results, say which command you ran and label the expected failures as expected.

## Running one scenario by hand

Scenarios are deterministic: the same sequence always produces the same states. With an app running:

```bash
BASE=http://localhost:3002   # 3001 for the starter

curl -X POST $BASE/api/simulator/reset
curl -X POST $BASE/api/simulator/scenario -H 'content-type: application/json' \
  -d '{"scenarioId":"delayed-success"}'
curl -X POST $BASE/api/checkout -H 'content-type: application/json' \
  -d '{"purchaseId":"pur_probe","workspaceId":"ws_northstar","method":"bank_debit"}'
curl $BASE/api/entitlements/ws_northstar        # none / payment_processing
curl -X POST $BASE/api/simulator/deliver-now    # stop waiting for the 6s timer
curl $BASE/api/purchases/pur_probe              # succeeded
curl $BASE/api/entitlements/ws_northstar        # active / payment_succeeded
curl $BASE/api/timeline                         # what the server did, and why
```

Scenario ids: `instant-success`, `instant-decline`, `delayed-success`, `delayed-failure`, `duplicate-event`, `out-of-order-event`.

## What each scenario should produce

| Scenario | Server ends at | Timeline should contain |
| --- | --- | --- |
| `delayed-success` | `succeeded` | `applied` |
| `delayed-failure` | `failed` | `applied` |
| `duplicate-event` | `succeeded` | `ignored_duplicate` |
| `out-of-order-event` | `succeeded` | `ignored_stale` |
| Resubmitting a purchase | one payment, not two | `returning the existing payment` |

## Before you report

- Reset between scenarios. State is in memory and shared within one app.
- The starter and the solution have separate state. Do not mix ports in one run.
- If Playwright cannot find a browser: `pnpm exec playwright install chromium`.
