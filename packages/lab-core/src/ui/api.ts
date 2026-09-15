'use client';

/**
 * The browser's view of the application server.
 *
 * Every call returns an `ApiResult`, which forces the caller to answer one question
 * before rendering anything: did the server tell us what happened, or did we simply
 * fail to find out? Those are different, and conflating them is the bug this lab is about.
 *
 * Note that a declined payment arrives here as `{ ok: true, data: { status: 'failed' } }`.
 * It is a successful request carrying bad news.
 */
import type {
  ApiResult,
  Entitlement,
  PaymentMethod,
  PurchaseView,
  ScenarioId,
  SimulatorState,
  TimelineEntry,
} from '../contracts/index';

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
  checkout(input: { purchaseId: string; workspaceId: string; method: PaymentMethod }): Promise<ApiResult<PurchaseView>>;
  getPurchase(purchaseId: string): Promise<ApiResult<PurchaseView>>;
  getEntitlement(workspaceId: string): Promise<ApiResult<Entitlement>>;
  getTimeline(): Promise<ApiResult<{ entries: TimelineEntry[] }>>;
  getSimulator(): Promise<ApiResult<SimulatorState>>;
  setScenario(scenarioId: ScenarioId): Promise<ApiResult<SimulatorState>>;
  deliverNow(): Promise<ApiResult<{ delivered: number }>>;
  reset(): Promise<ApiResult<{ ok: boolean }>>;
};

export const labApi: LabApi = {
  checkout: (input) =>
    request<PurchaseView>('/api/checkout', { method: 'POST', body: JSON.stringify(input) }),
  getPurchase: (purchaseId) => request<PurchaseView>(`/api/purchases/${encodeURIComponent(purchaseId)}`),
  getEntitlement: (workspaceId) => request<Entitlement>(`/api/entitlements/${encodeURIComponent(workspaceId)}`),
  getTimeline: () => request<{ entries: TimelineEntry[] }>('/api/timeline'),
  getSimulator: () => request<SimulatorState>('/api/simulator'),
  setScenario: (scenarioId) =>
    request<SimulatorState>('/api/simulator/scenario', { method: 'POST', body: JSON.stringify({ scenarioId }) }),
  deliverNow: () => request<{ delivered: number }>('/api/simulator/deliver-now', { method: 'POST' }),
  reset: () => request<{ ok: boolean }>('/api/simulator/reset', { method: 'POST' }),
};

/** Where the browser keeps the purchase id so a reload can find the purchase again. */
export const PURCHASE_STORAGE_KEY = 'stacknotes.purchaseId';

/** A readable, unique-enough id. The server never trusts it for anything but lookup. */
export function mintPurchaseId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `pur_${Date.now().toString(36)}${random}`;
}
