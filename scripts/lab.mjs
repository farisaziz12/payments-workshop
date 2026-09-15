#!/usr/bin/env node
// Bigpdf payments workshop runner.
// Written from scratch for this repository: no dependencies, no install step, no network.
//
//   pnpm exercise 01            start the starter app   (default port 3001)
//   pnpm solution 01            start the solution app  (default port 3002)
//   pnpm compare 01             start both side by side
//   pnpm reset 01               clear the running app's simulated state
//   pnpm test:exercise 01       run behaviour tests against the starter (expected failures)
//   pnpm e2e solution|exercise  run the Playwright suite against one app
//
// Port precedence: --port/-p flag > PORT env var > default for the target.

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';

const ROOT = path.join(import.meta.dirname, '..');

/**
 * Every exercise, by number. Problem and solution sit side by side inside the
 * exercise folder. Add a new exercise by adding a row here.
 */
const EXERCISES = {
  '01': {
    slug: '01.answers-later',
    exercise: '01.problem.answers-later',
    solution: '01.solution.answers-later',
  },
};

const DEFAULT_PORTS = { exercise: 3001, solution: 3002 };

function die(message) {
  console.error(`\n  x ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const rest = [];
  let port;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--port' || arg === '-p') {
      port = Number(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--port=')) {
      port = Number(arg.slice('--port='.length));
    } else {
      rest.push(arg);
    }
  }
  if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    die(`Not a usable port: ${port}`);
  }
  return { port, rest };
}

function resolveSlug(numberish) {
  const key = String(numberish ?? '01').padStart(2, '0');
  const entry = EXERCISES[key];
  if (!entry) {
    const known = Object.keys(EXERCISES).join(', ');
    die(`No exercise ${key}. This repo has: ${known}`);
  }
  return { key, ...entry };
}

function appDir(target, entry) {
  const dir = path.join(ROOT, 'exercises', entry.slug, entry[target]);
  if (!fs.existsSync(dir)) die(`Missing directory: ${path.relative(ROOT, dir)}`);
  return dir;
}

function pickPort(target, flagPort) {
  if (flagPort !== undefined) return flagPort;
  if (process.env.PORT) {
    const fromEnv = Number(process.env.PORT);
    if (!Number.isInteger(fromEnv)) die(`PORT is not a number: ${process.env.PORT}`);
    return fromEnv;
  }
  return DEFAULT_PORTS[target];
}

function portIsFree(port) {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, '127.0.0.1');
  });
}

/** Resolve a workspace binary without assuming a hoisting layout. */
function binFrom(dir, pkg, binName = pkg) {
  const require = createRequire(path.join(dir, 'package.json'));
  let pkgJsonPath;
  try {
    pkgJsonPath = require.resolve(`${pkg}/package.json`);
  } catch {
    die(`Could not find "${pkg}". Run: pnpm install`);
  }
  const manifest = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.[binName];
  if (!bin) die(`"${pkg}" does not expose a "${binName}" binary`);
  return path.join(path.dirname(pkgJsonPath), bin);
}

function run(command, args, options = {}) {
  return spawn(process.execPath, [command, ...args], {
    stdio: options.stdio ?? 'inherit',
    cwd: options.cwd ?? ROOT,
    env: { NEXT_TELEMETRY_DISABLED: '1', ...process.env, ...options.env },
  });
}

/** Prefix each line of a child's output so `compare` stays readable. */
function pipePrefixed(child, label) {
  for (const stream of [child.stdout, child.stderr]) {
    if (!stream) continue;
    let buffer = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) process.stdout.write(`${label} ${line}\n`);
    });
    stream.on('end', () => {
      if (buffer) process.stdout.write(`${label} ${buffer}\n`);
    });
  }
}

function forwardSignals(children) {
  let closing = false;
  const stop = (signal) => {
    if (closing) return;
    closing = true;
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) child.kill(signal);
    }
  };
  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));
  return stop;
}

async function startApp(target, numberish, flagPort, { prefix } = {}) {
  const entry = resolveSlug(numberish);
  const { key, slug } = entry;
  const dir = appDir(target, entry);
  const port = pickPort(target, flagPort);

  if (!(await portIsFree(port))) {
    die(
      `Port ${port} is already in use.\n` +
        `    Another lab app may still be running, or something else owns the port.\n` +
        `    Try: pnpm ${target} ${key} --port ${port + 10}`,
    );
  }

  const label = target === 'exercise' ? 'exercise' : 'solution';
  console.log(`\n  > ${label} ${key} (${slug}) -> http://localhost:${port}\n`);

  const child = run(binFrom(dir, 'next'), ['dev', '--port', String(port)], {
    cwd: dir,
    stdio: prefix ? ['inherit', 'pipe', 'pipe'] : 'inherit',
  });
  if (prefix) pipePrefixed(child, prefix);
  return { child, port, key, slug };
}

async function commandStart(target, argv) {
  const { port, rest } = parseArgs(argv);
  const { child } = await startApp(target, rest[0], port);
  forwardSignals([child]);
  child.on('exit', (code) => process.exit(code ?? 0));
}

async function commandCompare(argv) {
  const { port, rest } = parseArgs(argv);
  if (port !== undefined) {
    die('compare starts two apps, so a single --port cannot apply. Run the two apps in separate terminals to choose both ports.');
  }
  // Check both ports before starting either one, so a busy second port cannot leave
  // the first app running in the background with nothing watching it.
  for (const target of ['exercise', 'solution']) {
    const candidate = DEFAULT_PORTS[target];
    if (!(await portIsFree(candidate))) {
      die(
        `Port ${candidate} is already in use, so compare cannot start the ${target} app.\n` +
          `    Stop whatever is using it, or run the two apps separately with --port.`,
      );
    }
  }

  const exercise = await startApp('exercise', rest[0], undefined, { prefix: '[exercise]' });
  const solution = await startApp('solution', rest[0], undefined, { prefix: '[solution]' });
  const children = [exercise.child, solution.child];
  const stop = forwardSignals(children);
  console.log(
    `\n  Compare them side by side:\n` +
      `    exercise -> http://localhost:${exercise.port}\n` +
      `    solution -> http://localhost:${solution.port}\n` +
      `  Each app keeps its own in-memory state, so they never contaminate each other.\n` +
      `  Ctrl-C stops both.\n`,
  );
  for (const child of children) {
    child.on('exit', (code) => {
      stop('SIGTERM');
      process.exit(code ?? 0);
    });
  }
}

async function commandReset(argv) {
  const { port, rest } = parseArgs(argv);
  const target = rest[1] === 'solution' ? 'solution' : 'exercise';
  const chosen = pickPort(target, port);
  const url = `http://localhost:${chosen}/api/simulator/reset`;
  try {
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) die(`Reset failed: HTTP ${response.status} from ${url}`);
    console.log(`\n  Simulated state cleared on http://localhost:${chosen}\n`);
  } catch {
    die(
      `No app answered on http://localhost:${chosen}.\n` +
        `    Start one first (pnpm exercise 01), or pass --port.\n` +
        `    Restarting the dev server also clears state: it lives in memory.`,
    );
  }
}

function vitest(args, options = {}) {
  return run(binFrom(ROOT, 'vitest'), args, options);
}

async function commandTestExercise(argv) {
  const { rest } = parseArgs(argv);
  const { key } = resolveSlug(rest[0]);
  console.log(
    `\n  Running the behaviour tests against the STARTER for exercise ${key}.\n` +
      `  Failures here are the point: each one names the TODO that still needs work.\n`,
  );

  const reportPath = path.join(os.tmpdir(), `bigpdf-exercise-${process.pid}.json`);
  const child = vitest(
    ['run', '--project', 'exercise', '--reporter=default', '--reporter=json', `--outputFile.json=${reportPath}`],
    { env: { CI: '1' } },
  );

  child.on('exit', () => {
    const report = readReport(reportPath);
    if (report) summarise(report);
    else console.log('\n  (Could not summarise the run. The reporter output above is the source of truth.)\n');
    // Expected failures are not a broken repo, so this command always succeeds.
    process.exit(0);
  });
}

function readReport(reportPath) {
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    fs.rmSync(reportPath, { force: true });
    return report;
  } catch {
    return null;
  }
}

function summarise(report) {
  const perTodo = new Map();
  for (const suite of report.testResults ?? []) {
    for (const test of suite.assertionResults ?? []) {
      const titles = [...(test.ancestorTitles ?? []), test.title ?? ''];
      const todo = titles.join(' ').match(/\[TODO \d]/)?.[0] ?? 'other checks';
      const entry = perTodo.get(todo) ?? { total: 0, failed: 0 };
      entry.total += 1;
      if (test.status === 'failed') entry.failed += 1;
      perTodo.set(todo, entry);
    }
  }

  console.log('  -- Starter progress -----------------------------');
  for (const [todo, { total, failed }] of [...perTodo].sort()) {
    const state = failed === 0 ? `done, all ${total} checks pass` : `${failed} of ${total} checks still failing`;
    console.log(`   ${todo}  ${state}`);
  }
  console.log('  -------------------------------------------------');

  const totalFailed = [...perTodo.values()].reduce((sum, entry) => sum + entry.failed, 0);
  console.log(
    totalFailed === 0
      ? '\n  All three TODOs pass. Run `pnpm test` to check the solution suite too.\n'
      : '\n  Keep going. `pnpm exercise 01` shows the same problems in the browser.\n',
  );
}

async function commandE2e(argv) {
  const { rest } = parseArgs(argv);
  const target = rest[0] === 'exercise' ? 'exercise' : 'solution';
  console.log(
    target === 'exercise'
      ? '\n  Running the end-to-end suite against the STARTER. Failures are expected until the TODOs are done.\n'
      : '\n  Running the end-to-end suite against the SOLUTION. These must all pass.\n',
  );
  const child = run(binFrom(ROOT, '@playwright/test', 'playwright'), ['test', '--project', target], {
    env: { E2E_TARGET: target },
  });
  child.on('exit', (code) => process.exit(target === 'exercise' ? 0 : code ?? 0));
}

const [command, ...argv] = process.argv.slice(2);

switch (command) {
  case 'exercise':
  case 'solution':
    await commandStart(command, argv);
    break;
  case 'compare':
    await commandCompare(argv);
    break;
  case 'reset':
    await commandReset(argv);
    break;
  case 'test-exercise':
    await commandTestExercise(argv);
    break;
  case 'e2e':
    await commandE2e(argv);
    break;
  default:
    die(
      `Unknown command: ${command ?? '(none)'}\n` +
        '    Try: pnpm exercise 01 | pnpm solution 01 | pnpm compare 01 | pnpm reset 01',
    );
}
