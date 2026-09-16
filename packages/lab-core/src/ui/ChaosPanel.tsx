'use client';

import { Badge, Button, Card, Flex, Heading, Separator, Switch, Text } from '@radix-ui/themes';
import type { DashboardControls } from './hooks';
import type { OrchestratorState } from '../contracts/index';

/**
 * The chaos panel. Everything here is a fault someone chooses to inject, which is what a
 * game day is: a failure you scheduled, so you find out what your system does before a
 * Tuesday afternoon finds out for you.
 */
export function ChaosPanel({
  orchestrator,
  controls,
}: {
  orchestrator: OrchestratorState;
  controls: DashboardControls;
}) {
  return (
    <Card size="2">
      <Flex direction="column" gap="4">
        <Flex align="center" justify="between" gap="3">
          <Heading size="4" as="h2">
            Chaos panel
          </Heading>
          <Badge color={orchestrator.running ? 'jade' : 'gray'} variant="soft" data-testid="traffic-state">
            {orchestrator.running ? `${orchestrator.attemptsPerSecond}/s` : 'paused'}
          </Badge>
        </Flex>

        <Flex direction="column" gap="3">
          {orchestrator.incidents.map((incident) => (
            <Flex key={incident.id} direction="column" gap="1">
              <Flex align="center" justify="between" gap="3">
                <Text as="label" size="2" weight="medium" htmlFor={`incident-${incident.id}`}>
                  {incident.name}
                </Text>
                <Switch
                  id={`incident-${incident.id}`}
                  checked={incident.active}
                  onCheckedChange={(next) => void controls.setIncident(incident.id, next)}
                  data-testid={`incident-${incident.id}`}
                />
              </Flex>
              <Text size="1" color="gray">
                {incident.description}
              </Text>
            </Flex>
          ))}
        </Flex>

        <Separator size="4" />

        <Flex gap="2" wrap="wrap">
          <Button
            variant="soft"
            color="gray"
            onClick={() => void controls.setRunning(!orchestrator.running)}
            data-testid="toggle-traffic"
          >
            {orchestrator.running ? 'Pause traffic' : 'Resume traffic'}
          </Button>
          <Button variant="soft" color="gray" onClick={() => void controls.burst(60)} data-testid="burst">
            Send 60 now
          </Button>
          <Button variant="soft" color="gray" onClick={() => void controls.reset()} data-testid="reset">
            Reset
          </Button>
        </Flex>

        <Text size="1" color="gray">
          Traffic is seeded, so the same run replays after a reset. Nothing here rolls an
          unseeded die.
        </Text>
      </Flex>
    </Card>
  );
}
