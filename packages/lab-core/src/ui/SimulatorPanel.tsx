'use client';

import { DoubleArrowRightIcon, CopyIcon, ResetIcon } from '@radix-ui/react-icons';
import { Badge, Button, Card, Flex, Heading, RadioCards, Separator, Skeleton, Text } from '@radix-ui/themes';
import { useState } from 'react';
import type { PaymentMethod, ScenarioCategory, ScenarioId } from '../contracts/index';
import { labApi } from './api';
import { useSimulator } from './hooks';
import { PROVIDER_LABEL } from './labels';

const CATEGORY: Record<ScenarioCategory, string> = {
  baseline: 'Immediate outcome',
  delayed: 'Outcome arrives later',
  delivery: 'Delivery goes wrong',
};

/**
 * The control panel for the simulated provider.
 *
 * Every scenario is deterministic, so the same choice produces the same states in the
 * same order every time. That is what makes a broken screen worth debugging.
 */
export function SimulatorPanel({
  purchaseId,
  workspaceId,
  method,
  onResubmitted,
}: {
  purchaseId: string | null;
  workspaceId: string;
  method: PaymentMethod;
  onResubmitted?: () => void;
}) {
  const { state, setScenario, deliverNow, reset } = useSimulator();
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const selected = state?.scenarios.find((scenario) => scenario.id === state.scenarioId);
  const waiting = state?.pendingDeliveries ?? [];

  return (
    <Card size="3" data-testid="simulator">
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="1">
          <Heading size="4" as="h2">
            {PROVIDER_LABEL} control panel
          </Heading>
          <Text size="2" color="gray">
            A local simulation, not a real payment rail.
          </Text>
        </Flex>

        <Skeleton loading={!state}>
          <Flex direction="column" gap="4">
            {(['baseline', 'delayed', 'delivery'] as const).map((category) => {
              const scenarios = (state?.scenarios ?? []).filter((scenario) => scenario.category === category);
              if (scenarios.length === 0) return null;

              return (
                <Flex key={category} direction="column" gap="2">
                  <Text size="1" color="gray" weight="medium">
                    {CATEGORY[category]}
                  </Text>
                  <RadioCards.Root
                    value={state?.scenarioId}
                    onValueChange={(next) => void run(() => setScenario(next as ScenarioId))}
                    columns="1"
                    gap="2"
                    size="1"
                  >
                    {scenarios.map((scenario) => (
                      <RadioCards.Item key={scenario.id} value={scenario.id} disabled={busy}>
                        <Flex direction="column" gap="1" align="start" width="100%">
                          <Text size="2" weight="bold">
                            {scenario.name}
                          </Text>
                          <Text size="1" color="gray">
                            {scenario.description}
                          </Text>
                        </Flex>
                      </RadioCards.Item>
                    ))}
                  </RadioCards.Root>
                </Flex>
              );
            })}
          </Flex>
        </Skeleton>

        {selected ? (
          <Text size="2" color="gray" data-testid="scenario-teaches">
            {selected.teaches}
          </Text>
        ) : null}

        {waiting.length > 0 ? (
          <Flex gap="2" wrap="wrap" data-testid="pending-deliveries">
            {waiting.map((delivery) => (
              <Badge key={delivery.eventId} color="amber" variant="soft">
                {delivery.type} in {Math.ceil(delivery.dueInMs / 1000)}s
              </Badge>
            ))}
          </Flex>
        ) : null}

        <Separator size="4" />

        <Flex gap="2" wrap="wrap">
          <Button variant="soft" disabled={busy} onClick={() => void run(deliverNow)} data-testid="deliver-now">
            <DoubleArrowRightIcon />
            Deliver events now
          </Button>

          <Button
            variant="soft"
            disabled={busy || !purchaseId}
            data-testid="resubmit"
            onClick={() =>
              void run(async () => {
                if (!purchaseId) return;
                await labApi.checkout({ purchaseId, workspaceId, method });
                onResubmitted?.();
              })
            }
          >
            <CopyIcon />
            Submit again
          </Button>

          <Button
            variant="soft"
            color="red"
            disabled={busy}
            data-testid="reset"
            onClick={() =>
              void run(async () => {
                await reset();
                window.localStorage.clear();
                window.location.href = window.location.pathname;
              })
            }
          >
            <ResetIcon />
            Reset
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
