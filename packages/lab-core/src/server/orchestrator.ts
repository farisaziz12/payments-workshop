/**
 * The orchestration loop.
 *
 * This is the part that calls your code. It takes a charge, asks `chooseGateway` where to
 * send it, sends it, and when the answer is bad it asks `planRetry` what to do next. It
 * does not second-guess either answer, because the point of the exercise is to see what
 * your policy does to live traffic.
 *
 * The one thing it enforces is a hard ceiling on attempts per charge, so a policy that
 * always says "retry" burns a few euros rather than the afternoon.
 */
import type {
  Attempt,
  GatewayId,
  RetryInput,
  RetryPlan,
  RoutingDecision,
  RoutingInput,
  Segment,
} from '../contracts/index';
import { GATEWAYS, sendToGateway } from './gateways';
import { currentHealth } from './health';
import { getStore, nextId, recordAttempt } from './store';
import { logTimeline } from './timeline';
import { amountFor, chargesDue, pickSegment } from './traffic';

export type LabPolicy = {
  chooseGateway(input: RoutingInput): RoutingDecision;
  planRetry(input: RetryInput): RetryPlan;
};

/** Three tries. Enough for a failover and one more; not enough to hammer an issuer. */
export const MAX_ATTEMPTS = 3;

/** A policy that throws should show up on the dashboard, not as a 500 in the terminal. */
function guard<T>(run: () => T, fallback: (message: string) => T): T {
  try {
    return run();
  } catch (error) {
    return fallback(error instanceof Error ? error.message : String(error));
  }
}

export function runCharge(policy: LabPolicy, segment: Segment, now: number = Date.now()): void {
  const store = getStore();
  const chargeId = nextId('chg');
  const amountMinor = amountFor(segment);
  store.charges.set(chargeId, { chargeId, segment, amountMinor, attemptIds: [], settled: false });

  let idempotencyKey = `idem_${chargeId}`;
  const tried: GatewayId[] = [];
  let previous: Attempt | null = null;
  /** Where the last planRetry said to go. Null on the first attempt. */
  let decided: RoutingDecision | null = null;

  for (let attemptsSoFar = 0; attemptsSoFar < MAX_ATTEMPTS; attemptsSoFar += 1) {
    const health = currentHealth(now);

    const decision: RoutingDecision =
      decided ??
      guard(
        () => policy.chooseGateway({ segment, gateways: GATEWAYS, health, tried }),
        (message) => ({ gatewayId: null, reason: `chooseGateway threw: ${message}` }),
      );
    decided = null;

    if (!decision.gatewayId) {
      store.ledger.abandoned += 1;
      const attempt = buildAttempt({
        chargeId,
        idempotencyKey,
        segment,
        amountMinor,
        gatewayId: null,
        outcome: 'no_route',
        reason: decision.reason || 'No gateway chosen',
        retryOf: previous?.attemptId,
        now,
      });
      recordAttempt(attempt);
      return;
    }

    tried.push(decision.gatewayId);
    const response = sendToGateway({
      gatewayId: decision.gatewayId,
      segment,
      chargeId,
      idempotencyKey,
      amountMinor,
    });

    const attempt = buildAttempt({
      chargeId,
      idempotencyKey,
      segment,
      amountMinor,
      gatewayId: decision.gatewayId,
      outcome: response.outcome,
      failureCode: response.failureCode,
      reason: decision.reason,
      retryOf: previous?.attemptId,
      feeMinor: response.feeMinor,
      deduplicated: response.deduplicated,
      now,
    });
    recordAttempt(attempt);

    if (response.outcome === 'succeeded') {
      const charge = store.charges.get(chargeId);
      if (charge) charge.settled = true;
      return;
    }

    const failureCode = response.failureCode ?? 'gateway_unavailable';
    const plan = guard<RetryPlan>(
      () =>
        policy.planRetry({
          attempt,
          failureCode,
          gateways: GATEWAYS,
          health: currentHealth(now),
          tried,
          attemptsSoFar: attemptsSoFar + 1,
          maxAttempts: MAX_ATTEMPTS,
        }),
      (message) => ({ retry: false, reason: `planRetry threw: ${message}` }),
    );

    if (!plan.retry) return;

    decided = { gatewayId: plan.gatewayId, reason: plan.reason || 'Retried' };
    idempotencyKey = plan.idempotencyKey;
    previous = attempt;
  }

  logTimeline({
    actor: 'orchestrator',
    message: `Charge ${chargeId} hit the ${MAX_ATTEMPTS} attempt ceiling and was given up on.`,
  });
}

function buildAttempt(input: {
  chargeId: string;
  idempotencyKey: string;
  segment: Segment;
  amountMinor: number;
  gatewayId: GatewayId | null;
  outcome: Attempt['outcome'];
  failureCode?: Attempt['failureCode'];
  reason: string;
  retryOf?: string;
  feeMinor?: number;
  deduplicated?: boolean;
  now: number;
}): Attempt {
  const store = getStore();
  return {
    attemptId: nextId('att'),
    chargeId: input.chargeId,
    idempotencyKey: input.idempotencyKey,
    segment: input.segment,
    amountMinor: input.amountMinor,
    gatewayId: input.gatewayId,
    outcome: input.outcome,
    failureCode: input.failureCode,
    retryOf: input.retryOf,
    reason: input.reason,
    feeMinor: input.feeMinor ?? 0,
    deduplicated: input.deduplicated,
    at: new Date(input.now).toISOString(),
    sequence: store.counters.attempt,
  };
}

/** Catch the simulation up to now, one charge at a time. Returns how many it ran. */
export function advance(policy: LabPolicy, now: number = Date.now()): number {
  const due = chargesDue(now);
  for (let index = 0; index < due; index += 1) {
    runCharge(policy, pickSegment(), now);
  }
  return due;
}

/** Run a fixed number of charges immediately. Used by the tests and the burst control. */
export function burst(policy: LabPolicy, count: number, now: number = Date.now()): number {
  for (let index = 0; index < count; index += 1) {
    runCharge(policy, pickSegment(), now);
  }
  return count;
}
