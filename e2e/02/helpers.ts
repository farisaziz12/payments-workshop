import { expect, type APIRequestContext } from '@playwright/test';
import type { AccountView, BillingState } from '@bigpdf/lab-core/contracts';

/** Every test starts from day 0 with nothing chased. */
export async function resetClock(request: APIRequestContext): Promise<BillingState> {
  const response = await request.post('/api/clock/reset');
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as BillingState;
}

/** Move the clock forward whole days, running the billing job on the way through. */
export async function advanceDays(request: APIRequestContext, days: number): Promise<BillingState> {
  const response = await request.post('/api/clock', { data: { hours: days * 24 } });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as BillingState;
}

export async function billing(request: APIRequestContext): Promise<BillingState> {
  const response = await request.get('/api/billing');
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as BillingState;
}

export function account(state: BillingState, workspaceId: string): AccountView {
  const found = state.accounts.find((entry) => entry.invoice.workspaceId === workspaceId);
  expect(found, `no account ${workspaceId}`).toBeDefined();
  return found as AccountView;
}

/** Northstar pays by SEPA and its debit is perfectly good. The bank confirms on day 4. */
export const NORTHSTAR = 'ws_northstar';
/** Harbour pays by SEPA and its bank returns the debit on day 2. */
export const HARBOUR = 'ws_harbour';
/** Acme pays by card, and the card was declined on day 0. */
export const ACME = 'ws_acme';
