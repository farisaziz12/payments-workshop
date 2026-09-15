/**
 * Deciding whether the workspace may be used.
 *
 * 🦉 This is a pure function. It takes what the browser knows and returns a decision.
 *    Rendering it is somebody else's job, so there is no styling or markup in here.
 *
 * 🦉 The three things you are handed:
 *      inputs.entitlement    the application server's decision, or null while it loads.
 *                            { access: 'none' | 'active', reason, workspaceId, grantedByPaymentId? }
 *      inputs.clientStatus   what this browser last heard about the payment. A cache.
 *      inputs.search         the query string from the customer's link.
 *
 * 🦉 Only one of those three decided anything on a server.
 */
import type { AccessDecision, AccessInputs } from '@stacknotes/lab-core/contracts';

export function deriveAccess(inputs: AccessInputs): AccessDecision {
  // 🐨 Task 3: this unlocks the workspace without ever reading the server's decision.
  //
  //    Support has two tickets open:
  //      - a customer whose bank debit is still being confirmed already has full access,
  //      - someone shared a link with ?paid=1 on the end and it unlocked the workspace.
  //
  //    Return the server's decision instead. While the entitlement is still null, say you
  //    are checking rather than guessing. When it is present, `access` decides whether the
  //    workspace is unlocked, and `reason` is what the customer should read.
  //
  //    Reasons you can get back: 'no_payment' | 'payment_processing' | 'payment_failed'
  //    | 'payment_for_other_workspace' | 'payment_succeeded'.

  const hasPaidFlag = inputs.search.get('paid') === '1';
  const looksPaid = inputs.clientStatus !== 'failed' && inputs.clientStatus !== 'none';

  if (hasPaidFlag || looksPaid) {
    return {
      unlocked: true,
      headline: 'Workspace unlocked',
      detail: 'Thanks for subscribing. Everything is available.',
    };
  }

  return {
    unlocked: false,
    headline: 'Workspace locked',
    detail: 'Subscribe to unlock this workspace.',
  };
}
