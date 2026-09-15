# 🤖 Optional agent setup

**None of this is required.** The exercise is built to be done from the starter README with an editor and a browser. Nothing in the repository depends on an AI assistant, an MCP server or an API key. If you would rather work without one, skip this page entirely; you will not be missing a step.

If you do use Claude Code, this page covers what ships in the repository, how to check it loaded, and how to remove it.

## 📦 What is in the repository

| File | What it does |
| --- | --- |
| `AGENTS.md` | The shared project guide. Tool-agnostic |
| `CLAUDE.md` | Imports `AGENTS.md`, then adds Claude Code specifics |
| `.claude/skills/*/SKILL.md` | Five project skills, listed below |
| `.claude/settings.json` | Pre-approves the repository's own `pnpm` commands, prompts before a commit or a push, denies publishes, `.env` reads and build-script approval |
| `.mcp.json` | Two optional MCP servers, both requiring your approval on first use |

## 🎓 The two modes

**Attendee tutor is the default.** The assistant asks what you observed, helps you reproduce it, and gives hints one level at a time. It will not complete the TODOs, read you the solution, or edit anything under `solutions/`. If you explicitly ask for the answer, it gives it.

**Maintainer mode is opt-in.** Say so plainly: "switch to maintainer mode". Then it will implement changes, run the full check suite, compare the starter and the solution, update teaching materials and produce a handoff.

## 🧰 Skills

| Skill | For |
| --- | --- |
| `/tutor` | Working through the exercise without spoilers |
| `/scenario-test` | Running the deterministic scenarios and reading the results, including which failures are expected |
| `/payment-review` | Reviewing a change against the payment-state and entitlement rules |
| `/handoff` | Regenerating `HANDOFF.md` from checks that were actually run (maintainer) |
| `/workshop-voice` | Editing prose into the workshop's voice (maintainer) |

**Verify they loaded:** run `/skills` in a session started at the repository root, or type `/` and look for them in the list. If they are missing, check you started Claude Code from the repository root, since project skills are discovered from the working directory.

## 🔌 MCP servers, both optional

`.mcp.json` is project-scoped, so Claude Code asks you to approve it the first time you open the repository. Decline and everything still works.

### context7

Version-specific documentation for Next.js, React, Vitest, Playwright and the rest. Configured as the remote HTTP server at `https://mcp.context7.com/mcp`.

- **It has to be authorized before its tools work.** The remote server asks you to sign in the first time. Run `/mcp` in a session, or `claude mcp` from a terminal, and follow the prompt. A non-interactive session cannot do this, so there the server stays unusable and the assistant should fall back to official documentation.
- **Requires network access** to `mcp.context7.com`. Offline, or behind a proxy that blocks it, the server simply will not connect. The assistant is told to fall back to official documentation and to say that it did.
- **Whatever you do, do not put a key in this file.** `.mcp.json` is committed. If you have an API key, add a personal server instead, which lands in your own configuration:

  ```bash
  claude mcp add --transport http --scope user context7-authed https://mcp.context7.com/mcp \
    --header "Authorization: Bearer YOUR_API_KEY"
  ```

  Free keys come from the Context7 dashboard. Never commit one.

### playwright

Lets the assistant drive the lab in a real browser. Locked down on purpose:

- `--headless`, so nothing takes over your screen,
- `--isolated`, so the browser profile stays in memory and is thrown away,
- `--allowed-origins "http://localhost:3001;http://localhost:3002"`, so it can reach the two lab apps and nothing else.

It runs via `npx`, so the first use downloads the package. **The browser tests do not need it**: `pnpm e2e` and `pnpm e2e:exercise` run the same specs through ordinary repository commands, with no MCP involved.

### Verifying connectivity

```bash
claude mcp list          # ✔ connected / ✘ failed / ⏸ pending approval
claude mcp get context7
```

Or `/mcp` inside a session, which also shows the tools each server exposes.

## 🧹 Removing it

Per project, keep the repository as it is and just turn the servers off in `.claude/settings.json`:

```json
{ "disabledMcpjsonServers": ["context7", "playwright"] }
```

Or delete what you do not want. `.mcp.json`, `.claude/`, `AGENTS.md` and `CLAUDE.md` can all be removed without breaking a single `pnpm` command, which is the point.

To reset your approval choices for this project:

```bash
claude mcp reset-project-choices
```

## 🔐 What this setup does not do

- No secrets, tokens or `.env` files are committed, and nothing here asks for one.
- No `bypassPermissions`, no permissive default mode, no hooks.
- Commits and pushes always prompt. Publishing to a registry and approving dependency build scripts are denied outright.
- No filesystem, shell-execution or write-capable account integrations.
- No global installs. Nothing is installed outside this repository.
- Dependency install hooks stay blocked. `pnpm approve-builds` is in the deny list.

## ⚠️ Verified, and not verified

Written against the current Claude Code documentation for [skills](https://code.claude.com/docs/en/skills), [MCP](https://code.claude.com/docs/en/mcp), [settings](https://code.claude.com/docs/en/settings) and [memory](https://code.claude.com/docs/en/memory), plus the Context7 and Playwright MCP READMEs.

The skill and settings files were validated as written, and the Playwright MCP flags come from its documented options.

What was confirmed on the machine this was built on:

- **The skills load.** A session started in this repository listed `tutor`, `scenario-test`, `payment-review` and `workshop-voice`. `handoff` is user-invocable only, by design, so it does not appear in that listing.
- **The Playwright server connects** and its tools become available.
- **The Context7 server needs authorizing.** It was never reached, partly because that machine's network blocked the host, and it also reported that it wants you to sign in first. Expect to do that once before it is of any use.
