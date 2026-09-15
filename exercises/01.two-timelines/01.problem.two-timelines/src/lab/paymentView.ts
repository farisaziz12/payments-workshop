/**
 * Turning what the server said into what the customer sees.
 *
 * 🦉 This function is pure. It gets one argument, an `ApiResult<Payment>`, and returns
 * what the screen should render. No fetching, no state. The checkout screen calls it
 * every time it hears anything from the server.
 *
 * 🦉 `ApiResult` has two shapes, and the difference matters:
 *      { ok: true, data: payment }   the server answered, and `payment.status` is the truth
 *      { ok: false, kind: ... }      we never got an answer: a timeout, a dropped connection
 *
 *    A declined payment is NOT an `ok: false`. A decline comes back as a perfectly good
 *    response carrying `status: 'failed'`.
 */
import type { ApiResult, CustomerView, Payment } from '@stacknotes/lab-core/contracts';

export function toCustomerView(result: ApiResult<Payment>): CustomerView {
  // 🐨 Task 1: this function currently knows two outcomes, "failed" and "paid", and
  //    sorts everything into one of them. Give it the outcomes that actually exist.
  //
  //    Three things are wrong with what follows. Watch the screen and the event timeline
  //    side by side while you run a scenario, and you will see them:
  //      - a request that never came back is reported as a failed payment,
  //      - a payment that is still processing is reported as paid,
  //      - nothing ever sets `keepPolling`, so the screen never updates itself.
  //
  //    The type you return is `CustomerView`:
  //      tone: 'idle' | 'pending' | 'success' | 'failure' | 'unknown'   picks the styling
  //      title, detail                                                 what the customer reads
  //      keepPolling                                                   keep asking the server?
  //      canRetry                                                      offer a "Try again" button?
  //
  //    `payment.status` is one of 'requires_action' | 'processing' | 'succeeded' | 'failed'.

  if (!result.ok) {
    return {
      tone: 'failure',
      title: 'That payment did not go through',
      detail: 'Something went wrong while we were talking to the provider. Please try again.',
      keepPolling: false,
      canRetry: true,
    };
  }

  const payment = result.data;

  if (payment.status === 'failed') {
    return {
      tone: 'failure',
      title: 'That payment did not go through',
      detail: 'Your bank declined the payment. Nothing was charged. You can try again or use another method.',
      keepPolling: false,
      canRetry: true,
    };
  }

  return {
    tone: 'success',
    title: 'Payment received',
    detail: 'Your workspace is ready. A receipt is on its way.',
    keepPolling: false,
    canRetry: false,
  };
}
