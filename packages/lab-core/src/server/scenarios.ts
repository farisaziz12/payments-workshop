/**
 * The scenario catalogue.
 *
 * Every scenario is fully deterministic: the same clicks produce the same states, the same
 * events, in the same order, every time. Nothing here rolls dice. That is what makes the
 * lab debuggable in a 25 minute slot.
 *
 * A scenario says three things:
 *  - which payment method it belongs to,
 *  - what the simulated provider answers when the payment is created,
 *  - which events it delivers afterwards, and when.
 */
import type {
  FailureCode,
  PaymentMethod,
  PaymentStatus,
  ProviderEventType,
  ScenarioCategory,
  ScenarioId,
  ScenarioSummary,
} from '../contracts/index';

export type ScheduledEvent = {
  /** Milliseconds after the payment is created. */
  afterMs: number;
  type: ProviderEventType;
  sequence: number;
  failureCode?: FailureCode;
  /**
   * Two scheduled events sharing a key are delivered with the same event id,
   * which is how the duplicate-delivery scenario is built.
   */
  idKey?: string;
};

export type Scenario = {
  id: ScenarioId;
  name: string;
  category: ScenarioCategory;
  method: PaymentMethod;
  description: string;
  teaches: string;
  /** What the provider answers at creation time. */
  initial: { status: PaymentStatus; failureCode?: FailureCode; sequence: number };
  /** How long the application server holds the checkout response. Simulates a slow reply. */
  responseDelayMs: number;
  events: ScheduledEvent[];
};

export const SCENARIOS: ReadonlyArray<Scenario> = [
  {
    id: 'instant-success',
    name: 'Card succeeds immediately',
    category: 'baseline',
    method: 'card',
    description: 'The provider answers "succeeded" in the checkout response.',
    teaches: 'The happy path. Access turns on because the server says the payment succeeded.',
    initial: { status: 'succeeded', sequence: 1 },
    responseDelayMs: 0,
    events: [],
  },
  {
    id: 'instant-decline',
    name: 'Card is declined',
    category: 'baseline',
    method: 'card',
    description: 'The provider answers "failed" with a decline code, in a normal HTTP 200 response.',
    teaches: 'A known failure. The customer can retry, and the server never granted access.',
    initial: { status: 'failed', failureCode: 'card_declined', sequence: 1 },
    responseDelayMs: 0,
    events: [],
  },
  {
    id: 'delayed-success',
    name: 'Bank debit is accepted, then succeeds',
    category: 'delayed',
    method: 'bank_debit',
    description: 'Checkout returns "processing". Six seconds later the provider sends payment.succeeded.',
    teaches: 'The second timeline. Pending is not paid, and the answer arrives after the response.',
    initial: { status: 'processing', sequence: 1 },
    responseDelayMs: 0,
    events: [{ afterMs: 6000, type: 'payment.succeeded', sequence: 2 }],
  },
  {
    id: 'delayed-failure',
    name: 'Bank debit is accepted, then fails',
    category: 'delayed',
    method: 'bank_debit',
    description: 'Checkout returns "processing". Six seconds later the provider sends payment.failed.',
    teaches: 'A pending payment is not a slow success. It can still end in a failure.',
    initial: { status: 'processing', sequence: 1 },
    responseDelayMs: 0,
    events: [{ afterMs: 6000, type: 'payment.failed', sequence: 2, failureCode: 'insufficient_funds' }],
  },
  {
    id: 'client-timeout-success',
    name: 'Payment succeeds, the browser gives up waiting',
    category: 'delivery',
    method: 'card',
    description:
      'The server records "succeeded" straight away, then holds the response for five seconds. The browser aborts after three.',
    teaches: 'A network error is not a payment failure. The browser only lost the answer, not the money.',
    initial: { status: 'succeeded', sequence: 1 },
    responseDelayMs: 5000,
    events: [],
  },
  {
    id: 'duplicate-event',
    name: 'The success event is delivered twice',
    category: 'delivery',
    method: 'bank_debit',
    description: 'The same payment.succeeded event, same event id, arrives twice.',
    teaches: 'Event handling has to be idempotent. The second copy must change nothing.',
    initial: { status: 'processing', sequence: 1 },
    responseDelayMs: 0,
    events: [
      { afterMs: 4000, type: 'payment.succeeded', sequence: 2, idKey: 'confirm' },
      { afterMs: 6000, type: 'payment.succeeded', sequence: 2, idKey: 'confirm' },
    ],
  },
  {
    id: 'out-of-order-event',
    name: 'An older event arrives after a newer one',
    category: 'delivery',
    method: 'bank_debit',
    description: 'payment.succeeded (sequence 3) arrives first, then a stale payment.processing (sequence 2).',
    teaches: 'Order events by version, not by arrival time. The stale one must not undo the newer state.',
    initial: { status: 'processing', sequence: 1 },
    responseDelayMs: 0,
    events: [
      { afterMs: 4000, type: 'payment.succeeded', sequence: 3 },
      { afterMs: 6000, type: 'payment.processing', sequence: 2 },
    ],
  },
];

export function getScenario(id: ScenarioId): Scenario {
  const found = SCENARIOS.find((scenario) => scenario.id === id);
  if (!found) throw new Error(`Unknown scenario: ${id}`);
  return found;
}

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === 'string' && SCENARIOS.some((scenario) => scenario.id === value);
}

export function scenarioSummaries(): ScenarioSummary[] {
  return SCENARIOS.map(({ id, name, category, method, description, teaches }) => ({
    id,
    name,
    category,
    method,
    description,
    teaches,
  }));
}
