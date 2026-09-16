/**
 * Health, sliced the way failures actually arrive.
 *
 * This is the part of exercise 01 that is already written for you. It is worth reading
 * anyway, because the thresholds are a judgement call and you are about to route real
 * money on the answer.
 */
import type { Attempt, HealthSnapshot, Segment, SegmentHealth, GatewayHealth, GatewayId } from '../contracts/index';
import { FAILURE_KIND, segmentKey } from '../contracts/index';
import { GATEWAYS } from './gateways';
import { getStore } from './store';
import { SEGMENTS } from './traffic';

/** How far back health looks. Long enough to be stable, short enough to notice an outage. */
export const HEALTH_WINDOW_MS = 20_000;

/** Below this many attempts, a bad rate is noise. Two failures out of three is not an outage. */
export const MIN_GATEWAY_SAMPLE = 8;
export const MIN_SEGMENT_SAMPLE = 12;

export const GATEWAY_DEGRADED_BELOW = 0.6;
export const SEGMENT_DEGRADED_BELOW = 0.7;

function rate(successes: number, attempts: number): number {
  return attempts === 0 ? 1 : successes / attempts;
}

function tallyGateway(attempts: ReadonlyArray<Attempt>, gatewayId: GatewayId): GatewayHealth {
  const mine = attempts.filter((attempt) => attempt.gatewayId === gatewayId);
  const successes = mine.filter((attempt) => attempt.outcome === 'succeeded').length;
  const technicalFailures = mine.filter(
    (attempt) => attempt.failureCode && FAILURE_KIND[attempt.failureCode] === 'technical',
  ).length;
  const successRate = rate(successes, mine.length);
  const thinSample = mine.length < MIN_GATEWAY_SAMPLE;
  return {
    gatewayId,
    attempts: mine.length,
    successes,
    technicalFailures,
    successRate,
    degraded: !thinSample && successRate < GATEWAY_DEGRADED_BELOW,
    thinSample,
  };
}

function tallySegment(attempts: ReadonlyArray<Attempt>, segment: Segment): SegmentHealth {
  const key = segmentKey(segment);
  const mine = attempts.filter((attempt) => segmentKey(attempt.segment) === key);
  const successes = mine.filter((attempt) => attempt.outcome === 'succeeded').length;
  const successRate = rate(successes, mine.length);
  const thinSample = mine.length < MIN_SEGMENT_SAMPLE;
  return {
    segment,
    key,
    attempts: mine.length,
    successes,
    successRate,
    degraded: !thinSample && successRate < SEGMENT_DEGRADED_BELOW,
    thinSample,
    gateways: GATEWAYS.map((gateway) => tallyGateway(mine, gateway.id)).filter(
      (health) => health.attempts > 0,
    ),
  };
}

/** Pure. Give it attempts and a clock, get the same snapshot every time. */
export function summariseHealth(
  attempts: ReadonlyArray<Attempt>,
  now: number,
  windowMs: number = HEALTH_WINDOW_MS,
): HealthSnapshot {
  const since = now - windowMs;
  const windowed = attempts.filter((attempt) => Date.parse(attempt.at) >= since);
  const successes = windowed.filter((attempt) => attempt.outcome === 'succeeded').length;

  return {
    at: new Date(now).toISOString(),
    windowSeconds: Math.round(windowMs / 1000),
    overallSuccessRate: rate(successes, windowed.length),
    attempts: windowed.length,
    successes,
    segments: SEGMENTS.map((segment) => tallySegment(windowed, segment)),
    gateways: GATEWAYS.map((gateway) => tallyGateway(windowed, gateway.id)),
  };
}

export function currentHealth(now: number = Date.now()): HealthSnapshot {
  return summariseHealth(getStore().attempts, now);
}

/** The slice handed to the routing decision: this segment, and nothing else. */
export function healthForSegment(segment: Segment, now: number = Date.now()): SegmentHealth | null {
  const key = segmentKey(segment);
  const found = currentHealth(now).segments.find((entry) => entry.key === key);
  if (!found || found.attempts === 0) return null;
  return found;
}
