'use client';

import { Badge, Card, DataList, Flex, Grid, Heading, Progress, Text } from '@radix-ui/themes';
import type { HealthSnapshot, SegmentHealth } from '../contracts/index';
import { segmentLabel } from '../contracts/index';
import { formatRate, HEALTH, healthTone } from './theme';

/**
 * Success rate per segment, which is the view that actually shows an incident.
 *
 * The headline number above it is the one a status page would show. Watch them disagree.
 */
export function SegmentGrid({ health }: { health: HealthSnapshot }) {
  return (
    <Flex direction="column" gap="3">
      <Flex align="baseline" justify="between" gap="3" wrap="wrap">
        <Heading size="4" as="h2">
          By segment
        </Heading>
        <Text size="1" color="gray">
          Rolling {health.windowSeconds}s window
        </Text>
      </Flex>

      <Grid columns={{ initial: '1', sm: '2', lg: '3' }} gap="3">
        {health.segments.map((segment) => (
          <SegmentCard key={segment.key} health={segment} />
        ))}
      </Grid>
    </Flex>
  );
}

function SegmentCard({ health }: { health: SegmentHealth }) {
  const tone = healthTone(health);
  const style = HEALTH[tone];
  const Icon = style.icon;

  return (
    <Card size="2" data-testid={`segment-${health.key}`} data-tone={tone}>
      <Flex direction="column" gap="3">
        <Flex align="center" justify="between" gap="2">
          <Text size="2" weight="medium">
            {segmentLabel(health.segment)}
          </Text>
          <Badge color={style.color} variant="soft" data-testid={`segment-tone-${health.key}`}>
            <Icon width={12} height={12} />
            {style.label}
          </Badge>
        </Flex>

        <Flex align="baseline" gap="2">
          <Text size="6" weight="bold" data-testid={`segment-rate-${health.key}`}>
            {formatRate(health.successRate)}
          </Text>
          <Text size="1" color="gray">
            of {health.attempts} attempts
          </Text>
        </Flex>

        <Progress value={Math.round(health.successRate * 100)} color={style.color} size="1" />

        <DataList.Root size="1" orientation="horizontal">
          {health.gateways.map((gateway) => (
            <DataList.Item key={gateway.gatewayId}>
              <DataList.Label minWidth="72px">{gateway.gatewayId}</DataList.Label>
              <DataList.Value>
                <Text
                  color={healthTone(gateway) === 'degraded' ? 'red' : undefined}
                  data-testid={`segment-gateway-${health.key}-${gateway.gatewayId}`}
                >
                  {formatRate(gateway.successRate)} of {gateway.attempts}
                </Text>
              </DataList.Value>
            </DataList.Item>
          ))}
          {health.gateways.length === 0 ? (
            <DataList.Item>
              <DataList.Label minWidth="72px">routing</DataList.Label>
              <DataList.Value>
                <Text color="gray">nothing reached a gateway</Text>
              </DataList.Value>
            </DataList.Item>
          ) : null}
        </DataList.Root>
      </Flex>
    </Card>
  );
}
