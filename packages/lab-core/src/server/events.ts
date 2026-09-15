/**
 * Provider event handling: the rules that decide whether an event changes anything.
 *
 * In a real system this is the webhook endpoint. Here the simulated provider calls it
 * in process, which keeps the lesson (ordering, duplicates, unknown ids) and drops the
 * infrastructure (signatures, retries, queues).
 *
 * The rules are evaluated in this order, and every one of them writes a timeline row:
 *
 *   1. unknown payment id      -> rejected, nothing changes
 *   2. unknown event type      -> rejected, nothing changes
 *   3. event id already seen   -> duplicate, nothing changes
 *   4. sequence <= last applied-> stale, nothing changes
 *   5. otherwise               -> applied, even if the sequence skipped ahead
 *
 * Note what is deliberately NOT a rule: "ignore everything once the payment is terminal".
 * Real lifecycles keep going after `succeeded` (refunds, disputes, chargeback reversals),
 * so the ordering guarantee has to come from the per-payment sequence, not from a guess
 * about whether we are finished.
 */
import type { EventOutcome, Payment, PaymentStatus, ProviderEvent, ProviderEventType } from '../contracts/index';
import { getStore } from './store';
import { logTimeline } from './timeline';

const STATUS_BY_EVENT: Record<ProviderEventType, PaymentStatus> = {
  'payment.processing': 'processing',
  'payment.succeeded': 'succeeded',
  'payment.failed': 'failed',
};

export type EventResult = {
  outcome: EventOutcome;
  payment: Payment | null;
  note?: string;
};

function isKnownType(type: string): type is ProviderEventType {
  return type in STATUS_BY_EVENT;
}

export function handleProviderEvent(event: ProviderEvent): EventResult {
  const store = getStore();
  const payment = store.payments.get(event.paymentId) ?? null;

  if (!payment) {
    logTimeline({
      actor: 'app',
      message: `Rejected ${event.type}: no payment ${event.paymentId} on this server`,
      eventId: event.eventId,
      outcome: 'rejected_unknown_payment',
    });
    return { outcome: 'rejected_unknown_payment', payment: null };
  }

  if (!isKnownType(event.type)) {
    logTimeline({
      actor: 'app',
      message: `Rejected an event of unknown type "${event.type}"`,
      eventId: event.eventId,
      paymentId: payment.paymentId,
      outcome: 'rejected_unknown_type',
    });
    return { outcome: 'rejected_unknown_type', payment };
  }

  if (store.seenEventIds.has(event.eventId)) {
    logTimeline({
      actor: 'app',
      message: `Ignored a duplicate delivery of ${event.type} (${event.eventId} was already handled)`,
      eventId: event.eventId,
      paymentId: payment.paymentId,
      outcome: 'ignored_duplicate',
    });
    return { outcome: 'ignored_duplicate', payment };
  }

  store.seenEventIds.add(event.eventId);

  if (event.sequence <= payment.lastAppliedSequence) {
    logTimeline({
      actor: 'app',
      message: `Ignored a stale ${event.type}: sequence ${event.sequence} is not newer than ${payment.lastAppliedSequence}`,
      eventId: event.eventId,
      paymentId: payment.paymentId,
      outcome: 'ignored_stale',
    });
    return { outcome: 'ignored_stale', payment };
  }

  const previousSequence = payment.lastAppliedSequence;
  const nextStatus = STATUS_BY_EVENT[event.type];
  payment.status = nextStatus;
  payment.failureCode = event.type === 'payment.failed' ? event.failureCode ?? 'insufficient_funds' : undefined;
  payment.lastAppliedSequence = event.sequence;
  payment.updatedAt = new Date().toISOString();

  // A gap means an earlier event was lost or overtaken. The newest version still wins:
  // nothing is buffered waiting for the missing one, because it may never arrive.
  const note =
    event.sequence > previousSequence + 1
      ? ` (sequence jumped from ${previousSequence} to ${event.sequence}; nothing is buffered, the newest version wins)`
      : '';

  logTimeline({
    actor: 'app',
    message: `Applied ${event.type}: payment is now ${nextStatus}${note}`,
    eventId: event.eventId,
    paymentId: payment.paymentId,
    outcome: 'applied',
  });

  return { outcome: 'applied', payment, note: note || undefined };
}
