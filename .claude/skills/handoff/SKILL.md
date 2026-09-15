---
name: handoff
description: Write a handoff report for this workshop repository from checks that were actually run, as a file outside the repo. Maintainer task; use only when explicitly asked to prepare a handoff, hand this repo to another agent or engineer, or refresh the handoff report after changes.
disable-model-invocation: true
---

# Preparing a handoff

Maintainer task. Say in one line that you are switching to maintainer mode before you start.

## Run the checks first, then write

Never write a result you did not observe. Run these, capture what they printed, and keep the numbers:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test                 # must pass
pnpm test:exercise 01     # expected failures, per-TODO summary
pnpm build
pnpm e2e                  # must pass
pnpm e2e:exercise         # expected failures
```

Anything you could not run, for any reason, goes in the report as **unverified**, with the reason. An unverified check described as passing is the one thing that makes a handoff worthless.

## The report

A markdown file **outside the repository**, handed to Faris directly. It carries the answer key and internal notes, so it is never committed. Sections:

1. **Where it lives.** Local path, repository, branch, current commit.
2. **References.** Commit SHAs inspected, and a file-level map of what was adopted, changed or excluded. Do not restate `docs/references.md`; link to it and summarise.
3. **The exercise.** Flow, timing split, and the exact TODO files.
4. **Contracts.** Payment states and transitions, the entitlement policy as a deliberate choice, and what the simulator does not do.
5. **Commands.** Setup, launch, reset, compare, test.
6. **Scenario to acceptance test map.**
7. **Checks actually run.** With results, expected starter failures labelled as expected, and everything unverified listed as unverified.
8. **Starter versus solution.** Which files differ and how the boundary is enforced.
9. **Agent setup.** Instructions, skills, MCP servers, permissions, and which connectivity you actually confirmed.
10. **Open questions and recommendations.** Including anything a rehearsal suggested cutting.

## Rules

- Timing you measured yourself is an agent rehearsal, not a human estimate. Label it that way.
- Name real files and real commands. `pnpm lint` runs `scripts/check-docs.mjs`, which will catch you if you invent one.
- Keep it in Faris's voice: practical, direct, emoji on section headings.
