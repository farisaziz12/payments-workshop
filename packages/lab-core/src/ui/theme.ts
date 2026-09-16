'use client';

/**
 * The design system, in one file.
 *
 * The lab uses Radix Themes as its component library. That choice buys accessibility,
 * a real 12-step colour scale, dark mode and a consistent radius and spacing scale
 * without anyone hand-writing CSS. Attendees never touch any of it: the exercise files
 * return plain values, and the components in this folder decide how those values look.
 *
 * Three locks, set here and nowhere else:
 *
 *   ONE accent      jade, used for primary actions and links only.
 *   ONE grey        slate, cool, matched to the accent.
 *   ONE radius      medium, applied to every surface by the Theme.
 *
 * Status colour is separate from the accent on purpose. It is data, not decoration, so
 * it never appears on a button, and every status carries an icon and a word as well as
 * a colour. Colour alone is not an accessible signal, and a room of thirty engineers
 * reliably contains someone who cannot see the difference between your red and your green.
 */
import {
  CheckCircledIcon,
  CrossCircledIcon,
  DashboardIcon,
  ExclamationTriangleIcon,
  LapTimerIcon,
  LightningBoltIcon,
  MinusCircledIcon,
  MixerHorizontalIcon,
  QuestionMarkCircledIcon,
  StackIcon,
} from '@radix-ui/react-icons';
import type { ComponentType } from 'react';
import type { AttemptOutcome, FailureKind, TimelineActor } from '../contracts/index';

/** Passed to a single `<Theme>` at the root of each app. Sections never override it. */
export const THEME = {
  appearance: 'inherit',
  accentColor: 'jade',
  grayColor: 'slate',
  radius: 'medium',
  scaling: '100%',
  panelBackground: 'solid',
} as const;

export type StatusColor = 'gray' | 'amber' | 'jade' | 'red' | 'violet' | 'blue';

type Icon = ComponentType<{ width?: number; height?: number }>;

export type StatusStyle = { color: StatusColor; icon: Icon; label: string };

/** How a segment or a gateway is doing. Three states, because "no data yet" is not "fine". */
export type HealthTone = 'healthy' | 'degraded' | 'thin';

export const HEALTH: Record<HealthTone, StatusStyle> = {
  healthy: { color: 'jade', icon: CheckCircledIcon, label: 'Healthy' },
  degraded: { color: 'red', icon: ExclamationTriangleIcon, label: 'Degraded' },
  thin: { color: 'gray', icon: QuestionMarkCircledIcon, label: 'Too few attempts' },
};

export function healthTone(input: { degraded: boolean; thinSample: boolean }): HealthTone {
  if (input.thinSample) return 'thin';
  return input.degraded ? 'degraded' : 'healthy';
}

/** What happened to one attempt. */
export const OUTCOME: Record<AttemptOutcome, StatusStyle> = {
  succeeded: { color: 'jade', icon: CheckCircledIcon, label: 'Captured' },
  failed: { color: 'red', icon: CrossCircledIcon, label: 'Failed' },
  no_route: { color: 'gray', icon: MinusCircledIcon, label: 'Not routed' },
};

/**
 * What kind of failure it was, which is the only thing that decides whether a retry is
 * allowed. The colours say it out loud: a hard decline is red and final, a technical
 * failure is amber and worth another gateway, a config error is violet and is your bug.
 */
export const FAILURE: Record<FailureKind, StatusStyle> = {
  hard: { color: 'red', icon: CrossCircledIcon, label: 'Hard decline' },
  technical: { color: 'amber', icon: LapTimerIcon, label: 'Technical' },
  config: { color: 'violet', icon: ExclamationTriangleIcon, label: 'Misrouted' },
};

/** Who wrote the log line. */
export const ACTOR: Record<TimelineActor, { color: StatusColor; icon: Icon }> = {
  orchestrator: { color: 'blue', icon: DashboardIcon },
  gateway: { color: 'violet', icon: StackIcon },
  chaos: { color: 'amber', icon: LightningBoltIcon },
  billing: { color: 'gray', icon: MixerHorizontalIcon },
};

export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
