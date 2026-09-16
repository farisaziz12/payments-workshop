# 📚 References and provenance

What this repository borrowed, what it changed, and what it deliberately left behind. Both reference repositories were inspected read-only. Neither was modified, and no code was copied from either.

## Repositories inspected

| Repository | Commit inspected | Licence | How it was used |
| --- | --- | --- | --- |
| `farisaziz12/payments-chaos` | `42932ec0ee88139d14a778bbeba5b2f62396b38e` | **None.** No LICENSE file, no `license` field, `"private": true` | Ideas only. Default copyright means the code is not reusable without the owner's permission |
| `farisaziz12/nextjs-architecture-workshop` | `0e738cd8d1a3e51f7fe57649d8634be89d532d4b` | **None.** `package.json` claims MIT with no LICENSE file to back it | Conventions only. See the security note below |
| `petergyang/no-ai-slop` | `000650b156983f5159695b441477f4e63b25dc85` | MIT, © 2026 Peter Yang | Adapted into `.claude/skills/workshop-voice/`, with the notice and attribution the licence requires |

## 🚨 Security note on `nextjs-architecture-workshop`

**Do not run anything from that repository.** An obfuscated, self-decoding payload is appended to eleven files, hidden behind roughly 2,000 spaces at the end of the last line:

- `scripts/run-exercise.js`, `scripts/run-solution.js`, `scripts/mock-api.js`
- every `postcss.config.js` / `postcss.config.mjs` in all four exercises and all four solutions

The payload is byte-identical in each location. It hoists `require`, `module`, `__dirname` and `__filename` onto `global`, obtains the `Function` constructor indirectly as `someFunction['constructor']` to avoid the string `eval`, decodes a ~3,400 character blob with a bespoke shuffle-and-dictionary scheme, and executes it immediately at module load. The four `.mjs` copies were additionally given `import { createRequire } from 'module'` lines so the payload works under ESM, which makes this a targeted change rather than a generic dropper.

Because the `postcss` configs are infected, *any* `next dev` or `next build` in that repository runs it, not only the three runner scripts.

It appears only in the HEAD commit `0e738cd` ("improve comments"), which also makes genuine comment changes across 24 files; the parent `7f80233` is clean. There are no install hooks in any `package.json` there, and `.npmrc` is unremarkable.

Nothing from those files reached this repository. Every runner, config and script here was written from scratch.

## From `nextjs-architecture-workshop` (conventions)

**Adopted**

| Idea | Their source | Here |
| --- | --- | --- |
| Parallel `exercises/<nn>-<slug>` and `solutions/<nn>-<slug>` trees with identical slugs | repository root | same layout |
| Numbered launch commands, `01` and `1` both accepted, number to slug lookup | `nextjs-architecture-workshop/scripts/run-exercise.js:14-22` | `scripts/lab.mjs`, rewritten |
| Exercise README skeleton with emoji headings | `nextjs-architecture-workshop/exercises/01-circuit-breaker/README.md` | `exercises/01.game-day/README.md` |
| In-code markers separating "do this" from "read this, leave it alone" | `nextjs-architecture-workshop/exercises/01-circuit-breaker/pages/api/products/index.ts:5-8` | the same idea, different glyphs: 🦆 and 🧾 in the three lab files |
| Checkbox acceptance criteria phrased as observable behaviour | their exercise READMEs | "You'll know you're done when" |
| Solution README explaining the key implementation choices | `nextjs-architecture-workshop/solutions/01-circuit-breaker/README.md` | `exercises/01.game-day/01.solution.game-day/README.md` |
| A control panel for failure injection, with a reset | their `scripts/mock-api.js` and `core-app/mocks/dashboard.html` | the in-app simulator panel |

**Changed**

- One workspace install and one lockfile. They carry nine `package.json` files each with its own lockfile, and each runner shells out to `pnpm install` on every start.
- Ports are overridable, with `--port` beating `PORT`. Theirs are hardcoded, and their README says so.
- Tests exist. Theirs has none: no test runner, no specs, verification is entirely manual.
- One layout everywhere. Theirs mixes flat and `src/`, which their README flags as debt.
- Hints are progressive, in a separate file. Theirs are a flat bullet list in the README.
- No randomness. Their mock API injects failures at a configurable random rate; every scenario here is deterministic.

**Excluded**

- Every file in their `scripts/` and every `postcss.config.*`, for the reason above.
- Express and socket.io. The lab's server is the Next app itself.
- `pnpm install` inside the runner.
- Their `next build` and `next start` path for some exercises. Everything here runs in dev.

## From `payments-chaos` (domain ideas)

**Adopted as ideas, reimplemented**

| Idea | Their source | Here |
| --- | --- | --- |
| A named fault catalogue with human descriptions, switched on from a panel | `src/components/ChaosControlPanel.tsx:6-91` | `packages/lab-core/src/server/incidents.ts` |
| Separating a timeout from an error as distinct failure types | `src/services/chaosEngine.ts:46-91` | `ApiResult` kinds, and the client-timeout scenario |
| Human-readable reasoning strings attached to outcomes | `src/components/OrchestrationVisualization.tsx:86-97` | the event timeline's messages |
| Reset by recreating state rather than mutating it back | `src/context/PaymentOrchestrationContext.tsx:268-275` | `resetStore()` |
| The vestigial `'pending'` payment status | `src/types/payment.ts:96` (set then immediately overwritten at `chaosEngine.ts:108-123`, so never observable) | a real `processing` state with its own timeline |

**Changed**

- Deterministic scenarios instead of `Math.random()` (`src/services/chaosEngine.ts:113,116`).
- Server-authoritative state instead of client state in React context and `localStorage`.
- A real payment lifecycle. Theirs models gateway health (`healthy`, `degraded`, `failed`, `maintenance`) and has no payment state machine, no events, no webhooks, no idempotency and no entitlement logic at all.

**Excluded**

- Multi-gateway routing and fallback strategies, geography and currency eligibility rules. Interesting, and a different lesson.
- The Monaco editor running learner code through `new Function` (`src/components/OrchestrationIDE.tsx:489`). Excellent idea, too large for 25 minutes.
- Tailwind, and the Pages Router.

## Repository structure

The layout follows the [Epic Web](https://github.com/epicweb-dev/react-fundamentals) conventions, checked against commit `9a215a1`.

**Adopted.** Dot-numbered directories (`01.game-day`), problem and solution colocated inside the exercise folder rather than in two distant top-level trees, a short concept README at the exercise level with a task README per step, and a `FINISHED.md` wrap-up.

**Changed.** The in-code markers are theirs in spirit and ours in glyph: 🦆 for a task, 🧾 for background you should not change, 💰 for a hint. Only the last one is also theirs, and it stays because money is what this lab is about. The koala and the owl belong to their workshop.

**Skipped, with reasons.** Their `epicshop` workshop app, because adopting a whole platform for one lab is not worth it. Their `.mdx` with React callout components, because this repo is read on GitHub, so plain markdown and GitHub alerts render everywhere. Their `public/` and `shared/` folders, which this lab has no use for.

The standalone exercise brief under `docs/` was deleted. It restated the exercise README almost line for line, and two copies of the same brief drift apart. The exercise README is the single source.

## The interface

The lab uses **Radix Themes** (`@radix-ui/themes`) as its component library, with `@radix-ui/react-icons` for glyphs and `next-themes` for the light and dark switch that Radix's own documentation recommends. That choice buys accessible components, a 12-step colour scale, dark mode and one radius scale without anyone hand-writing CSS: the repository now contains about twenty lines of its own stylesheet instead of several hundred.

It also serves the exercise. All three lab files are plain functions returning plain values. Nothing an attendee writes contains a class name, a colour or a component, so the 25 minutes go on payment state rather than markup.

The design decisions live in one file, `packages/lab-core/src/ui/theme.ts`: one accent (jade), one grey (slate), one radius, and a status scale that is deliberately separate from the accent because status is data, not decoration. Every status carries an icon and a word as well as a colour, since colour alone is not an accessible signal.

The design pass followed the [taste-skill](https://github.com/Leonxlnx/taste-skill) rules at commit `ccbc15639c97057cbfcf32ecebc38ef716e4bb37` (MIT, © 2026 Leonxlnx). Said plainly: that skill says in its own Section 13 that it is not for dense product UI, and this is product UI. The parts that transfer were applied, namely the design-system map that points at Radix Themes, the colour and shape consistency locks, the interactive-state rules (loading skeletons, empty and error states), the forbidden AI tells, and the pre-flight check. The landing-page parts, heroes, bento grids, eyebrow counts and scroll choreography, do not apply to an operations console and were not forced onto one.

## Toolchain versions, verified against the npm registry on 2026-09-15

`next@16.3.5`, `react@19.3.0`, `typescript@5.9.3`, `eslint@9.39.5` with `eslint-config-next@16.3.5`, `vitest@5.0.1`, `@playwright/test@1.56.1`, `@radix-ui/themes@3.3.0`, `@radix-ui/react-icons@1.3.2`, `next-themes@0.4.6`, pnpm pinned at `10.33.0`, Node `>=20.9.0`.

Two version choices, and why:

- **TypeScript stays on 5.9** although 7.0 is published, because the ESLint and Next tooling in this workspace targets the 5.x line.
- **ESLint stays on 9** although 10 is published. `eslint-plugin-react@7.37.5`, which `eslint-config-next` depends on, crashes on ESLint 10 (`contextOrFilename.getFilename is not a function`) and declares support only up to `^9.7`.
- **Playwright is pinned exactly to 1.56.1**, not a range, so the browser build it expects matches the one `pnpm exec playwright install chromium` fetches.
