/**
 * The attempt came back badly. Now what?
 *
 * The failure kind decides, and nothing else does.
 *
 *   hard        somebody authoritative said no. Asking a different gateway does not
 *               change the answer, and a burst of retries against an issuer is what
 *               card testing looks like from their side.
 *   config      we sent it somewhere that cannot take it. Retrying treats a bug as
 *               weather. Fix the routing.
 *   technical   nothing was decided. Another gateway is worth a try, on the same
 *               idempotency key, because the first one may have taken the money already.
 */
import type { RetryInput, RetryPlan } from '@bigpdf/lab-core/contracts';
import { failureKind } from '@bigpdf/lab-core/contracts';
import { chooseGateway } from './routing';

export function planRetry(input: RetryInput): RetryPlan {
  const kind = failureKind(input.failureCode);

  if (kind === 'hard') {
    return { retry: false, reason: 'The issuer answered. Another gateway will not change that' };
  }

  if (kind === 'config') {
    return { retry: false, reason: 'Routed somewhere that cannot accept it. That is a bug, not a retry' };
  }

  if (input.attemptsSoFar >= input.maxAttempts) {
    return { retry: false, reason: `${input.maxAttempts} attempts is enough` };
  }

  const next = chooseGateway({
    segment: input.attempt.segment,
    gateways: input.gateways,
    health: input.health,
    tried: input.tried,
  });

  if (!next.gatewayId) {
    return { retry: false, reason: 'Nowhere else accepts this payment' };
  }

  return {
    retry: true,
    gatewayId: next.gatewayId,
    // The same key. This is the line that stops a timed out capture becoming two charges.
    idempotencyKey: input.attempt.idempotencyKey,
    reason: `Technical failure, so trying ${next.gatewayId} on the same idempotency key`,
  };
}
