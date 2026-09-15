/**
 * The entitlement decision: may this workspace be used?
 *
 * This lab's business policy, chosen deliberately and stated in docs/payment-state-contracts.md:
 *
 *   Access is granted only when this server can see a succeeded payment that belongs to
 *   this workspace AND whose purchase also belongs to this workspace. A processing payment
 *   grants nothing. A redirect, a query parameter, and a button click grant nothing.
 *
 * Other products choose differently: provisional access while a bank debit clears, or a
 * grace period after a failure. Those are valid, they are just not this exercise's policy.
 *
 * And a succeeded payment is not a settled one. Refunds, chargebacks and disputes can still
 * take the money back later. Entitlement is a decision you keep making, not a flag you set once.
 */
import type { Entitlement, Payment } from '../contracts/index';
import { getStore } from './store';

const RANK: Record<Payment['status'], number> = {
  succeeded: 4,
  processing: 3,
  requires_action: 2,
  failed: 1,
};

export function decideEntitlement(workspaceId: string): Entitlement {
  const store = getStore();
  const decidedAt = new Date().toISOString();

  const forWorkspace = [...store.payments.values()].filter((payment) => payment.workspaceId === workspaceId);

  const succeeded = forWorkspace.filter((payment) => payment.status === 'succeeded');
  for (const payment of succeeded) {
    const purchase = store.purchases.get(payment.purchaseId);
    if (purchase && purchase.workspaceId === workspaceId) {
      return {
        workspaceId,
        access: 'active',
        reason: 'payment_succeeded',
        grantedByPaymentId: payment.paymentId,
        decidedAt,
      };
    }
  }

  // A succeeded payment that does not line up with a purchase for this workspace
  // is not a grant. It is a mismatch worth naming.
  if (succeeded.length > 0) {
    return { workspaceId, access: 'none', reason: 'payment_for_other_workspace', decidedAt };
  }

  const best = forWorkspace.sort((a, b) => RANK[b.status] - RANK[a.status])[0];
  if (!best) return { workspaceId, access: 'none', reason: 'no_payment', decidedAt };
  if (best.status === 'processing' || best.status === 'requires_action') {
    return { workspaceId, access: 'none', reason: 'payment_processing', decidedAt };
  }
  return { workspaceId, access: 'none', reason: 'payment_failed', decidedAt };
}
