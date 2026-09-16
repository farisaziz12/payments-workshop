/**
 * The attempt came back badly. Now what?
 *
 * 🧾 Also pure. The orchestrator calls this after every failed attempt and does exactly
 *    what you tell it, up to a hard ceiling of `input.maxAttempts` per charge.
 *
 * 🧾 What you are handed, in `input`:
 *      attempt         the attempt that just failed, including its idempotency key
 *      failureCode     what came back
 *      gateways        the table
 *      health          the whole rolling window
 *      tried           every gateway this charge has been sent to
 *      attemptsSoFar   how many attempts this charge has spent, including that one
 *      maxAttempts     the ceiling
 *
 * 🧾 `failureKind(code)` sorts a failure into three kinds, and the kind is the whole
 *    decision:
 *      hard        the issuer or the bank answered, and the answer was no
 *      technical   nobody decided anything. The request did not complete
 *      config      it was sent somewhere that cannot accept it. That is your bug
 *
 * 🧾 The idempotency key is not decoration. A gateway that timed out may well have taken
 *    the money. Retrying on the same key gets the original capture back. Retrying on a
 *    fresh key takes it a second time.
 */
import type { RetryInput, RetryPlan } from '@bigpdf/lab-core/contracts';

export function planRetry(input: RetryInput): RetryPlan {
  // 🦆 Task 2: this retries everything, on the gateway that just failed, with a brand
  //    new idempotency key every time.
  //
  //    Three things are wrong with it, and two of them cost real money:
  //      - a hard decline is retried, which is what card testing looks like to an issuer,
  //      - a timeout is retried with a fresh key, so the customer is charged twice.
  //        Watch the "Charged twice" counter,
  //      - the retry goes back to the gateway that just failed, which is the one place
  //        it is least likely to work.
  //
  //    What you return is a `RetryPlan`, one of two shapes:
  //      { retry: false, reason }
  //      { retry: true, gatewayId, idempotencyKey, reason }
  //
  //    `chooseGateway` from ./routing already knows how to pick somewhere sensible, and
  //    `input.tried` is exactly what it needs to avoid repeating itself. Reuse it.
  return {
    retry: true,
    gatewayId: input.attempt.gatewayId ?? 'atlas',
    idempotencyKey: `idem_retry_${input.attempt.attemptId}`,
    reason: 'Trying again',
  };
}
