/**
 * [TODO 2] Can the checkout find the purchase again after a reload?
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiResult, Payment, PurchaseView } from '@bigpdf/lab-core/contracts';
import type { LabApi, RestoreContext } from '@bigpdf/lab-core/ui';
import { PURCHASE_STORAGE_KEY } from '@bigpdf/lab-core/ui';
import { restoreCheckout } from '@lab/app/lab/restoreCheckout';

const PAYMENT: Payment = {
  paymentId: 'pay_1',
  purchaseId: 'pur_known',
  workspaceId: 'ws_northstar',
  method: 'bank_debit',
  amountMinor: 2000,
  currency: 'EUR',
  status: 'processing',
  lastAppliedSequence: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function fakeStorage(entries: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => map.delete(key),
    setItem: (key: string, value: string) => map.set(key, value),
  } as Storage;
}

function context({
  search = '',
  storage = fakeStorage(),
  getPurchase = vi.fn(async () => ({ ok: true, data: { purchase: { purchaseId: 'pur_known' }, payment: PAYMENT } }) as unknown as ApiResult<PurchaseView>),
}: {
  search?: string;
  storage?: Storage;
  getPurchase?: LabApi['getPurchase'];
} = {}): RestoreContext & { getPurchase: LabApi['getPurchase'] } {
  const api = { getPurchase } as unknown as LabApi;
  return { search: new URLSearchParams(search), storage, api, getPurchase };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('[TODO 2] the purchase survives a reload', () => {
  it('asks the server about the purchase id it found in localStorage', async () => {
    const ctx = context({ storage: fakeStorage({ [PURCHASE_STORAGE_KEY]: 'pur_known' }) });

    const restored = await restoreCheckout(ctx);

    expect(ctx.getPurchase).toHaveBeenCalledWith('pur_known');
    expect(restored.purchaseId).toBe('pur_known');
  });

  it('asks the server about the purchase id it found in the URL', async () => {
    const ctx = context({ search: 'purchase=pur_known' });

    const restored = await restoreCheckout(ctx);

    expect(ctx.getPurchase).toHaveBeenCalledWith('pur_known');
    expect(restored.purchaseId).toBe('pur_known');
  });

  it('returns the payment state the server reported, not a guess', async () => {
    const restored = await restoreCheckout(context({ search: 'purchase=pur_known' }));

    expect(restored.payment).toEqual(PAYMENT);
  });

  it('keeps the same purchase id so a retry cannot create a second purchase', async () => {
    const storage = fakeStorage({ [PURCHASE_STORAGE_KEY]: 'pur_known' });

    const first = await restoreCheckout(context({ storage }));
    const second = await restoreCheckout(context({ storage }));

    expect(second.purchaseId).toBe(first.purchaseId);
  });
});

describe('[TODO 2] the URL is a lookup key, never proof', () => {
  it('does not invent a succeeded payment because the URL says so', async () => {
    const ctx = context({
      search: 'purchase=pur_known&status=success',
      getPurchase: vi.fn(async () => ({ ok: true, data: { purchase: { purchaseId: 'pur_known' }, payment: PAYMENT } }) as unknown as ApiResult<PurchaseView>),
    });

    const restored = await restoreCheckout(ctx);

    expect(restored.payment?.status).toBe('processing');
  });

  it('reports no payment when the server has none, whatever the query string claims', async () => {
    const ctx = context({
      search: 'status=success',
      storage: fakeStorage({ [PURCHASE_STORAGE_KEY]: 'pur_known' }),
      getPurchase: vi.fn(async () => ({ ok: true, data: { purchase: { purchaseId: 'pur_known' }, payment: null } }) as unknown as ApiResult<PurchaseView>),
    });

    const restored = await restoreCheckout(ctx);

    expect(restored.payment).toBeNull();
  });
});

describe('[TODO 2] starting fresh, and failing to reach the server', () => {
  it('starts a new purchase when nothing is remembered anywhere', async () => {
    const ctx = context();

    const restored = await restoreCheckout(ctx);

    expect(restored.purchaseId).toMatch(/^pur_/);
    expect(restored.payment).toBeNull();
    expect(ctx.getPurchase).not.toHaveBeenCalled();
  });

  it('starts a new purchase when the server has never heard of the remembered id', async () => {
    const ctx = context({
      storage: fakeStorage({ [PURCHASE_STORAGE_KEY]: 'pur_stale' }),
      getPurchase: vi.fn(async () => ({ ok: false, kind: 'not_found' }) as ApiResult<PurchaseView>),
    });

    const restored = await restoreCheckout(ctx);

    expect(restored.purchaseId).not.toBe('pur_stale');
    expect(restored.payment).toBeNull();
  });

  it('keeps the remembered id when the server cannot be reached, and claims no payment', async () => {
    const ctx = context({
      storage: fakeStorage({ [PURCHASE_STORAGE_KEY]: 'pur_known' }),
      getPurchase: vi.fn(async () => ({ ok: false, kind: 'timeout' }) as ApiResult<PurchaseView>),
    });

    const restored = await restoreCheckout(ctx);

    expect(restored.purchaseId).toBe('pur_known');
    expect(restored.payment).toBeNull();
  });
});
