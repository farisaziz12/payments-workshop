/**
 * Turning what the server said into what the customer sees.
 *
 * Three cases, and the third is the one that catches people out:
 *
 *   the server answered, and the payment is in some state  -> say what that state means
 *   the server answered, and the payment failed            -> say it failed, offer a retry
 *   the server never answered                              -> say we do not know yet
 *
 * A request that times out is not a decline. The money may well have moved.
 */
import type { ApiResult, CustomerView, Payment } from '@stacknotes/lab-core/contracts';
import { methodLabel } from '@stacknotes/lab-core/contracts';

export function toCustomerView(result: ApiResult<Payment>): CustomerView {
  if (!result.ok) {
    // We did not get an answer. That is not the same as a failed payment, so do not
    // tell the customer it failed, and do not offer a retry that might charge twice.
    // Keep polling: the server knows what happened even though this browser does not.
    return {
      tone: 'unknown',
      title: 'We could not confirm the result',
      detail:
        result.kind === 'timeout'
          ? 'Your payment may still have gone through. We are checking with StackNotes now, this usually takes a few seconds.'
          : 'We lost the connection before we heard back. We are checking with StackNotes now.',
      keepPolling: true,
      canRetry: false,
    };
  }

  const payment = result.data;

  switch (payment.status) {
    case 'succeeded':
      return {
        tone: 'success',
        title: 'Payment received',
        detail: 'Your workspace is ready. A receipt is on its way.',
        keepPolling: false,
        canRetry: false,
      };

    case 'processing':
      // Accepted for processing is not paid. Say so plainly, and keep asking.
      return {
        tone: 'pending',
        title: 'We are confirming your payment',
        detail: `${methodLabel(payment.method)} payments are confirmed by the bank, not in this response. We will update this page as soon as we hear back.`,
        keepPolling: true,
        canRetry: false,
      };

    case 'requires_action':
      return {
        tone: 'pending',
        title: 'Your bank needs one more step',
        detail: 'Finish the approval with your bank, then come back to this page.',
        keepPolling: true,
        canRetry: false,
      };

    case 'failed':
      return {
        tone: 'failure',
        title: 'That payment did not go through',
        detail:
          payment.failureCode === 'insufficient_funds'
            ? 'The bank reported insufficient funds. Nothing was charged. You can try another method.'
            : 'Your bank declined the payment. Nothing was charged. You can try again or use another method.',
        keepPolling: false,
        canRetry: true,
      };
  }
}
