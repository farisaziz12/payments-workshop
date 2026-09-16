'use client';

/**
 * The browser's view of the application server.
 *
 * Every call returns an `ApiResult`, so the caller has to answer one question before it
 * renders anything: did the server tell us what happened, or did we simply fail to find
 * out? Those are different, and a console that conflates them will have you routing
 * traffic away from a gateway that was never down.
 */
import type { ApiResult, DashboardState, IncidentId, TimelineEntry } from '../contracts/index';

/** How long the browser waits before giving up on a request. */
export const CLIENT_TIMEOUT_MS = 3000;

async function request<T>(path: string, init?: RequestInit, timeoutMs = CLIENT_TIMEOUT_MS): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
  } catch (error) {
    // AbortSignal.timeout rejects with a DOMException named TimeoutError.
    // A dropped connection shows up as a TypeError. Neither one is a payment failure.
    if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return { ok: false, kind: 'timeout' };
    }
    return { ok: false, kind: 'network' };
  }

  if (response.status === 404) return { ok: false, kind: 'not_found' };
  if (!response.ok) return { ok: false, kind: 'http', status: response.status };

  try {
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, kind: 'network' };
  }
}

export type LabApi = {
  getDashboard(): Promise<ApiResult<DashboardState>>;
  getTimeline(): Promise<ApiResult<{ entries: TimelineEntry[] }>>;
  setRunning(running: boolean): Promise<ApiResult<DashboardState>>;
  setIncident(incidentId: IncidentId, active: boolean): Promise<ApiResult<DashboardState>>;
  burst(count: number): Promise<ApiResult<DashboardState>>;
  reset(): Promise<ApiResult<DashboardState>>;
};

export const labApi: LabApi = {
  getDashboard: () => request<DashboardState>('/api/dashboard'),
  getTimeline: () => request<{ entries: TimelineEntry[] }>('/api/timeline'),
  setRunning: (running) =>
    request<DashboardState>('/api/simulator/running', { method: 'POST', body: JSON.stringify({ running }) }),
  setIncident: (incidentId, active) =>
    request<DashboardState>('/api/simulator/incident', {
      method: 'POST',
      body: JSON.stringify({ incidentId, active }),
    }),
  burst: (count) =>
    request<DashboardState>('/api/simulator/burst', { method: 'POST', body: JSON.stringify({ count }) }),
  reset: () => request<DashboardState>('/api/simulator/reset', { method: 'POST' }),
};
