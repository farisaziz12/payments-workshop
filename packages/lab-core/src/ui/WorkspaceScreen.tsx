'use client';

/**
 * The workspace page.
 *
 * It gathers the three things the browser knows and hands them to your access check.
 * The check returns a decision; this file renders it. Only one of the three inputs is
 * an authority, and choosing it is the exercise.
 */
import { LockClosedIcon, LockOpen1Icon } from '@radix-ui/react-icons';
import { Badge, Callout, Card, DataList, Flex, Heading, Link, Text } from '@radix-ui/themes';
import { useEffect, useMemo, useState } from 'react';
import type { AccessDecision, AccessInputs, ClientStatus } from '../contracts/index';
import { DEMO_WORKSPACE_NAME } from '../contracts/index';
import { PURCHASE_STORAGE_KEY, labApi } from './api';
import { useEntitlement } from './hooks';
import { Timeline } from './Timeline';

export function WorkspaceScreen({
  workspaceId,
  initialSearch,
  deriveAccess,
}: {
  workspaceId: string;
  /** The query string, handed down from the server render so the first paint already has it. */
  initialSearch: string;
  deriveAccess: (inputs: AccessInputs) => AccessDecision;
}) {
  const entitlement = useEntitlement(workspaceId);
  const [clientStatus, setClientStatus] = useState<ClientStatus>('none');
  const search = useMemo(() => new URLSearchParams(initialSearch), [initialSearch]);

  useEffect(() => {
    let alive = true;

    const tick = async () => {
      const current = new URLSearchParams(window.location.search);
      const purchaseId = current.get('purchase') ?? window.localStorage.getItem(PURCHASE_STORAGE_KEY);
      if (!purchaseId) return;

      const result = await labApi.getPurchase(purchaseId);
      if (!alive) return;
      if (!result.ok) {
        setClientStatus(result.kind === 'not_found' ? 'none' : 'unknown');
        return;
      }
      setClientStatus(result.data.payment?.status ?? 'none');
    };

    void tick();
    const timer = setInterval(() => void tick(), 1500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const decision = deriveAccess({ workspaceId, entitlement, clientStatus, search });

  return (
    <Flex direction="column" gap="4">
      <Card size="3">
        <Flex direction="column" gap="4">
          <Flex direction="column" gap="1">
            <Heading size="4" as="h2">
              {DEMO_WORKSPACE_NAME} workspace
            </Heading>
            <Text size="2" color="gray">
              This page asks the application server whether the workspace may be used, on every poll.
            </Text>
          </Flex>

          <Callout.Root
            color={decision.unlocked ? 'jade' : 'amber'}
            variant="surface"
            data-testid="access"
            data-unlocked={decision.unlocked ? 'true' : 'false'}
          >
            <Callout.Icon>{decision.unlocked ? <LockOpen1Icon /> : <LockClosedIcon />}</Callout.Icon>
            <Callout.Text size="2">
              <Text as="span" weight="bold" data-testid="access-headline">
                {decision.headline}
              </Text>{' '}
              <Text as="span" data-testid="access-detail">
                {decision.detail}
              </Text>
            </Callout.Text>
          </Callout.Root>

          <DataList.Root size="2" orientation={{ initial: 'vertical', sm: 'horizontal' }}>
            <DataList.Item>
              <DataList.Label minWidth="150px">Server entitlement</DataList.Label>
              <DataList.Value>
                <Badge color={entitlement?.access === 'active' ? 'jade' : 'gray'} variant="soft" data-testid="server-entitlement">
                  {entitlement ? `${entitlement.access} (${entitlement.reason})` : 'asking'}
                </Badge>
              </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label minWidth="150px">Client payment status</DataList.Label>
              <DataList.Value>
                <Text data-testid="client-status">{clientStatus}</Text>
              </DataList.Value>
            </DataList.Item>
          </DataList.Root>

          <Link href="/" size="2" data-testid="back-to-checkout">
            Back to checkout
          </Link>
        </Flex>
      </Card>

      <Timeline />
    </Flex>
  );
}
