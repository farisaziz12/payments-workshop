'use client';

import { Badge, Card, Code, Flex, Heading, ScrollArea, Text } from '@radix-ui/themes';
import type { TimelineEntry } from '../contracts/index';
import { useTimeline } from './hooks';
import { ACTOR, OUTCOME } from './theme';

function clockTime(at: string): string {
  return new Date(at).toLocaleTimeString([], { hour12: false });
}

function Row({ entry }: { entry: TimelineEntry }) {
  const actor = ACTOR[entry.actor];
  const ActorIcon = actor.icon;
  const outcome = entry.outcome ? OUTCOME[entry.outcome] : null;
  const OutcomeIcon = outcome?.icon;

  return (
    <Flex gap="3" align="start" py="2" data-outcome={entry.outcome ?? ''}>
      <Code size="1" variant="ghost" color="gray">
        {clockTime(entry.at)}
      </Code>

      <Badge color={actor.color} variant="soft" size="1">
        <ActorIcon width={11} height={11} />
        {entry.actor}
      </Badge>

      <Text size="1" style={{ flex: 1, minWidth: 0 }}>
        {entry.message}
      </Text>

      {outcome && OutcomeIcon ? (
        <Badge color={outcome.color} variant="soft" size="1">
          <OutcomeIcon width={11} height={11} />
          {outcome.label}
        </Badge>
      ) : null}
    </Flex>
  );
}

/**
 * The event timeline.
 *
 * It polls the server itself, independently of anything the exercise files do, so it
 * keeps telling the truth even when the checkout screen has the wrong idea. That gap
 * between the two panels is where the lesson lives.
 */
export function Timeline() {
  const entries = useTimeline();

  return (
    <Card size="3" data-testid="timeline">
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Heading size="4" as="h2">
            Event timeline
          </Heading>
          <Text size="2" color="gray">
            What the application server actually did, newest first. Read this when the screen and the server disagree.
          </Text>
        </Flex>

        {entries.length === 0 ? (
          <Text size="2" color="gray">
            Nothing yet. Pick a scenario and pay.
          </Text>
        ) : (
          <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: 420 }}>
            <Flex direction="column" pr="3">
              {entries.map((entry) => (
                <Row key={entry.id} entry={entry} />
              ))}
            </Flex>
          </ScrollArea>
        )}
      </Flex>
    </Card>
  );
}
