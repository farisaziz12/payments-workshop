'use client';

import { Badge, Callout, Card, Flex, Grid, Progress, Text } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import type { DashboardState, Ledger } from '../contracts/index';
import { formatMoney, segmentLabel } from '../contracts/index';
import { AttemptFeed } from './AttemptFeed';
import { ChaosPanel } from './ChaosPanel';
import { GatewayTable } from './GatewayTable';
import { SegmentGrid } from './SegmentGrid';
import { useDashboard } from './hooks';
import { formatRate } from './theme';

/**
 * The payments console.
 *
 * Everything on this screen is the server's own account of what your orchestrator did.
 * The dashboard polls independently of your code, and each poll also advances the
 * simulated traffic, so the numbers keep moving whether or not your routing works.
 */
export function Dashboard() {
  const controls = useDashboard();
  const state = controls.state;

  if (!state) {
    return (
      <Card size="3">
        <Text size="2" color="gray" data-testid="dashboard-loading">
          Asking the server what the last few seconds of traffic did.
        </Text>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="5">
      {controls.stale ? (
        <Callout.Root color="amber" variant="surface" role="status">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text size="2">
            <Text as="span" weight="bold">
              These numbers are stale.
            </Text>{' '}
            <Text as="span">The last poll did not come back, so this is the previous snapshot.</Text>
          </Callout.Text>
        </Callout.Root>
      ) : null}

      <Headline state={state} />

      <Grid columns={{ initial: '1', lg: '3' }} gap="4" align="start">
        <Flex direction="column" gap="4" gridColumn={{ lg: 'span 2' }}>
          <SegmentGrid health={state.health} />
          <GatewayTable gateways={state.gateways} health={state.health} />
        </Flex>

        <Flex direction="column" gap="4">
          <ChaosPanel orchestrator={state.orchestrator} controls={controls} />
          <AttemptFeed attempts={state.recent} />
        </Flex>
      </Grid>
    </Flex>
  );
}

function Headline({ state }: { state: DashboardState }) {
  const { health, ledger } = state;
  const degraded = health.segments.filter((segment) => segment.degraded);

  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        <Flex align={{ initial: 'start', sm: 'end' }} justify="between" gap="4" direction={{ initial: 'column', sm: 'row' }}>
          <Flex direction="column" gap="1">
            <Text size="1" color="gray" weight="medium">
              Overall authorisation rate
            </Text>
            <Flex align="baseline" gap="3">
              <Text size="8" weight="bold" data-testid="overall-rate">
                {formatRate(health.overallSuccessRate)}
              </Text>
              <Text size="2" color="gray">
                {health.successes} of {health.attempts} in {health.windowSeconds}s
              </Text>
            </Flex>
          </Flex>

          {degraded.length > 0 ? (
            <Badge color="red" variant="soft" size="2" data-testid="degraded-banner">
              <ExclamationTriangleIcon width={14} height={14} />
              {degraded.length === 1
                ? `${segmentLabel(degraded[0]!.segment)} is degraded`
                : `${degraded.length} segments degraded`}
            </Badge>
          ) : (
            <Badge color="jade" variant="soft" size="2" data-testid="degraded-banner">
              Every segment healthy
            </Badge>
          )}
        </Flex>

        <Progress
          value={Math.round(health.overallSuccessRate * 100)}
          color={degraded.length > 0 ? 'amber' : 'jade'}
          size="2"
        />

        <LedgerStrip ledger={ledger} />
      </Flex>
    </Card>
  );
}

function LedgerStrip({ ledger }: { ledger: Ledger }) {
  const cells: ReadonlyArray<{ label: string; value: string; testid: string; alarming: boolean }> = [
    { label: 'Captured', value: String(ledger.captured), testid: 'ledger-captured', alarming: false },
    {
      label: 'Fees paid',
      value: formatMoney(ledger.feesMinor, 'EUR'),
      testid: 'ledger-fees',
      alarming: false,
    },
    {
      label: 'Charged twice',
      value: String(ledger.duplicateCaptures),
      testid: 'ledger-duplicates',
      alarming: ledger.duplicateCaptures > 0,
    },
    {
      label: 'Misrouted',
      value: String(ledger.misrouted),
      testid: 'ledger-misrouted',
      alarming: ledger.misrouted > 0,
    },
    {
      label: 'Not routed',
      value: String(ledger.abandoned),
      testid: 'ledger-abandoned',
      alarming: false,
    },
  ];

  return (
    <Grid columns={{ initial: '2', sm: '5' }} gap="3">
      {cells.map((cell) => (
        <Flex key={cell.testid} direction="column" gap="1">
          <Text size="1" color="gray">
            {cell.label}
          </Text>
          <Text
            size="4"
            weight="bold"
            color={cell.alarming ? 'red' : undefined}
            data-testid={cell.testid}
          >
            {cell.value}
          </Text>
        </Flex>
      ))}
    </Grid>
  );
}
