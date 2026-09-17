/**
 * The faults the chaos panel can switch on.
 *
 * Each one is a gateway failing a single segment. That is the shape real degradation
 * takes, and it is why a dashboard that only shows one number tells you nothing.
 */
import type { FailureCode, GatewayId, IncidentId, IncidentSummary, Segment } from '../contracts/index';
import { segmentKey } from '../contracts/index';
import { getStore } from './store';

type IncidentDefinition = {
  id: IncidentId;
  name: string;
  gatewayId: GatewayId;
  segmentKey: string;
  failureCode: FailureCode;
  failureRate: number;
  description: string;
  teaches: string;
};

export const INCIDENTS: ReadonlyArray<IncidentDefinition> = [
  {
    id: 'card-de-atlas-unavailable',
    name: 'Atlas is down for German cards',
    gatewayId: 'atlas',
    segmentKey: 'card:DE:EUR',
    failureCode: 'gateway_unavailable',
    failureRate: 0.8,
    description:
      'Four in five German card attempts on Atlas come back "gateway unavailable", and nothing is captured. Every other segment on Atlas is fine, so the headline moves far less than the German card tile does.',
    teaches: 'Slice by segment and gateway, then move only the traffic that is actually hurting.',
  },
  {
    id: 'sepa-de-borealis-outage',
    name: 'Borealis drops German SEPA debits',
    gatewayId: 'borealis',
    segmentKey: 'sepa_debit:DE:EUR',
    failureCode: 'gateway_unavailable',
    failureRate: 0.9,
    description:
      'Borealis stops accepting German SEPA debits. It is the only gateway that takes SEPA at all, so there is nowhere to fail over to.',
    teaches: 'Failover is not always available. Refusing to route is a real answer.',
  },
  {
    id: 'cirrus-rate-limit',
    name: 'Cirrus rate limits everything',
    gatewayId: 'cirrus',
    segmentKey: '*',
    failureCode: 'rate_limited',
    failureRate: 0.65,
    description:
      'Cirrus starts rate limiting. Harmless until you have sent it traffic it was never meant to carry.',
    teaches: 'The gateway you failed over to has its own limits. Check before you lean on it.',
  },
];

export function incidentSummaries(): ReadonlyArray<IncidentSummary> {
  const active = getStore().activeIncidents;
  return INCIDENTS.map((incident) => ({ ...incident, active: active.has(incident.id) }));
}

export function isIncidentId(value: unknown): value is IncidentId {
  return INCIDENTS.some((incident) => incident.id === value);
}

/** The fault currently hitting this gateway for this segment, if any. */
export function activeIncidentFor(gatewayId: GatewayId, segment: Segment): IncidentDefinition | null {
  const active = getStore().activeIncidents;
  const key = segmentKey(segment);
  return (
    INCIDENTS.find(
      (incident) =>
        active.has(incident.id) &&
        incident.gatewayId === gatewayId &&
        (incident.segmentKey === '*' || incident.segmentKey === key),
    ) ?? null
  );
}
