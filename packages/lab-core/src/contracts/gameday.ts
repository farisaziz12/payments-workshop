/**
 * Exercise 01 contracts: segments, gateways, attempts and health.
 *
 * The orchestrator's whole job is deciding where an attempt goes and what to do when
 * it comes back badly. These are the shapes that decision is made from.
 */

import type { Country, Currency, PaymentMethod } from './common';
import { methodLabel } from './common';

/**
 * A segment is the unit a payments team actually reasons about. Failures cluster by
 * method, by country and by currency, not by your overall success rate.
 */
export type Segment = {
  method: PaymentMethod;
  country: Country;
  currency: Currency;
};

/** `card:DE:EUR`. Stable, sortable, and safe as an object key or a DOM id. */
export type SegmentKey = string;

export function segmentKey(segment: Segment): SegmentKey {
  return `${segment.method}:${segment.country}:${segment.currency}`;
}

export function segmentLabel(segment: Segment): string {
  return `${methodLabel(segment.method)} · ${segment.country} · ${segment.currency}`;
}

export type GatewayId = 'atlas' | 'borealis' | 'cirrus';

/** What a gateway will accept. Anything not listed here comes back as unsupported. */
export type GatewaySupport = {
  method: PaymentMethod;
  currency: Currency;
};

export type Gateway = {
  id: GatewayId;
  name: string;
  supports: ReadonlyArray<GatewaySupport>;
  /** Lower wins when every eligible gateway is healthy. */
  priority: number;
  /** Charged on a successful authorisation, in basis points of the amount. */
  feeBps: number;
  /** What this gateway authorises when nothing is wrong. Shown in the UI, not a promise. */
  baselineAuthRate: number;
};

export function supportsSegment(gateway: Gateway, segment: Segment): boolean {
  return gateway.supports.some(
    (entry) => entry.method === segment.method && entry.currency === segment.currency,
  );
}

/**
 * Why an attempt failed. The distinction that matters is not the label, it is what you
 * are allowed to do next.
 */
export type FailureCode =
  | 'issuer_declined'
  | 'insufficient_funds'
  | 'expired_card'
  | 'invalid_account'
  | 'gateway_timeout'
  | 'gateway_unavailable'
  | 'rate_limited'
  | 'unsupported_method';

/**
 * `hard`        the issuer or the bank answered, and the answer was no. Sending the same
 *               payment somewhere else does not change that answer. It does get you
 *               flagged for card testing.
 * `technical`   nobody decided anything. The request did not complete. Another gateway
 *               may well succeed, on the same idempotency key.
 * `config`      the attempt should never have been sent there. Routing is wrong, and
 *               retrying it anywhere is treating a bug as weather.
 */
export type FailureKind = 'hard' | 'technical' | 'config';

export const FAILURE_KIND: Readonly<Record<FailureCode, FailureKind>> = {
  issuer_declined: 'hard',
  insufficient_funds: 'hard',
  expired_card: 'hard',
  invalid_account: 'hard',
  gateway_timeout: 'technical',
  gateway_unavailable: 'technical',
  rate_limited: 'technical',
  unsupported_method: 'config',
};

export function failureKind(code: FailureCode): FailureKind {
  return FAILURE_KIND[code];
}

export const FAILURE_LABEL: Readonly<Record<FailureCode, string>> = {
  issuer_declined: 'Issuer declined',
  insufficient_funds: 'Insufficient funds',
  expired_card: 'Expired card',
  invalid_account: 'Invalid account',
  gateway_timeout: 'Gateway timeout',
  gateway_unavailable: 'Gateway unavailable',
  rate_limited: 'Rate limited',
  unsupported_method: 'Method not supported there',
};

export type AttemptOutcome = 'succeeded' | 'failed' | 'no_route';

/**
 * One request to one gateway.
 *
 * A charge can have several attempts. They share a `chargeId`, and they should share an
 * `idempotencyKey` too: that key is the only thing standing between a retried timeout
 * and a customer charged twice.
 */
export type Attempt = {
  attemptId: string;
  chargeId: string;
  idempotencyKey: string;
  segment: Segment;
  amountMinor: number;
  gatewayId: GatewayId | null;
  outcome: AttemptOutcome;
  failureCode?: FailureCode;
  /** The attempt this one is a retry of, if any. */
  retryOf?: string;
  /** Why the orchestrator chose this gateway, or why it chose nothing. */
  reason: string;
  feeMinor: number;
  /** The gateway had already captured this key. Charging twice is what we avoided. */
  deduplicated?: boolean;
  at: string;
  sequence: number;
};

/** Health for one gateway, inside one segment, over the rolling window. */
export type GatewayHealth = {
  gatewayId: GatewayId;
  attempts: number;
  successes: number;
  technicalFailures: number;
  successRate: number;
  /** The server's call, and it is given to you. Enough sample, and the rate is bad. */
  degraded: boolean;
  /** Too few attempts in the window to say anything. Three failures is not an outage. */
  thinSample: boolean;
};

export type SegmentHealth = {
  segment: Segment;
  key: SegmentKey;
  attempts: number;
  successes: number;
  successRate: number;
  degraded: boolean;
  thinSample: boolean;
  /** One entry per gateway that took traffic for this segment in the window. */
  gateways: ReadonlyArray<GatewayHealth>;
};

export type HealthSnapshot = {
  at: string;
  windowSeconds: number;
  /** The number on the big tile. It is the one that hides the incident. */
  overallSuccessRate: number;
  attempts: number;
  successes: number;
  segments: ReadonlyArray<SegmentHealth>;
  /** Gateway health across every segment, for the gateway table. */
  gateways: ReadonlyArray<GatewayHealth>;
};

/**
 * The health of one segment, pulled out of the snapshot.
 *
 * This is the slice that decides a routing question. The snapshot's top level `gateways`
 * array is the same gateway measured across every segment at once, which is what a status
 * page shows you and what will have you moving traffic that was never in trouble.
 */
export function segmentHealthFor(
  snapshot: HealthSnapshot,
  segment: Segment,
): SegmentHealth | null {
  const key = segmentKey(segment);
  const found = snapshot.segments.find((entry) => entry.key === key);
  return found && found.attempts > 0 ? found : null;
}

export function gatewayHealthFor(
  health: SegmentHealth | null,
  gatewayId: GatewayId,
): GatewayHealth | null {
  return health?.gateways.find((entry) => entry.gatewayId === gatewayId) ?? null;
}

/** What the orchestrator hands `chooseGateway`. Everything it needs, nothing it does not. */
export type RoutingInput = {
  segment: Segment;
  /** The gateway table, in configured priority order. */
  gateways: ReadonlyArray<Gateway>;
  /** The whole rolling window. Slice it with `segmentHealthFor` before you trust it. */
  health: HealthSnapshot;
  /** Gateways already tried for this charge. Never send it back to one of these. */
  tried: ReadonlyArray<GatewayId>;
};

/**
 * `gatewayId: null` means route nowhere and stop. That is a real answer, and for a
 * SEPA debit with its only gateway down it is the correct one.
 */
export type RoutingDecision = {
  gatewayId: GatewayId | null;
  /** One short line, shown in the attempt feed. Say what decided it. */
  reason: string;
};

export type RetryInput = {
  /** The attempt that just came back badly. */
  attempt: Attempt;
  failureCode: FailureCode;
  gateways: ReadonlyArray<Gateway>;
  health: HealthSnapshot;
  tried: ReadonlyArray<GatewayId>;
  /** Attempts already spent on this charge, including the one that just failed. */
  attemptsSoFar: number;
  maxAttempts: number;
};

export type RetryPlan =
  | { retry: false; reason: string }
  | { retry: true; gatewayId: GatewayId; idempotencyKey: string; reason: string };

/** A fault the chaos panel can switch on. Deterministic: same fault, same behaviour. */
export type IncidentId = 'card-de-atlas-timeout' | 'sepa-de-borealis-outage' | 'cirrus-rate-limit';

export type IncidentSummary = {
  id: IncidentId;
  name: string;
  gatewayId: GatewayId;
  segmentKey: SegmentKey;
  failureCode: FailureCode;
  /** Share of attempts to this gateway, in this segment, that fail while it is on. */
  failureRate: number;
  description: string;
  teaches: string;
  active: boolean;
};

export type OrchestratorState = {
  running: boolean;
  attemptsPerSecond: number;
  maxAttempts: number;
  incidents: ReadonlyArray<IncidentSummary>;
};

/** The running total the dashboard shows. Money you did not have to spend, and money you did. */
export type Ledger = {
  captured: number;
  capturedMinor: number;
  feesMinor: number;
  /** Charges the gateway had already taken, saved by a reused idempotency key. */
  deduplicated: number;
  /** Charges taken twice, because a retry arrived with a fresh key. */
  duplicateCaptures: number;
  /** Attempts routed to a gateway that cannot accept them. */
  misrouted: number;
  /** Charges the orchestrator refused to route anywhere. */
  abandoned: number;
};

export type DashboardState = {
  health: HealthSnapshot;
  ledger: Ledger;
  orchestrator: OrchestratorState;
  gateways: ReadonlyArray<Gateway>;
  recent: ReadonlyArray<Attempt>;
};
