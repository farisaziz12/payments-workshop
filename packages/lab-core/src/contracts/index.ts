/**
 * StackNotes payments lab: shared contracts.
 *
 * Everything the client and the server agree on lives here: payment state,
 * entitlement state, the purchase record, provider events, and the result type
 * the browser gets back from a fetch.
 *
 * These are the contracts the exercise asks you to reason about. `docs/payment-state-contracts.md`
 * explains the transitions and the policy behind them.
 */

/** The plan StackNotes sells. One plan, one price, billed per workspace per month. */
export const PLAN = {
  planId: 'team-monthly',
  name: 'StackNotes Team',
  amountMinor: 2000,
  currency: 'EUR',
  interval: 'month',
  unit: 'workspace',
  taxNote: 'before applicable tax',
} as const;

export type Currency = typeof PLAN.currency;

/** The two payment methods in this lab, one per timeline. */
export type PaymentMethod = 'card' | 'bank_debit';

export const PAYMENT_METHODS: ReadonlyArray<{
  id: PaymentMethod;
  label: string;
  timeline: string;
}> = [
  {
    id: 'card',
    label: 'Card',
    timeline: 'Outcome arrives in the checkout response (simulated).',
  },
  {
    id: 'bank_debit',
    label: 'Bank debit',
    timeline: 'Accepted for processing. The outcome arrives later, as a provider event (simulated).',
  },
];

/**
 * Payment state, as the application server sees it. This is the only authority.
 *
 * `requires_action` is part of the contract because real rails need it (3-D Secure,
 * bank app approval). This lab does not exercise it; see docs/chaos-scenarios.md.
 */
export type PaymentStatus = 'requires_action' | 'processing' | 'succeeded' | 'failed';

/** Why a payment failed. Deliberately a small, closed set. */
export type FailureCode = 'card_declined' | 'insufficient_funds' | 'expired_card';

export type Payment = {
  paymentId: string;
  purchaseId: string;
  workspaceId: string;
  method: PaymentMethod;
  amountMinor: number;
  currency: Currency;
  status: PaymentStatus;
  failureCode?: FailureCode;
  /** Highest provider event sequence applied to this payment. Ordering is by version, not by arrival. */
  lastAppliedSequence: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * A purchase is the customer's intent to buy, and it is stable across retries.
 * The id is generated in the browser, kept in localStorage, and mirrored in the URL
 * so a customer can come back. The URL is a lookup key, never an authority.
 */
export type Purchase = {
  purchaseId: string;
  workspaceId: string;
  planId: typeof PLAN.planId;
  amountMinor: number;
  currency: Currency;
  paymentId: string | null;
  createdAt: string;
};

export type PurchaseView = {
  purchase: Purchase;
  payment: Payment | null;
};

/** Entitlement is the server's explicit answer to "can this workspace be used?". */
export type EntitlementAccess = 'none' | 'active';

export type EntitlementReason =
  | 'no_payment'
  | 'payment_processing'
  | 'payment_failed'
  | 'payment_succeeded'
  | 'payment_for_other_workspace';

export type Entitlement = {
  workspaceId: string;
  access: EntitlementAccess;
  reason: EntitlementReason;
  grantedByPaymentId?: string;
  decidedAt: string;
};

/** Events the simulated provider sends to the application server. */
export type ProviderEventType = 'payment.processing' | 'payment.succeeded' | 'payment.failed';

export type ProviderEvent = {
  eventId: string;
  paymentId: string;
  type: ProviderEventType;
  /** Per-payment, monotonic. Two events with the same sequence describe the same state. */
  sequence: number;
  occurredAt: string;
  failureCode?: FailureCode;
};

/** What the application server did with an event, and what the timeline shows. */
export type EventOutcome =
  | 'applied'
  | 'ignored_duplicate'
  | 'ignored_stale'
  | 'rejected_unknown_payment'
  | 'rejected_unknown_type';

export type TimelineActor = 'customer' | 'app' | 'provider' | 'simulator';

export type TimelineEntry = {
  id: string;
  at: string;
  actor: TimelineActor;
  message: string;
  paymentId?: string;
  eventId?: string;
  outcome?: EventOutcome;
};

/**
 * What a browser call to the application server returns.
 *
 * The important distinction in this lab: `ok: false` means the browser does not know
 * the outcome. It never means the payment failed. A failed payment comes back as a
 * perfectly good HTTP 200 with `status: 'failed'`.
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: 'timeout' }
  | { ok: false; kind: 'network' }
  | { ok: false; kind: 'http'; status: number }
  | { ok: false; kind: 'not_found' };

/** What the checkout screen renders. Produced by the status mapper (exercise TODO 1). */
export type CustomerViewTone = 'idle' | 'pending' | 'success' | 'failure' | 'unknown';

export type CustomerView = {
  tone: CustomerViewTone;
  title: string;
  detail: string;
  /** Should the screen keep asking the server what happened? */
  keepPolling: boolean;
  /** Should the screen offer a retry button? */
  canRetry: boolean;
};

/**
 * What the browser currently believes about the payment. `unknown` is the honest answer
 * after a request that never came back: the browser does not know, and must go and ask.
 */
export type ClientStatus = PaymentStatus | 'unknown' | 'none';

/** Everything the workspace page knows. Exactly one of these was decided on a server. */
export type AccessInputs = {
  workspaceId: string;
  /** The application server's decision, or null while it is still loading. */
  entitlement: Entitlement | null;
  /** What this browser last heard about the payment. A cache, not an authority. */
  clientStatus: ClientStatus;
  /** The query string from the customer's link. Also not an authority. */
  search: URLSearchParams;
};

/** What the workspace page renders. Produced by the access check (exercise TODO 3). */
export type AccessDecision = {
  unlocked: boolean;
  headline: string;
  detail: string;
};

export type ScenarioCategory = 'baseline' | 'delayed' | 'delivery';

export type ScenarioId =
  | 'instant-success'
  | 'instant-decline'
  | 'delayed-success'
  | 'delayed-failure'
  | 'client-timeout-success'
  | 'duplicate-event'
  | 'out-of-order-event';

export type ScenarioSummary = {
  id: ScenarioId;
  name: string;
  category: ScenarioCategory;
  method: PaymentMethod;
  description: string;
  teaches: string;
};

export type SimulatorState = {
  scenarioId: ScenarioId;
  scenarios: ReadonlyArray<ScenarioSummary>;
  /** Provider events scheduled but not yet delivered. */
  pendingDeliveries: Array<{ eventId: string; type: ProviderEventType; dueInMs: number }>;
};

/** The workspace the lab sells a subscription for. */
export const DEMO_WORKSPACE_ID = 'ws_northstar';
export const DEMO_WORKSPACE_NAME = 'Northstar';

export function formatMoney(amountMinor: number, currency: Currency): string {
  const symbol = currency === 'EUR' ? '€' : '';
  return `${symbol}${(amountMinor / 100).toFixed(2)}`;
}

export function planPriceLabel(): string {
  return `${formatMoney(PLAN.amountMinor, PLAN.currency)} per ${PLAN.unit} / ${PLAN.interval}, ${PLAN.taxNote}`;
}

export function methodLabel(method: PaymentMethod): string {
  return PAYMENT_METHODS.find((entry) => entry.id === method)?.label ?? method;
}
