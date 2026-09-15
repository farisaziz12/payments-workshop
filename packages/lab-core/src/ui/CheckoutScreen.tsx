'use client';

/**
 * The checkout screen.
 *
 * Almost everything here is supplied: layout, fetching, the polling loop, the submit
 * guard, the simulator panel and the timeline. Two things are not, and they arrive as
 * props from the app you are working in:
 *
 *   toCustomerView   turns what the server said into what the customer sees
 *   restoreCheckout  finds the purchase again after a reload or a return visit
 *
 * Both are plain functions over plain values. Neither renders anything, which is the
 * point: you can change how payment state is read without touching a component.
 */
import { Grid, Flex } from '@radix-ui/themes';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiResult, CustomerView, Payment, PaymentMethod, PurchaseView } from '../contracts/index';
import { planPriceLabel } from '../contracts/index';
import { PURCHASE_STORAGE_KEY, labApi, type LabApi } from './api';
import { POLL_INTERVAL_MS } from './hooks';
import { PlanPanel } from './PlanPanel';
import { SimulatorPanel } from './SimulatorPanel';
import { StatusPanel } from './StatusPanel';
import { Timeline } from './Timeline';

/** What `restoreCheckout` is handed. Everything it needs, nothing global. */
export type RestoreContext = {
  /** The current query string. Useful as a lookup key, never as proof of anything. */
  search: URLSearchParams;
  /** The browser's localStorage for this origin. */
  storage: Storage;
  /** The application server. */
  api: LabApi;
};

export type RestoreResult = {
  /** The purchase this browser is working on. Stable across reloads and retries. */
  purchaseId: string;
  /** The payment the server has for that purchase, or null when there is none yet. */
  payment: Payment | null;
};

export type CheckoutScreenProps = {
  workspaceId: string;
  toCustomerView: (result: ApiResult<Payment>) => CustomerView;
  restoreCheckout: (context: RestoreContext) => Promise<RestoreResult>;
};

const IDLE_VIEW: CustomerView = {
  tone: 'idle',
  title: 'Ready when you are',
  detail: `${planPriceLabel()}. Pick a payment method to start.`,
  keepPolling: false,
  canRetry: false,
};

/** A purchase response carries a payment or nothing yet. Narrow it to the payment. */
function toPaymentResult(result: ApiResult<PurchaseView>): ApiResult<Payment> | null {
  if (!result.ok) return result;
  return result.data.payment ? { ok: true, data: result.data.payment } : null;
}

export function CheckoutScreen({ workspaceId, toCustomerView, restoreCheckout }: CheckoutScreenProps) {
  const [restoring, setRestoring] = useState(true);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult<Payment> | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [submitting, setSubmitting] = useState(false);
  const restoreRef = useRef(restoreCheckout);

  useEffect(() => {
    restoreRef.current = restoreCheckout;
  }, [restoreCheckout]);

  // Restoring happens after mount, so the server and the first client render agree.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const restored = await restoreRef.current({
        search: new URLSearchParams(window.location.search),
        storage: window.localStorage,
        api: labApi,
      });
      if (cancelled) return;

      // Supplied plumbing: keep the id where a reload and a returning customer can find it.
      window.localStorage.setItem(PURCHASE_STORAGE_KEY, restored.purchaseId);
      const url = new URL(window.location.href);
      url.searchParams.set('purchase', restored.purchaseId);
      window.history.replaceState(null, '', url);

      setPurchaseId(restored.purchaseId);
      if (restored.payment) {
        setResult({ ok: true, data: restored.payment });
        setMethod(restored.payment.method);
      }
      setRestoring(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const view = result ? toCustomerView(result) : IDLE_VIEW;

  const refresh = useCallback(async () => {
    if (!purchaseId) return;
    const next = await labApi.getPurchase(purchaseId);
    setResult((previous) => toPaymentResult(next) ?? previous);
  }, [purchaseId]);

  // Keep asking the server while the view says the answer is not final yet.
  useEffect(() => {
    if (!purchaseId || !view.keepPolling) return;
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [purchaseId, view.keepPolling, refresh]);

  const pay = async () => {
    if (!purchaseId || submitting) return;
    setSubmitting(true);
    const response = await labApi.checkout({ purchaseId, workspaceId, method });
    setResult(toPaymentResult(response));
    setSubmitting(false);
  };

  // Two columns for the two points of view, customer on the left and provider on the
  // right, then the timeline full width underneath where its long rows have room.
  return (
    <Flex direction="column" gap="4">
      <Grid columns={{ initial: '1', md: '1fr 1fr' }} gap="4" align="start">
        <Flex direction="column" gap="4">
          <PlanPanel
            purchaseId={purchaseId}
            restoring={restoring}
            submitting={submitting}
            method={method}
            onMethodChange={setMethod}
            onPay={() => void pay()}
          />
          <StatusPanel
            view={view}
            payment={result?.ok ? result.data : null}
            restoring={restoring}
            submitting={submitting}
            workspaceId={workspaceId}
            onRetry={() => void pay()}
          />
        </Flex>

        <SimulatorPanel
          purchaseId={purchaseId}
          workspaceId={workspaceId}
          method={method}
          onResubmitted={() => void refresh()}
        />
      </Grid>

      <Timeline />
    </Flex>
  );
}
