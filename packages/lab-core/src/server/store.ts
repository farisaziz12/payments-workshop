/**
 * The application server's memory.
 *
 * Everything the lab treats as authoritative lives here: charges, attempts, what each
 * gateway has already captured, the ledger and which faults are switched on.
 *
 * Two deliberate choices:
 *  - It is in-memory. Restarting the dev server clears it, which is the reset of last resort.
 *  - It hangs off `globalThis` so it survives hot reloads while you edit files. Plain objects
 *    and built-in Maps only: a class instance would fail `instanceof` after a module reload.
 */
import type { Attempt, IncidentId, Ledger, Segment, TimelineEntry } from '../contracts/index';

export type Charge = {
  chargeId: string;
  segment: Segment;
  amountMinor: number;
  attemptIds: string[];
  settled: boolean;
};

export type Capture = {
  idempotencyKey: string;
  chargeId: string;
  gatewayId: string;
};

export type LabState = {
  /** Newest last. Trimmed, because a game day runs for minutes and nobody reads row 4000. */
  attempts: Attempt[];
  charges: Map<string, Charge>;
  /** What each gateway thinks it has captured, keyed the way a real gateway keys it. */
  captures: Map<string, Capture>;
  ledger: Ledger;
  activeIncidents: Set<IncidentId>;
  running: boolean;
  /** Epoch milliseconds of the last simulated advance. */
  lastAdvanceAt: number;
  timeline: TimelineEntry[];
  counters: { charge: number; attempt: number; timeline: number };
  /** Seeded, so the same game day happens for everybody and again after a reset. */
  rng: number;
};

export const TRAFFIC_SEED = 0x5eed_1a5;
export const MAX_ATTEMPTS_KEPT = 600;
export const MAX_TIMELINE_KEPT = 200;

const STORE_KEY = Symbol.for('bigpdf.lab.store');

type GlobalWithStore = typeof globalThis & { [STORE_KEY]?: LabState };

function emptyLedger(): Ledger {
  return {
    captured: 0,
    capturedMinor: 0,
    feesMinor: 0,
    misrouted: 0,
    abandoned: 0,
  };
}

function createState(): LabState {
  return {
    attempts: [],
    charges: new Map(),
    captures: new Map(),
    ledger: emptyLedger(),
    activeIncidents: new Set(),
    running: true,
    lastAdvanceAt: Date.now(),
    timeline: [],
    counters: { charge: 0, attempt: 0, timeline: 0 },
    rng: TRAFFIC_SEED,
  };
}

export function getStore(): LabState {
  const holder = globalThis as GlobalWithStore;
  holder[STORE_KEY] ??= createState();
  return holder[STORE_KEY];
}

/** Clear every trace of the current run. The same traffic replays from the same seed. */
export function resetStore(): LabState {
  const holder = globalThis as GlobalWithStore;
  holder[STORE_KEY] = createState();
  return holder[STORE_KEY];
}

export function nextId(prefix: 'chg' | 'att' | 'tl'): string {
  const store = getStore();
  const key = ({ chg: 'charge', att: 'attempt', tl: 'timeline' } as const)[prefix];
  store.counters[key] += 1;
  return `${prefix}_${store.counters[key]}`;
}

/**
 * mulberry32. Small, fast, and most importantly deterministic: the same seed produces
 * the same run, so a scenario an attendee saw is a scenario you can reproduce.
 */
export function random(): number {
  const store = getStore();
  store.rng = (store.rng + 0x6d2b_79f5) | 0;
  let t = store.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
}

export function recordAttempt(attempt: Attempt): void {
  const store = getStore();
  store.attempts.push(attempt);
  if (store.attempts.length > MAX_ATTEMPTS_KEPT) {
    store.attempts.splice(0, store.attempts.length - MAX_ATTEMPTS_KEPT);
  }
  const charge = store.charges.get(attempt.chargeId);
  if (charge) charge.attemptIds.push(attempt.attemptId);
}
