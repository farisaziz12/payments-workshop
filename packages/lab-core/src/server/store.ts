/**
 * The application server's memory.
 *
 * Everything the lab treats as authoritative lives here: purchases, payments,
 * the provider events already applied, the scheduled deliveries, and the timeline.
 *
 * Two deliberate choices:
 *  - It is in-memory. Restarting the dev server clears it, which is the reset of last resort.
 *  - It hangs off `globalThis` so it survives hot reloads while you edit files. Plain objects
 *    and built-in Maps only: a class instance would fail `instanceof` after a module reload.
 */
import type {
  Payment,
  ProviderEvent,
  Purchase,
  ScenarioId,
  TimelineEntry,
} from '../contracts/index';

export type PendingDelivery = {
  deliveryId: string;
  /** Epoch milliseconds when the provider intends to deliver this event. */
  dueAt: number;
  event: ProviderEvent;
  delivered: boolean;
};

export type LabState = {
  purchases: Map<string, Purchase>;
  payments: Map<string, Payment>;
  /** Payment attempt ids per purchase, oldest first. A failed payment can be retried. */
  attemptsByPurchase: Map<string, string[]>;
  /** Every event id the server has already seen, applied or not. The idempotency key. */
  seenEventIds: Set<string>;
  pending: PendingDelivery[];
  timeline: TimelineEntry[];
  scenarioId: ScenarioId;
  counters: { payment: number; event: number; timeline: number; delivery: number };
  timers: Set<ReturnType<typeof setTimeout>>;
};

export const DEFAULT_SCENARIO: ScenarioId = 'instant-success';

const STORE_KEY = Symbol.for('bigpdf.lab.store');

type GlobalWithStore = typeof globalThis & { [STORE_KEY]?: LabState };

function createState(): LabState {
  return {
    purchases: new Map(),
    payments: new Map(),
    attemptsByPurchase: new Map(),
    seenEventIds: new Set(),
    pending: [],
    timeline: [],
    scenarioId: DEFAULT_SCENARIO,
    counters: { payment: 0, event: 0, timeline: 0, delivery: 0 },
    timers: new Set(),
  };
}

export function getStore(): LabState {
  const holder = globalThis as GlobalWithStore;
  holder[STORE_KEY] ??= createState();
  return holder[STORE_KEY];
}

/** Clear every trace of the current run, including scheduled deliveries. */
export function resetStore(): LabState {
  const holder = globalThis as GlobalWithStore;
  const existing = holder[STORE_KEY];
  if (existing) {
    for (const timer of existing.timers) clearTimeout(timer);
    existing.timers.clear();
  }
  holder[STORE_KEY] = createState();
  return holder[STORE_KEY];
}

export function nextId(prefix: 'pay' | 'ev' | 'tl' | 'dlv'): string {
  const store = getStore();
  const key = ({ pay: 'payment', ev: 'event', tl: 'timeline', dlv: 'delivery' } as const)[prefix];
  store.counters[key] += 1;
  return `${prefix}_${store.counters[key]}`;
}

export function latestAttempt(purchaseId: string): Payment | null {
  const store = getStore();
  const attempts = store.attemptsByPurchase.get(purchaseId) ?? [];
  const lastId = attempts.at(-1);
  return lastId ? store.payments.get(lastId) ?? null : null;
}

export function recordAttempt(payment: Payment): void {
  const store = getStore();
  store.payments.set(payment.paymentId, payment);
  const attempts = store.attemptsByPurchase.get(payment.purchaseId) ?? [];
  attempts.push(payment.paymentId);
  store.attemptsByPurchase.set(payment.purchaseId, attempts);
  const purchase = store.purchases.get(payment.purchaseId);
  if (purchase) purchase.paymentId = payment.paymentId;
}
