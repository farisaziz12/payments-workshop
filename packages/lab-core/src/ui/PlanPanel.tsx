'use client';

import { Badge, Button, Card, Flex, Heading, RadioCards, Skeleton, Spinner, Text } from '@radix-ui/themes';
import type { PaymentMethod } from '../contracts/index';
import { DEMO_WORKSPACE_NAME, PAYMENT_METHODS, PLAN, formatMoney } from '../contracts/index';
import { APP_LABEL } from './labels';

/** The plan, the method picker and the one button that starts a payment. */
export function PlanPanel({
  purchaseId,
  restoring,
  submitting,
  method,
  onMethodChange,
  onPay,
}: {
  purchaseId: string | null;
  restoring: boolean;
  submitting: boolean;
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  onPay: () => void;
}) {
  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="1">
          <Heading size="4" as="h2">
            {PLAN.name}
          </Heading>
          <Flex align="baseline" gap="2" wrap="wrap">
            <Text size="7" weight="bold" data-testid="plan-price">
              {formatMoney(PLAN.amountMinor, PLAN.currency)}
            </Text>
            <Text size="2" color="gray">
              per {PLAN.unit} / {PLAN.interval}, {PLAN.taxNote}
            </Text>
          </Flex>
          <Text size="2" color="gray">
            One workspace, {DEMO_WORKSPACE_NAME}, on {APP_LABEL}. Billed monthly.
          </Text>
        </Flex>

        <Flex direction="column" gap="2" asChild>
          <fieldset style={{ border: 0, margin: 0, padding: 0 }} disabled={submitting}>
            <Text as="label" size="2" weight="medium" htmlFor="method-picker">
              Payment method
            </Text>
            <RadioCards.Root
              id="method-picker"
              value={method}
              onValueChange={(next) => onMethodChange(next as PaymentMethod)}
              columns="1"
              gap="2"
              size="2"
            >
              {PAYMENT_METHODS.map((entry) => (
                <RadioCards.Item key={entry.id} value={entry.id}>
                  <Flex direction="column" gap="1" align="start" width="100%">
                    <Text weight="bold">{entry.label}</Text>
                    <Text size="1" color="gray">
                      {entry.timeline}
                    </Text>
                  </Flex>
                </RadioCards.Item>
              ))}
            </RadioCards.Root>
          </fieldset>
        </Flex>

        <Button size="3" onClick={onPay} disabled={submitting || restoring} data-testid="pay">
          <Spinner loading={submitting} />
          {submitting ? 'Talking to the provider' : `Pay ${formatMoney(PLAN.amountMinor, PLAN.currency)}`}
        </Button>

        <Flex align="center" gap="2">
          <Text size="1" color="gray">
            Purchase
          </Text>
          <Skeleton loading={restoring}>
            <Badge color="gray" variant="soft" data-testid="purchase-id">
              {restoring ? 'restoring' : purchaseId ?? 'not started'}
            </Badge>
          </Skeleton>
        </Flex>
      </Flex>
    </Card>
  );
}
