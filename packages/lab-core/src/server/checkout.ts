/**
 * Checkout: creating (or re-finding) the payment for a purchase.
 *
 * The purchase id is generated in the browser and stays stable across retries, reloads and
 * double clicks. That is what makes this endpoint idempotent: submitting the same purchase
 * twice returns the same payment instead of charging twice.
 *
 * A disabled button is a courtesy. The server check is the protection, because the browser
 * can always send the request again: a refresh, a flaky connection, an impatient customer.
 *
 * This part is supplied. The exercise is about reading state, not about rebuilding this.
 */
import type { Payment, PaymentMethod, Purchase } from '../contracts/index';
import { PLAN, methodLabel } from '../contracts/index';
import { authorize } from './provider';
import { getScenario, SCENARIOS, type Scenario } from './scenarios';
import { getStore, latestAttempt } from './store';
import { logTimeline } from './timeline';

export type CheckoutInput = {
  purchaseId: string;
  workspaceId: string;
  method: PaymentMethod;
};

export type CheckoutResult = {
  purchase: Purchase;
  payment: Payment;
  /** True when this request found an existing payment instead of creating one. */
  replayed: boolean;
  /** How long the application server should hold this response, in milliseconds. */
  responseDelayMs: number;
};

/**
 * The simulator holds one selected scenario. If the customer picks a method the scenario
 * does not cover, fall back to that method's first scenario rather than silently running
 * a card timeline for a bank debit.
 */
export function scenarioForMethod(method: PaymentMethod): Scenario {
  const store = getStore();
  const selected = getScenario(store.scenarioId);
  if (selected.method === method) return selected;
  const fallback = SCENARIOS.find((scenario) => scenario.method === method);
  if (!fallback) throw new Error(`No scenario for method ${method}`);
  store.scenarioId = fallback.id;
  logTimeline({
    actor: 'simulator',
    message: `Switched to "${fallback.name}" because the customer chose ${methodLabel(method)}`,
  });
  return fallback;
}

export function checkout(input: CheckoutInput): CheckoutResult {
  const store = getStore();

  const existingPurchase = store.purchases.get(input.purchaseId);
  const purchase: Purchase = existingPurchase ?? {
    purchaseId: input.purchaseId,
    workspaceId: input.workspaceId,
    planId: PLAN.planId,
    amountMinor: PLAN.amountMinor,
    currency: PLAN.currency,
    paymentId: null,
    createdAt: new Date().toISOString(),
  };
  if (!existingPurchase) {
    store.purchases.set(purchase.purchaseId, purchase);
    logTimeline({
      actor: 'customer',
      message: `Started purchase ${purchase.purchaseId} for ${purchase.workspaceId}`,
    });
  }

  const previous = latestAttempt(purchase.purchaseId);
  if (previous && previous.status !== 'failed') {
    logTimeline({
      actor: 'app',
      message: `Same purchase submitted again: returning the existing payment ${previous.paymentId} instead of creating another one`,
      paymentId: previous.paymentId,
    });
    return {
      purchase,
      payment: previous,
      replayed: true,
      responseDelayMs: 0,
    };
  }

  const scenario = scenarioForMethod(input.method);
  logTimeline({
    actor: 'customer',
    message: previous
      ? `Retried payment for ${purchase.purchaseId} with ${methodLabel(input.method)}`
      : `Submitted ${methodLabel(input.method)} for ${purchase.purchaseId}`,
  });

  const payment = authorize(purchase, input.method, scenario);
  return { purchase, payment, replayed: false, responseDelayMs: scenario.responseDelayMs };
}
