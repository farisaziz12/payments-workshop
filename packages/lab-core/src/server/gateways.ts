/**
 * The three gateways, and the simulator that answers for them.
 *
 * None of this models a real provider. What it does model honestly is the part that
 * matters for routing: gateways do not all accept the same things, they do not all
 * authorise at the same rate, and they do not all cost the same.
 *
 * One rule holds everywhere in here. A gateway either captures and says so, or it
 * captures nothing and says so. There is no third answer, so every failure in this lab
 * is a failure you can act on.
 */
import type { FailureCode, Gateway, GatewayId, Segment } from '../contracts/index';
import { feeFor, supportsSegment } from '../contracts/index';
import { activeIncidentFor } from './incidents';
import { getStore, random } from './store';

/**
 * Read this table before you write any routing. Two of the three columns are the exercise:
 * borealis has no GBP at all, and it is the only home SEPA has.
 */
export const GATEWAYS: ReadonlyArray<Gateway> = [
  {
    id: 'atlas',
    name: 'Atlas',
    supports: [
      { method: 'card', currency: 'EUR' },
      { method: 'card', currency: 'GBP' },
    ],
    priority: 1,
    feeBps: 145,
    baselineAuthRate: 0.94,
  },
  {
    id: 'borealis',
    name: 'Borealis',
    supports: [
      { method: 'card', currency: 'EUR' },
      { method: 'sepa_debit', currency: 'EUR' },
    ],
    priority: 2,
    feeBps: 120,
    baselineAuthRate: 0.92,
  },
  {
    id: 'cirrus',
    name: 'Cirrus',
    supports: [
      { method: 'card', currency: 'EUR' },
      { method: 'card', currency: 'GBP' },
    ],
    priority: 3,
    feeBps: 210,
    baselineAuthRate: 0.88,
  },
];

export function gatewayById(id: GatewayId): Gateway | null {
  return GATEWAYS.find((gateway) => gateway.id === id) ?? null;
}

/** The hard declines a healthy gateway still produces. Real traffic is never 100%. */
const HARD_CODES: Readonly<Record<'card' | 'sepa_debit', ReadonlyArray<FailureCode>>> = {
  card: ['issuer_declined', 'issuer_declined', 'insufficient_funds', 'expired_card'],
  sepa_debit: ['invalid_account', 'insufficient_funds'],
};

export type GatewayResponse = {
  outcome: 'succeeded' | 'failed';
  failureCode?: FailureCode;
  feeMinor: number;
  /** The gateway recognised the idempotency key and returned the original capture. */
  deduplicated: boolean;
};

/**
 * Send one attempt to one gateway.
 *
 * Two things this always does, and both of them are what make a retry decision possible.
 * A failure never captures: whatever comes back with `outcome: 'failed'` left the money
 * exactly where it was. And an idempotency key is only ever spent once: send the same key
 * twice and the second call returns the first result rather than taking the money again.
 */
export function sendToGateway(input: {
  gatewayId: GatewayId;
  segment: Segment;
  chargeId: string;
  idempotencyKey: string;
  amountMinor: number;
}): GatewayResponse {
  const gateway = gatewayById(input.gatewayId);
  if (!gateway || !supportsSegment(gateway, input.segment)) {
    getStore().ledger.misrouted += 1;
    return { outcome: 'failed', failureCode: 'unsupported_method', feeMinor: 0, deduplicated: false };
  }

  const store = getStore();
  const existing = store.captures.get(input.idempotencyKey);
  if (existing) {
    return {
      outcome: 'succeeded',
      feeMinor: 0,
      deduplicated: true,
    };
  }

  const incident = activeIncidentFor(gateway.id, input.segment);
  if (incident && random() < incident.failureRate) {
    // The gateway turned the request away. Nothing was captured and nothing was collected,
    // which is exactly why this failure is safe to send somewhere else.
    return { outcome: 'failed', failureCode: incident.failureCode, feeMinor: 0, deduplicated: false };
  }

  if (random() < gateway.baselineAuthRate) {
    capture(input.idempotencyKey, input.chargeId, gateway.id);
    const feeMinor = feeFor(input.amountMinor, gateway.feeBps);
    store.ledger.captured += 1;
    store.ledger.capturedMinor += input.amountMinor;
    store.ledger.feesMinor += feeMinor;
    return { outcome: 'succeeded', feeMinor, deduplicated: false };
  }

  const codes = HARD_CODES[input.segment.method];
  const code = codes[Math.floor(random() * codes.length)] ?? 'issuer_declined';
  return { outcome: 'failed', failureCode: code, feeMinor: 0, deduplicated: false };
}

/** Record a capture against the key that paid for it. That key is now spent. */
function capture(idempotencyKey: string, chargeId: string, gatewayId: GatewayId): void {
  const store = getStore();
  store.captures.set(idempotencyKey, { idempotencyKey, chargeId, gatewayId });
}
