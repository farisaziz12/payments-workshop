'use client';

import { Badge, Card, Code, Flex, Heading, Table, Text } from '@radix-ui/themes';
import type { Gateway, GatewayHealth, HealthSnapshot } from '../contracts/index';
import { methodLabel } from '../contracts/index';
import { formatRate, HEALTH, healthTone } from './theme';

/**
 * The gateway table. Read the "Accepts" column before you write any routing: two of the
 * three gateways cannot take everything, and one of them is the only home SEPA has.
 */
export function GatewayTable({
  gateways,
  health,
}: {
  gateways: ReadonlyArray<Gateway>;
  health: HealthSnapshot;
}) {
  const byId = new Map<string, GatewayHealth>(health.gateways.map((entry) => [entry.gatewayId, entry]));

  return (
    <Card size="2">
      <Flex direction="column" gap="3">
        <Heading size="4" as="h2">
          Gateways
        </Heading>

        <Table.Root size="1" variant="ghost">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Gateway</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Accepts</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell align="right">Fee</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell align="right">Success</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>State</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {gateways.map((gateway) => {
              const stats = byId.get(gateway.id);
              const tone = healthTone(stats ?? { degraded: false, thinSample: true });
              const style = HEALTH[tone];
              const Icon = style.icon;

              return (
                <Table.Row key={gateway.id} data-testid={`gateway-${gateway.id}`}>
                  <Table.RowHeaderCell>
                    <Flex direction="column">
                      <Text weight="medium">{gateway.name}</Text>
                      <Code size="1" variant="ghost" color="gray">
                        {gateway.id}
                      </Code>
                    </Flex>
                  </Table.RowHeaderCell>

                  <Table.Cell>
                    <Flex gap="1" wrap="wrap">
                      {gateway.supports.map((entry) => (
                        <Badge
                          key={`${entry.method}-${entry.currency}`}
                          variant="outline"
                          color="gray"
                          size="1"
                        >
                          {methodLabel(entry.method)} {entry.currency}
                        </Badge>
                      ))}
                    </Flex>
                  </Table.Cell>

                  <Table.Cell align="right">
                    <Text size="1" color="gray">
                      {(gateway.feeBps / 100).toFixed(2)}%
                    </Text>
                  </Table.Cell>

                  <Table.Cell align="right">
                    <Text data-testid={`gateway-rate-${gateway.id}`}>
                      {stats && stats.attempts > 0 ? formatRate(stats.successRate) : 'no traffic'}
                    </Text>
                  </Table.Cell>

                  <Table.Cell>
                    <Badge color={style.color} variant="soft" data-testid={`gateway-tone-${gateway.id}`}>
                      <Icon width={12} height={12} />
                      {style.label}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Flex>
    </Card>
  );
}
