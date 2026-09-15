import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const WORKSPACE_ID = 'ws_northstar';

export type ScenarioId =
  | 'instant-success'
  | 'instant-decline'
  | 'delayed-success'
  | 'delayed-failure'
  | 'client-timeout-success'
  | 'duplicate-event'
  | 'out-of-order-event';

/** Every test starts from an empty server. */
export async function resetLab(request: APIRequestContext): Promise<void> {
  const response = await request.post('/api/simulator/reset');
  expect(response.ok()).toBeTruthy();
}

export async function chooseScenario(request: APIRequestContext, scenarioId: ScenarioId): Promise<void> {
  const response = await request.post('/api/simulator/scenario', { data: { scenarioId } });
  expect(response.ok()).toBeTruthy();
}

const METHOD_LABEL: Record<'card' | 'bank_debit', string> = {
  card: 'Card',
  bank_debit: 'Bank debit',
};

export async function payWith(page: Page, method: 'card' | 'bank_debit'): Promise<void> {
  // The method picker is a radio group, so drive it the way a keyboard user would.
  await page.getByRole('radio', { name: METHOD_LABEL[method], exact: false }).first().click();
  await page.getByTestId('pay').click();
}

/** Stop waiting for the provider's scheduled events and deliver them now. */
export async function deliverScheduledEvents(page: Page): Promise<void> {
  await page.getByTestId('deliver-now').click();
}

export async function timelineText(page: Page): Promise<string> {
  return (await page.getByTestId('timeline').innerText()).toLowerCase();
}
