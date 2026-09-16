/**
 * The traffic Bigpdf takes while you are working.
 *
 * Attempts are produced from a seeded generator, so every attendee sees the same mix and
 * a reset replays it. Nothing here rolls an unseeded die.
 *
 * There is no background timer. Each request advances the simulation by however much
 * time has passed, which keeps the run deterministic and leaves no stray intervals
 * behind a hot reload.
 */
import type { Segment } from '../contracts/index';
import { PLAN } from '../contracts/index';
import { getStore, random } from './store';

/** Every segment that takes live traffic. The mix is roughly a European SaaS. */
export const SEGMENTS: ReadonlyArray<Segment> = [
  { method: 'card', country: 'DE', currency: 'EUR' },
  { method: 'card', country: 'FR', currency: 'EUR' },
  { method: 'card', country: 'GB', currency: 'GBP' },
  { method: 'sepa_debit', country: 'DE', currency: 'EUR' },
  { method: 'sepa_debit', country: 'FR', currency: 'EUR' },
];

const WEIGHTS: ReadonlyArray<number> = [0.34, 0.24, 0.2, 0.13, 0.09];

export const ATTEMPTS_PER_SECOND = 5;

/** Never simulate more than this in one advance, however long the tab was in the background. */
const MAX_CATCH_UP = 40;

export function pickSegment(): Segment {
  const roll = random();
  let cumulative = 0;
  for (let index = 0; index < SEGMENTS.length; index += 1) {
    cumulative += WEIGHTS[index] ?? 0;
    if (roll < cumulative) return SEGMENTS[index] as Segment;
  }
  return SEGMENTS[0] as Segment;
}

export function amountFor(segment: Segment): number {
  // One plan, one price. GBP is priced separately rather than converted.
  return segment.currency === 'GBP' ? 1800 : PLAN.amountMinor;
}

/**
 * How many charges should have happened since the last advance.
 * Returns zero when the simulation is paused.
 */
export function chargesDue(now: number): number {
  const store = getStore();
  if (!store.running) {
    store.lastAdvanceAt = now;
    return 0;
  }
  const elapsed = Math.max(0, now - store.lastAdvanceAt);
  const due = Math.floor((elapsed * ATTEMPTS_PER_SECOND) / 1000);
  if (due === 0) return 0;
  const capped = Math.min(due, MAX_CATCH_UP);
  store.lastAdvanceAt = now;
  return capped;
}
