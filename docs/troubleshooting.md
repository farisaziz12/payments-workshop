# 🆘 Troubleshooting

## 🔌 Ports

The starter runs on **3001** and the solution on **3002** so both can run at once without colliding.

```bash
pnpm exercise 01 --port 4001     # flag wins
PORT=4001 pnpm exercise 01       # env var, used when there is no flag
```

If a port is busy the runner refuses to start and prints the flag to use. It does not silently pick another port, because a scenario you selected on one port and a payment you made on another is exactly the sort of confusion this lab is trying to teach you to avoid.

`pnpm compare 01` starts both on their defaults. To choose both ports, run the two apps in separate terminals.

Something left running from a previous session? The process is a `next dev` under the runner. Close that terminal, or find it with `lsof -i :3001`.

## 💾 Persistence, or the lack of it

**All state lives in memory, in the dev server process.** Purchases, payments, seen event ids, scheduled deliveries and the timeline. Nothing is written to disk and there is no database.

What follows from that:

- **Restarting the dev server clears everything.** That is the reset of last resort and it always works.
- **Scheduled provider events do not survive a restart.** Start a `delayed-success` payment, restart within six seconds, and that event is gone. The payment stays `processing` forever. Reset and start again.
- **The starter and the solution have separate state.** They are separate processes. A payment made on 3001 is invisible on 3002, which is what makes `pnpm compare 01` safe.
- **The browser keeps one thing: the purchase id**, in `localStorage`, plus the copy in the URL. Reset from the UI clears both. `pnpm reset 01` only clears the server, so if you reset from the terminal you may want to clear site data too.

## ♻️ Resetting

| How | Clears |
| --- | --- |
| **Reset everything** button in the control panel | server state, `localStorage`, and reloads the page |
| `pnpm reset 01` | server state only. Add `--port` if you moved the app |
| Restart the dev server | everything, always |

## 🔥 Dev server limitations

- **Hot reloading keeps the state.** The store hangs off `globalThis` on purpose, so editing a lab file does not wipe the payment you were looking at. Occasionally you want the opposite: reset, or restart.
- **A hot reload can look like a hang.** Turbopack recompiles on save; the first request after an edit is slower.
- **Scheduled events are also replayed lazily.** Every API request first delivers anything that has come due, so even if the timer was lost while the process was busy, the next poll brings the state up to date. This is why closing the tab and coming back still works.
- **`next dev` is not `next build`.** Both apps do build for production (`pnpm build`), but the lab is meant to be run in dev.

## 🧪 Tests

**`pnpm test` fails but I have not written anything.** It should not. It runs the shared unit tests and the behaviour tests against the *solution*. If it fails on a clean checkout, that is a repository bug, not yours.

**`pnpm test:exercise 01` fails, and reports failures.** That is what it is for. It always exits 0; the summary tells you which TODO still has work.

**Playwright cannot find a browser.** Once per machine:

```bash
pnpm exec playwright install chromium
```

**Playwright says the port is already in use.** It reuses a dev server you already have running on the target port. If that server is the *other* app, stop it first.

**Do not run two end-to-end suites at once.** They reuse whatever dev server is on the port, and the lab's state is shared within one app, so two runs will reset each other mid-test and fail in ways that have nothing to do with your code. The same goes for running a suite while you have the app open and a payment in progress: every spec starts by resetting the server.

## 📦 Install

**`pnpm install` complains about ignored build scripts.** Expected, and fine. pnpm 10 blocks dependency lifecycle scripts by default and this repository does not approve any. Nothing in the lab needs them.

**Wrong Node version.** Next 16 needs Node 20.9 or newer. `.nvmrc` pins 22.

**No pnpm?** `corepack enable`, then `pnpm install`. The version is pinned in `package.json` under `packageManager`.

## 🎨 Appearance

The interface follows your operating system's light or dark setting. If it looks wrong, the theme class is set on `<html>` before the first paint by `next-themes`, so a hard reload is the thing to try. There is no theme toggle in the lab.

## 🌐 Network

After `pnpm install`, nothing in the app reaches the internet. No provider, no telemetry (the runner sets `NEXT_TELEMETRY_DISABLED=1`), no fonts, no images from a CDN. If your laptop is offline during the workshop, everything still works.
