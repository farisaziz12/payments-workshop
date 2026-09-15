/**
 * The readable event timeline.
 *
 * Every actor writes to it: the customer's clicks, the application server's decisions,
 * the simulated provider's deliveries, and the simulator itself. It is the thing you
 * read when the UI and the server disagree.
 */
import type { EventOutcome, TimelineActor, TimelineEntry } from '../contracts/index';
import { getStore, nextId } from './store';

const MAX_ENTRIES = 200;

export function logTimeline(entry: {
  actor: TimelineActor;
  message: string;
  paymentId?: string;
  eventId?: string;
  outcome?: EventOutcome;
}): TimelineEntry {
  const store = getStore();
  const row: TimelineEntry = {
    id: nextId('tl'),
    at: new Date().toISOString(),
    ...entry,
  };
  store.timeline.push(row);
  if (store.timeline.length > MAX_ENTRIES) store.timeline.splice(0, store.timeline.length - MAX_ENTRIES);
  return row;
}

/** Newest first, which is how the UI shows it. */
export function readTimeline(): TimelineEntry[] {
  return [...getStore().timeline].reverse();
}
