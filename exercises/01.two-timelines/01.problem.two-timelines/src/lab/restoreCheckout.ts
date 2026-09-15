/**
 * Finding the purchase again after a reload, a closed tab, or a returning customer.
 *
 * 🧾 The checkout screen calls this once, on mount, before it renders anything.
 *    Whatever it returns becomes the starting state.
 *
 * 🧾 What you are given, in `context`:
 *      context.search    the query string, as URLSearchParams
 *      context.storage   this origin's localStorage
 *      context.api       the application server: `await context.api.getPurchase(id)`
 *
 * 🧾 `getPurchase` returns an `ApiResult<PurchaseView>`:
 *      { ok: true, data: { purchase, payment } }   payment is null when there is none yet
 *      { ok: false, kind: 'not_found' }            this server has no such purchase
 *      { ok: false, kind: 'timeout' | 'network' }  we could not reach the server
 *
 * 🧾 The screen saves the purchase id you return into localStorage and into the URL.
 *    You do not have to write either one. The key it saves under is exported as
 *    `PURCHASE_STORAGE_KEY` from '@stacknotes/lab-core/ui', alongside `mintPurchaseId`.
 */
import type { RestoreContext, RestoreResult } from '@stacknotes/lab-core/ui';
import { mintPurchaseId } from '@stacknotes/lab-core/ui';

export async function restoreCheckout(context: RestoreContext): Promise<RestoreResult> {
  // 🦆 Task 2: this never asks the server anything. It trusts the URL, and when the URL
  //    says nothing it starts a brand new purchase.
  //
  //    Two customers are having a bad time because of it:
  //      - one paid by bank debit, reloaded while it was confirming, and got an empty
  //        checkout page as if they had never paid,
  //      - one worked out that adding ?status=success to the URL shows a success screen.
  //
  //    Make this function find the purchase the customer already has and ask the server
  //    what state it is in. Remember that a purchase id is a lookup key. It is not proof
  //    of anything until the server says so, and neither is anything else in the URL.

  if (context.search.get('status') === 'success') {
    return {
      purchaseId: context.search.get('purchase') ?? mintPurchaseId(),
      payment: {
        paymentId: 'pay_unknown',
        purchaseId: context.search.get('purchase') ?? 'pur_unknown',
        workspaceId: 'ws_northstar',
        method: 'card',
        amountMinor: 2000,
        currency: 'EUR',
        status: 'succeeded',
        lastAppliedSequence: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  return { purchaseId: mintPurchaseId(), payment: null };
}
