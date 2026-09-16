import { expect, type APIRequestContext } from '@playwright/test';
import type { DashboardState, IncidentId, Segment, SegmentHealth } from '@bigpdf/lab-core/contracts';

/** Every test starts from an empty server with no faults switched on. */
export async function resetLab(request: APIRequestContext): Promise<DashboardState> {
  const response = await request.post('/api/simulator/reset');
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as DashboardState;
}

export async function setIncident(
  request: APIRequestContext,
  incidentId: IncidentId,
  active: boolean,
): Promise<DashboardState> {
  const response = await request.post('/api/simulator/incident', { data: { incidentId, active } });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as DashboardState;
}

/**
 * Run a fixed number of charges through the orchestrator and return the state after.
 *
 * Bursts rather than wall-clock waits: the assertions are then about what the routing did,
 * not about how fast the machine running them happens to be.
 */
export async function sendTraffic(request: APIRequestContext, count: number): Promise<DashboardState> {
  const response = await request.post('/api/simulator/burst', { data: { count } });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as DashboardState;
}

export async function dashboard(request: APIRequestContext): Promise<DashboardState> {
  const response = await request.get('/api/dashboard');
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as DashboardState;
}

export const CARD_DE: Segment = { method: 'card', country: 'DE', currency: 'EUR' };
export const CARD_GB: Segment = { method: 'card', country: 'GB', currency: 'GBP' };
export const SEPA_DE: Segment = { method: 'sepa_debit', country: 'DE', currency: 'EUR' };

export function segmentOf(state: DashboardState, segment: Segment): SegmentHealth {
  const key = `${segment.method}:${segment.country}:${segment.currency}`;
  const found = state.health.segments.find((entry) => entry.key === key);
  expect(found, `no health for ${key}`).toBeDefined();
  return found as SegmentHealth;
}

/** How many attempts in the window landed on a given gateway, for one segment. */
export function attemptsOn(state: DashboardState, segment: Segment, gatewayId: string): number {
  return segmentOf(state, segment).gateways.find((entry) => entry.gatewayId === gatewayId)?.attempts ?? 0;
}
