/**
 * Delivery of provider events that are not immediate.
 *
 * Two paths deliver the same queue, on purpose:
 *  - a timer, so an event lands while you watch the screen,
 *  - `deliverDue()`, called at the top of every API handler, so state is still correct
 *    when the timer never ran (dev server restarted, laptop slept, tab was closed).
 *
 * Each delivery is marked before the handler runs, so the two paths can never deliver
 * the same event twice. Even if they did, the event id check in `handleProviderEvent`
 * would catch it, which is the point of having one.
 */
import type { ProviderEvent } from '../contracts/index';
import { handleProviderEvent } from './events';
import { getStore, nextId } from './store';
import { logTimeline } from './timeline';

export function scheduleDelivery(event: ProviderEvent, dueAt: number): void {
  const store = getStore();
  store.pending.push({ deliveryId: nextId('dlv'), dueAt, event, delivered: false });

  const delay = Math.max(0, dueAt - Date.now());
  const timer = setTimeout(() => {
    store.timers.delete(timer);
    deliverDue();
  }, delay);
  // Do not hold the process open for a scheduled event.
  timer.unref?.();
  store.timers.add(timer);
}

/** Deliver everything that is due, oldest first, breaking ties by sequence. */
export function deliverDue(now = Date.now()): number {
  const store = getStore();
  const due = store.pending
    .filter((delivery) => !delivery.delivered && delivery.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt || a.event.sequence - b.event.sequence);

  for (const delivery of due) {
    delivery.delivered = true;
    logTimeline({
      actor: 'provider',
      message: `Delivered ${delivery.event.type} (sequence ${delivery.event.sequence})`,
      eventId: delivery.event.eventId,
      paymentId: delivery.event.paymentId,
    });
    handleProviderEvent(delivery.event);
  }

  if (store.pending.length > 50) {
    store.pending = store.pending.filter((delivery) => !delivery.delivered);
  }
  return due.length;
}

/**
 * Shortcut: stop waiting for the timer and deliver every scheduled event now.
 *
 * It delivers by pretending the clock jumped forward, not by rewriting each due time.
 * Rewriting them would flatten the schedule and quietly fix the out-of-order scenario,
 * which would be a shame, since that scenario is the whole point of ordering by sequence.
 */
export function deliverEverythingNow(): number {
  const store = getStore();
  const waiting = store.pending.filter((delivery) => !delivery.delivered);
  if (waiting.length > 0) {
    logTimeline({
      actor: 'simulator',
      message: `Fast-forwarded ${waiting.length} scheduled event${waiting.length === 1 ? '' : 's'}`,
    });
  }
  return deliverDue(Number.MAX_SAFE_INTEGER);
}

export function pendingDeliveries(now = Date.now()): Array<{ eventId: string; type: ProviderEvent['type']; dueInMs: number }> {
  return getStore()
    .pending.filter((delivery) => !delivery.delivered)
    .map((delivery) => ({
      eventId: delivery.event.eventId,
      type: delivery.event.type,
      dueInMs: Math.max(0, delivery.dueAt - now),
    }));
}
