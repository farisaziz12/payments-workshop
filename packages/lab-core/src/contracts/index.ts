/**
 * Bigpdf payments lab: shared contracts.
 *
 * Everything the browser and the server agree on. Safe to import from either side.
 * Exercise 01's shapes live in `gameday.ts`, exercise 02's in `billing.ts`, and the
 * shapes both share in `common.ts`.
 *
 * `docs/payment-contracts.md` explains the reasoning. These files are the source of truth.
 */

export * from './common';
export * from './gameday';
export * from './billing';

/**
 * What a browser call to the application server returns.
 *
 * `ok: false` means the browser did not get an answer out of the application server. It
 * never means the thing failed. Something that failed comes back as a perfectly good
 * HTTP 200 saying so.
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: 'timeout' }
  | { ok: false; kind: 'network' }
  | { ok: false; kind: 'http'; status: number }
  | { ok: false; kind: 'not_found' };

export type TimelineActor = 'orchestrator' | 'gateway' | 'chaos' | 'billing' | 'bank';

export type TimelineEntry = {
  id: string;
  at: string;
  actor: TimelineActor;
  message: string;
};
