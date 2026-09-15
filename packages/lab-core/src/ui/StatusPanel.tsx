'use client';

import { ArrowRightIcon } from '@radix-ui/react-icons';
import { Button, Callout, Card, DataList, Flex, Link, Skeleton, Text } from '@radix-ui/themes';
import type { CustomerView, Payment } from '../contracts/index';
import { DEMO_WORKSPACE_NAME } from '../contracts/index';
import { STATUS } from './theme';

/**
 * What the customer reads about their payment.
 *
 * Everything here is driven by the `CustomerView` the exercise returns. The tone picks
 * the colour and the icon, so getting the tone right is the whole job, and getting it
 * wrong is visible immediately rather than buried in a class name.
 */
export function StatusPanel({
  view,
  payment,
  restoring,
  submitting,
  workspaceId,
  onRetry,
}: {
  view: CustomerView;
  payment: Payment | null;
  restoring: boolean;
  submitting: boolean;
  workspaceId: string;
  onRetry: () => void;
}) {
  const status = STATUS[view.tone];
  const Icon = status.icon;

  return (
    <Card size="3" data-testid="status" data-tone={view.tone}>
      <Flex direction="column" gap="4">
        <Callout.Root color={status.color} variant="surface" role="status" aria-live="polite">
          <Callout.Icon>
            <Icon />
          </Callout.Icon>
          <Callout.Text size="2">
            <Text as="span" weight="bold" data-testid="status-title">
              {view.title}
            </Text>{' '}
            <Text as="span" data-testid="status-detail">
              {view.detail}
            </Text>
          </Callout.Text>
        </Callout.Root>

        <DataList.Root size="2" orientation={{ initial: 'vertical', sm: 'horizontal' }}>
          <DataList.Item>
            <DataList.Label minWidth="150px">Server payment state</DataList.Label>
            <DataList.Value>
              <Skeleton loading={restoring}>
                <Text data-testid="server-status">
                  {restoring ? 'asking the server' : payment ? payment.status : 'no payment yet'}
                </Text>
              </Skeleton>
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="150px">Asking the server</DataList.Label>
            <DataList.Value>
              <Text data-testid="polling">{view.keepPolling ? 'yes' : 'no'}</Text>
            </DataList.Value>
          </DataList.Item>
        </DataList.Root>

        <Flex gap="4" align="center" wrap="wrap">
          {view.canRetry ? (
            <Button variant="soft" color={status.color} disabled={submitting} onClick={onRetry} data-testid="retry">
              Try again
            </Button>
          ) : null}

          <Link href={`/workspace/${workspaceId}`} size="2" data-testid="workspace-link">
            Open the {DEMO_WORKSPACE_NAME} workspace <ArrowRightIcon style={{ verticalAlign: 'text-bottom' }} />
          </Link>
        </Flex>
      </Flex>
    </Card>
  );
}
