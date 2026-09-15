/**
 * Finding the purchase again after a reload, a closed tab, or a returning customer.
 *
 * The rules:
 *   - the purchase id can come from the URL or from localStorage, whichever is there,
 *   - it is only a lookup key, so nothing is true until the server confirms it,
 *   - anything else in the query string is a hint at best. `?status=success` proves nothing:
 *     anyone can type it.
 */
import type { RestoreContext, RestoreResult } from '@bigpdf/lab-core/ui';
import { PURCHASE_STORAGE_KEY, mintPurchaseId } from '@bigpdf/lab-core/ui';

export async function restoreCheckout({ search, storage, api }: RestoreContext): Promise<RestoreResult> {
  const known = search.get('purchase') ?? storage.getItem(PURCHASE_STORAGE_KEY);

  if (known) {
    const result = await api.getPurchase(known);

    if (result.ok) {
      // The server knows this purchase. Its payment, if any, is the state to render.
      return { purchaseId: known, payment: result.data.payment };
    }

    if (result.kind !== 'not_found') {
      // We could not reach the server. Keep the id so the poll can catch up, and
      // show no payment rather than inventing one.
      return { purchaseId: known, payment: null };
    }
    // A 404 means this id belongs to nothing here, so fall through and start fresh.
  }

  return { purchaseId: mintPurchaseId(), payment: null };
}
