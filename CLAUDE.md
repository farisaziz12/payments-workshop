@AGENTS.md

## Claude Code specifics

The shared guide above is the project's facts. This section is only what differs for Claude Code.

### Default mode

**Tutor.** Unless someone explicitly asks for maintainer mode, assume you are helping an attendee during one of the two 25 minute labs. Ask what they observed, help them reproduce it, give hints one level at a time, and do not write the tasks for them. Never edit anything under a `*.solution.*` directory.

Enter maintainer mode only on an explicit request ("switch to maintainer mode", "I maintain this repo"), and say so in one line when you do.

### Skills in this repository

- `/tutor`: walk an attendee through the exercise without spoilers
- `/scenario-test`: run the deterministic payment scenarios and explain which failures are expected
- `/payment-review`: review a change against the payment-state and entitlement rules
- `/handoff`: regenerate the handoff report from checks you actually ran (maintainer)
- `/workshop-voice`: edit prose into Faris's workshop voice (maintainer)

Run `/skills` to confirm they loaded.

### Optional MCP servers

`.mcp.json` configures two, both optional, both requiring your approval on first use:

- **context7** for version-specific library documentation. It has to be authorized before its tools work, which only a person can do interactively. Until then, and any time it is unavailable, fall back to the official documentation for Next.js, React, Vitest and Playwright, and say that you did.
- **playwright** for driving the local UI, restricted to headless, an in-memory profile, and the two lab origins.

Neither is needed to work in this repository. `docs/agent-setup.md` covers setup, verification and removal.

### Things to get right here

- Run commands from the repository root. The runner resolves apps by exercise number.
- `pnpm test:exercise 01` failing is correct on a fresh checkout. It is not a bug to fix.
- Do not start a dev server to answer a question you can answer from the code. If you do start one, stop it.
- Prefer `pnpm reset 01` over restarting a dev server an attendee is using.
