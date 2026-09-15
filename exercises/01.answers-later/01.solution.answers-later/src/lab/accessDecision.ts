/**
 * Deciding whether the workspace may be used.
 *
 * The server already made this decision and sent it as an entitlement. The job here is
 * to render that decision, not to reach a second opinion from the payment status the
 * browser happens to be holding, and certainly not from the URL.
 */
import type { AccessDecision, AccessInputs, EntitlementReason } from '@bigpdf/lab-core/contracts';

const LOCKED_COPY: Record<EntitlementReason, string> = {
  no_payment: 'We have no payment for this workspace yet.',
  payment_processing:
    'Your payment is still being confirmed. We will turn the workspace on the moment the bank confirms it.',
  payment_failed: 'The last payment did not go through, so the workspace is still locked.',
  payment_for_other_workspace: 'That payment belongs to a different workspace, so it cannot unlock this one.',
  payment_succeeded: 'Your payment went through.',
};

export function deriveAccess({ workspaceId, entitlement }: AccessInputs): AccessDecision {
  // Note what is missing: clientStatus and search are handed to this function and both
  // are ignored. Neither can grant access. A query parameter is something anyone can type,
  // and the browser's copy of the payment status is a cache, not an authority.
  if (!entitlement) {
    return {
      unlocked: false,
      headline: 'Checking your access',
      detail: 'Asking the server whether this workspace is active.',
    };
  }

  if (entitlement.access === 'active' && entitlement.workspaceId === workspaceId) {
    return {
      unlocked: true,
      headline: 'Workspace unlocked',
      detail: 'The server confirmed a succeeded payment for this workspace.',
    };
  }

  return {
    unlocked: false,
    headline: 'Workspace locked',
    detail: LOCKED_COPY[entitlement.reason],
  };
}
