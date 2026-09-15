'use client';

import { DEMO_WORKSPACE_ID } from '@stacknotes/lab-core/contracts';
import { CheckoutScreen, Shell } from '@stacknotes/lab-core/ui';
import { toCustomerView } from '@/lab/paymentView';
import { restoreCheckout } from '@/lab/restoreCheckout';

export default function CheckoutPage() {
  return (
    <Shell title="Checkout">
      <CheckoutScreen
        workspaceId={DEMO_WORKSPACE_ID}
        toCustomerView={toCustomerView}
        restoreCheckout={restoreCheckout}
      />
    </Shell>
  );
}
