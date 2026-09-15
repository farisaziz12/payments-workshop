/**
 * HTTP handlers for the lab's application server.
 *
 * The Next.js route files in each app are one-line re-exports of these, so the starter
 * and the solution share exactly the same server. Only the three lab files differ.
 *
 * One rule runs through all of them: a 4xx status means the request was malformed.
 * A declined payment is a perfectly successful HTTP 200 carrying `status: "failed"`.
 * That is what lets the browser tell "it failed" apart from "I could not find out".
 */
import type { PaymentMethod, PurchaseView } from '../contracts/index';
import { DEMO_WORKSPACE_ID } from '../contracts/index';
import { checkout } from './checkout';
import { deliverDue, deliverEverythingNow, pendingDeliveries } from './delivery';
import { decideEntitlement } from './entitlement';
import { isScenarioId, scenarioSummaries } from './scenarios';
import { getStore, latestAttempt, resetStore } from './store';
import { logTimeline, readTimeline } from './timeline';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Deliver anything the provider owes us before answering.
 * The timer usually got there first. This covers the times it did not.
 */
function catchUp(): void {
  deliverDue();
}

function isMethod(value: unknown): value is PaymentMethod {
  return value === 'card' || value === 'bank_debit';
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 64;
}

export async function handleCheckout(request: Request): Promise<Response> {
  catchUp();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body must be JSON' }, 400);
  }

  const { purchaseId, workspaceId, method } = (body ?? {}) as Record<string, unknown>;
  if (!isId(purchaseId) || !isId(workspaceId) || !isMethod(method)) {
    return json({ error: 'Expected { purchaseId, workspaceId, method: "card" | "bank_debit" }' }, 400);
  }

  const result = checkout({ purchaseId, workspaceId, method });

  // Some scenarios hold the response back. Note the order: the payment is already
  // recorded, so a browser that gives up waiting is only missing the answer.
  if (result.responseDelayMs > 0) {
    logTimeline({
      actor: 'app',
      message: `Holding the checkout response for ${Math.round(result.responseDelayMs / 1000)}s. The payment is already recorded as ${result.payment.status}.`,
      paymentId: result.payment.paymentId,
    });
    await sleep(result.responseDelayMs);
  }

  const view: PurchaseView = { purchase: result.purchase, payment: result.payment };
  return json(view);
}

export function handleGetPurchase(purchaseId: string): Response {
  catchUp();
  const purchase = getStore().purchases.get(purchaseId);
  if (!purchase) return json({ error: `No purchase ${purchaseId}` }, 404);
  const view: PurchaseView = { purchase, payment: latestAttempt(purchaseId) };
  return json(view);
}

export function handleGetEntitlement(workspaceId: string): Response {
  catchUp();
  return json(decideEntitlement(workspaceId));
}

export function handleGetTimeline(): Response {
  catchUp();
  return json({ entries: readTimeline() });
}

export function handleGetSimulator(): Response {
  catchUp();
  const store = getStore();
  return json({
    scenarioId: store.scenarioId,
    scenarios: scenarioSummaries(),
    pendingDeliveries: pendingDeliveries(),
  });
}

export async function handleSetScenario(request: Request): Promise<Response> {
  catchUp();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body must be JSON' }, 400);
  }
  const { scenarioId } = (body ?? {}) as Record<string, unknown>;
  if (!isScenarioId(scenarioId)) return json({ error: `Unknown scenario: ${String(scenarioId)}` }, 400);

  const store = getStore();
  store.scenarioId = scenarioId;
  logTimeline({ actor: 'simulator', message: `Scenario set to "${scenarioId}"` });
  return handleGetSimulator();
}

export function handleReset(): Response {
  resetStore();
  logTimeline({ actor: 'simulator', message: 'Reset: purchases, payments, events and the timeline are gone' });
  return json({ ok: true, workspaceId: DEMO_WORKSPACE_ID });
}

export function handleDeliverNow(): Response {
  const delivered = deliverEverythingNow();
  return json({ delivered });
}
