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
 * a colour. Colour alone is not an accessible signal.
 */
import {
  CheckCircledIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  CrossCircledIcon,
  GearIcon,
  InfoCircledIcon,
  MixerHorizontalIcon,
  PaperPlaneIcon,
  PersonIcon,
  QuestionMarkCircledIcon,
} from '@radix-ui/react-icons';
import type { ComponentType } from 'react';
import type { CustomerViewTone, EventOutcome, TimelineActor } from '../contracts/index';

/** Passed to a single `<Theme>` at the root of each app. Sections never override it. */
export const THEME = {
  appearance: 'inherit',
  accentColor: 'jade',
  grayColor: 'slate',
  radius: 'medium',
  scaling: '100%',
  panelBackground: 'solid',
} as const;

type RadixColor = 'gray' | 'amber' | 'jade' | 'red' | 'violet';

/** What each payment outcome looks like. Colour, icon and label always travel together. */
export const STATUS: Record<CustomerViewTone, { color: RadixColor; icon: ComponentType<{ width?: number; height?: number }>; label: string }> = {
  idle: { color: 'gray', icon: InfoCircledIcon, label: 'Not started' },
  pending: { color: 'amber', icon: ClockIcon, label: 'Confirming' },
  success: { color: 'jade', icon: CheckCircledIcon, label: 'Paid' },
  failure: { color: 'red', icon: CrossCircledIcon, label: 'Failed' },
  unknown: { color: 'violet', icon: QuestionMarkCircledIcon, label: 'Unconfirmed' },
};

/** Who did the thing, in the event timeline. */
export const ACTOR: Record<TimelineActor, { color: 'gray' | 'jade' | 'violet' | 'blue'; icon: ComponentType<{ width?: number; height?: number }> }> = {
  customer: { color: 'jade', icon: PersonIcon },
  app: { color: 'blue', icon: GearIcon },
  provider: { color: 'violet', icon: PaperPlaneIcon },
  simulator: { color: 'gray', icon: MixerHorizontalIcon },
};

/** What the application server decided to do with an event. */
export const OUTCOME: Record<EventOutcome, { color: 'jade' | 'amber' | 'red'; icon: ComponentType<{ width?: number; height?: number }>; label: string }> = {
  applied: { color: 'jade', icon: CheckIcon, label: 'applied' },
  ignored_duplicate: { color: 'amber', icon: CopyIcon, label: 'duplicate' },
  ignored_stale: { color: 'amber', icon: ClockIcon, label: 'stale' },
  rejected_unknown_payment: { color: 'red', icon: CrossCircledIcon, label: 'rejected' },
  rejected_unknown_type: { color: 'red', icon: CrossCircledIcon, label: 'rejected' },
};
