'use client';

import { Badge, Button, Callout, Card, DataList, Flex, Grid, Heading, Separator, Text } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import type { AccountView, BillingState } from '../contracts/index';
import { RETURN_REASON_LABEL, formatMoney, methodLabel } from '../contracts/index';
import { useBilling, type BillingControls } from './hooks';
import { PAYMENT_STATE, STAGE } from './theme';

/**
 * The billing console.
 *
 * Three accounts, one clock, and a dunning run that happens every time the clock moves.
 * Everything you see is the server applying your two functions to the same three invoices.
 */
export function BillingConsole() {
  const controls = useBilling();
  const state = controls.state;

  if (!state) {
    return (
      <Card size="3">
        <Text size="2" color="gray" data-testid="billing-loading">
          Asking the server where the clock is.
        </Text>
      </Card>
    );
  }

  const suspended = state.accounts.filter((account) => !account.active);
  const wrongly = suspended.filter((account) => account.invoice.paymentState !== 'returned');

  return (
    <Flex direction="column" gap="5">
      <ClockBar state={state} controls={controls} />

      {wrongly.length > 0 ? (
        <Callout.Root color="red" variant="surface" role="status" data-testid="wrongly-suspended">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text size="2">
            <Text as="span" weight="bold">
              {wrongly.map((account) => account.invoice.workspaceName).join(', ')} suspended with
              money still in flight.
            </Text>{' '}
            <Text as="span">No bank has said anything about these payments yet.</Text>
          </Callout.Text>
        </Callout.Root>
      ) : null}

      <Grid columns={{ initial: '1', md: '3' }} gap="4" align="start">
        {state.accounts.map((account) => (
          <AccountCard key={account.invoice.invoiceId} account={account} />
        ))}
      </Grid>
    </Flex>
  );
}

function ClockBar({ state, controls }: { state: BillingState; controls: BillingControls }) {
  const date = new Date(state.now);

  return (
    <Card size="3">
      <Flex
        direction={{ initial: 'column', sm: 'row' }}
        align={{ initial: 'start', sm: 'center' }}
        justify="between"
        gap="4"
      >
        <Flex direction="column" gap="1">
          <Text size="1" color="gray" weight="medium">
            Billing clock
          </Text>
          <Flex align="baseline" gap="3">
            <Text size="7" weight="bold" data-testid="clock-day">
              Day {state.day}
            </Text>
            <Text size="2" color="gray" data-testid="clock-date">
              {date.toUTCString().slice(0, 16)}
            </Text>
          </Flex>
          <Text size="1" color="gray">
            A card gets {state.cardGraceHours} hours. A SEPA debit can be returned for up to{' '}
            {state.sepaReturnBusinessDays} business days.
          </Text>
        </Flex>

        <Flex gap="2" wrap="wrap">
          <Button variant="soft" onClick={() => void controls.advance(24)} data-testid="advance-day">
            Advance a day
          </Button>
          <Button variant="soft" color="gray" onClick={() => void controls.advance(24 * 3)} data-testid="advance-three">
            Advance three
          </Button>
          <Button variant="soft" color="gray" onClick={() => void controls.reset()} data-testid="reset">
            Back to day 0
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}

function AccountCard({ account }: { account: AccountView }) {
  const { invoice, window: graceWindow, decision } = account;
  const stage = STAGE[invoice.stage];
  const payment = PAYMENT_STATE[invoice.paymentState];
  const StageIcon = stage.icon;
  const PaymentIcon = payment.icon;

  return (
    <Card
      size="3"
      data-testid={`account-${invoice.workspaceId}`}
      data-stage={invoice.stage}
      data-active={account.active ? 'yes' : 'no'}
    >
      <Flex direction="column" gap="4">
        <Flex align="center" justify="between" gap="3">
          <Heading size="4" as="h2">
            {invoice.workspaceName}
          </Heading>
          <Badge color={stage.color} variant="soft" data-testid={`stage-${invoice.workspaceId}`}>
            <StageIcon width={12} height={12} />
            {stage.label}
          </Badge>
        </Flex>

        <DataList.Root size="1">
          <DataList.Item>
            <DataList.Label minWidth="96px">Invoice</DataList.Label>
            <DataList.Value>
              {formatMoney(invoice.amountMinor, invoice.currency)} by {methodLabel(invoice.method)}
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="96px">Payment</DataList.Label>
            <DataList.Value>
              <Badge color={payment.color} variant="soft" data-testid={`payment-${invoice.workspaceId}`}>
                <PaymentIcon width={12} height={12} />
                {payment.label}
              </Badge>
            </DataList.Value>
          </DataList.Item>
          {invoice.returnReason ? (
            <DataList.Item>
              <DataList.Label minWidth="96px">Bank said</DataList.Label>
              <DataList.Value>{RETURN_REASON_LABEL[invoice.returnReason]}</DataList.Value>
            </DataList.Item>
          ) : null}
          <DataList.Item>
            <DataList.Label minWidth="96px">Past due</DataList.Label>
            <DataList.Value data-testid={`days-${invoice.workspaceId}`}>
              {account.daysPastDue} {account.daysPastDue === 1 ? 'day' : 'days'}
            </DataList.Value>
          </DataList.Item>
        </DataList.Root>

        <Separator size="4" />

        <Flex direction="column" gap="1">
          <Text size="1" color="gray" weight="medium">
            Grace window
          </Text>
          <Text size="2" data-testid={`deadline-${invoice.workspaceId}`}>
            {new Date(graceWindow.deadline).toUTCString().slice(0, 16)}
          </Text>
          <Text size="1" color="gray" data-testid={`window-reason-${invoice.workspaceId}`}>
            {graceWindow.reason}
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="1" color="gray" weight="medium">
            Decision today
          </Text>
          <Text size="2" data-testid={`decision-${invoice.workspaceId}`}>
            {decision.action}
          </Text>
          <Text size="1" color="gray" data-testid={`decision-reason-${invoice.workspaceId}`}>
            {decision.reason}
          </Text>
        </Flex>

        <Badge
          color={account.active ? 'jade' : 'red'}
          variant="soft"
          size="2"
          data-testid={`access-${invoice.workspaceId}`}
        >
          {account.active ? 'Product available' : 'Product suspended'}
        </Badge>
      </Flex>
    </Card>
  );
}
