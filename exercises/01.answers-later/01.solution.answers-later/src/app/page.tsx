'use client';

import { DEMO_WORKSPACE_ID } from '@bigpdf/lab-core/contracts';
import { CheckoutScreen, Shell } from '@bigpdf/lab-core/ui';
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
