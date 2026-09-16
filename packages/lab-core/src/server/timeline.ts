/**
 * The readable log the console shows.
 *
 * The orchestrator, the gateways and the chaos panel all write to it. It is what you read
 * when the dashboard and your expectations disagree.
 */
import type { TimelineActor, TimelineEntry } from '../contracts/index';
import { getStore, nextId, MAX_TIMELINE_KEPT as MAX_ENTRIES } from './store';

export function logTimeline(entry: { actor: TimelineActor; message: string }): TimelineEntry {
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
