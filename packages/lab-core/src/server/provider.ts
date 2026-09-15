/**
 * SimPay: the simulated payment provider.
 *
 * SimPay is not a model of any real provider, and the two timelines it offers are not a
 * complete implementation of any real payment rail. It exists to produce, deterministically,
 * the two shapes a frontend has to cope with:
 *
 *   1. an outcome that comes back in the response,
 *   2. an acknowledgement now and an outcome later.
 *
 * Real rails add far more: authentication steps, partial captures, settlement windows,
 * refunds, disputes, retries with backoff, signed webhooks. Out of scope here on purpose.
 */
import type { Payment, PaymentMethod, ProviderEvent, Purchase } from '../contracts/index';
import { PLAN } from '../contracts/index';
import { scheduleDelivery } from './delivery';
import type { Scenario } from './scenarios';
import { getStore, nextId, recordAttempt } from './store';
import { logTimeline } from './timeline';

export const PROVIDER_NAME = 'SimPay (simulated)';

/**
 * Create a payment attempt and let the scenario decide how its timeline unfolds.
 * Returns the payment as the provider first reported it.
 */
export function authorize(purchase: Purchase, method: PaymentMethod, scenario: Scenario): Payment {
  const now = new Date().toISOString();
  const payment: Payment = {
    paymentId: nextId('pay'),
    purchaseId: purchase.purchaseId,
    workspaceId: purchase.workspaceId,
    method,
    amountMinor: PLAN.amountMinor,
    currency: PLAN.currency,
    status: scenario.initial.status,
    failureCode: scenario.initial.failureCode,
    lastAppliedSequence: scenario.initial.sequence,
    createdAt: now,
    updatedAt: now,
  };
  recordAttempt(payment);

  logTimeline({
    actor: 'provider',
    message: `${PROVIDER_NAME} answered "${payment.status}" for ${payment.paymentId}`,
    paymentId: payment.paymentId,
  });

  const createdAt = Date.now();
  const idsByKey = new Map<string, string>();
  for (const scheduled of scenario.events) {
    const eventId = scheduled.idKey
      ? idsByKey.get(scheduled.idKey) ?? rememberId(idsByKey, scheduled.idKey)
      : nextId('ev');
    const event: ProviderEvent = {
      eventId,
      paymentId: payment.paymentId,
      type: scheduled.type,
      sequence: scheduled.sequence,
      occurredAt: new Date(createdAt + scheduled.afterMs).toISOString(),
      failureCode: scheduled.failureCode,
    };
    scheduleDelivery(event, createdAt + scheduled.afterMs);
    logTimeline({
      actor: 'provider',
      message: `Scheduled ${scheduled.type} (sequence ${scheduled.sequence}) in ${Math.round(scheduled.afterMs / 1000)}s`,
      eventId,
      paymentId: payment.paymentId,
    });
  }

  return payment;
}

function rememberId(cache: Map<string, string>, key: string): string {
  const id = nextId('ev');
  cache.set(key, id);
  return id;
}

/** Provider events are only ever produced here, so the store stays the single writer. */
export function storeHasPayment(paymentId: string): boolean {
  return getStore().payments.has(paymentId);
}
