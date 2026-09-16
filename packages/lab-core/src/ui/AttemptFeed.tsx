'use client';

import { Badge, Card, Code, Flex, Heading, ScrollArea, Text } from '@radix-ui/themes';
import type { Attempt } from '../contracts/index';
import { FAILURE_LABEL, failureKind, segmentLabel } from '../contracts/index';
import { FAILURE, OUTCOME } from './theme';

/**
 * Every attempt the orchestrator made, newest first, with the reason your routing gave.
 *
 * This is the server's own account. When the dashboard surprises you, read this before
 * you change any code.
 */
export function AttemptFeed({ attempts }: { attempts: ReadonlyArray<Attempt> }) {
  return (
    <Card size="2">
      <Flex direction="column" gap="3">
        <Flex align="baseline" justify="between" gap="3">
          <Heading size="4" as="h2">
            Attempts
          </Heading>
          <Text size="1" color="gray">
            newest first
          </Text>
        </Flex>

        {attempts.length === 0 ? (
          <Text size="2" color="gray" data-testid="feed-empty">
            Nothing yet. Traffic starts as soon as the console is open.
          </Text>
        ) : (
          <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: 360 }}>
            <Flex direction="column" gap="2" pr="3">
              {attempts.map((attempt) => (
                <AttemptRow key={attempt.attemptId} attempt={attempt} />
              ))}
            </Flex>
          </ScrollArea>
        )}
      </Flex>
    </Card>
  );
}

function AttemptRow({ attempt }: { attempt: Attempt }) {
  const outcome = OUTCOME[attempt.outcome];
  const OutcomeIcon = outcome.icon;
  const failure = attempt.failureCode ? FAILURE[failureKind(attempt.failureCode)] : null;

  return (
    <Flex
      direction="column"
      gap="1"
      data-testid="attempt-row"
      data-outcome={attempt.outcome}
      data-gateway={attempt.gatewayId ?? 'none'}
      data-failure={attempt.failureCode ?? ''}
    >
      <Flex align="center" gap="2" wrap="wrap">
        <Badge color={outcome.color} variant="soft" size="1">
          <OutcomeIcon width={12} height={12} />
          {outcome.label}
        </Badge>

        <Text size="1" weight="medium">
          {segmentLabel(attempt.segment)}
        </Text>

        {attempt.gatewayId ? (
          <Code size="1" variant="soft" color="gray">
            {attempt.gatewayId}
          </Code>
        ) : null}

        {attempt.retryOf ? (
          <Badge color="amber" variant="outline" size="1">
            retry
          </Badge>
        ) : null}

        {attempt.deduplicated ? (
          <Badge color="jade" variant="outline" size="1" data-testid="attempt-deduplicated">
            same key, not charged twice
          </Badge>
        ) : null}

        {failure && attempt.failureCode ? (
          <Badge color={failure.color} variant="soft" size="1">
            {FAILURE_LABEL[attempt.failureCode]}
          </Badge>
        ) : null}
      </Flex>

      <Text size="1" color="gray">
        {attempt.reason}
      </Text>
    </Flex>
  );
}
