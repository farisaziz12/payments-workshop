import { expect, test } from '@playwright/test';
import { ACME, HARBOUR, NORTHSTAR, account, advanceDays, resetClock } from './helpers';

/**
 * The bug this exercise exists for, driven through the API.
 *
 * Northstar's money is in transit for four days. Everything here is about what billing
 * does during those four days, and what it does on the fifth.
 */
test.describe('a SEPA debit in flight', () => {
  test.beforeEach(async ({ request }) => {
    await resetClock(request);
  });

  test('is not chased on day 2, while the bank still has it', async ({ request }) => {
    const state = await advanceDays(request, 2);
    const northstar = account(state, NORTHSTAR);

    expect(northstar.invoice.paymentState).toBe('submitted');
    expect(northstar.active).toBe(true);
    expect(northstar.invoice.stage).toBe('none');
  });

  test('is never suspended, because the bank confirms before the window closes', async ({ request }) => {
    // Walk the clock a day at a time, the way the console does. A suspension on any of
    // these days is a customer locked out of a product they paid for.
    for (let day = 1; day <= 8; day += 1) {
      const state = await advanceDays(request, 1);
      expect(account(state, NORTHSTAR).active, `suspended on day ${day}`).toBe(true);
    }

    const final = account(await advanceDays(request, 1), NORTHSTAR);
    expect(final.invoice.paymentState).toBe('paid');
    expect(final.invoice.stage).toBe('none');
  });

  test('gets a longer window than the card account', async ({ request }) => {
    const state = await advanceDays(request, 1);
    const sepa = Date.parse(account(state, NORTHSTAR).window.deadline);
    const card = Date.parse(account(state, ACME).window.deadline);
    expect(sepa).toBeGreaterThan(card);
  });
});

test.describe('a payment the rail has already decided', () => {
  test.beforeEach(async ({ request }) => {
    await resetClock(request);
  });

  test('chases the card account whose card was declined', async ({ request }) => {
    const state = await advanceDays(request, 2);
    const acme = account(state, ACME);
    expect(acme.invoice.stage).not.toBe('none');
  });

  test('acts on the returned debit the day the bank returns it, not a week later', async ({ request }) => {
    await advanceDays(request, 2);
    const state = await advanceDays(request, 1);
    const harbour = account(state, HARBOUR);

    expect(harbour.invoice.paymentState).toBe('returned');
    expect(harbour.invoice.stage).not.toBe('none');
  });

  test('suspends the returned debit eventually, but only after a reminder', async ({ request }) => {
    let remindedFirst = false;
    for (let day = 1; day <= 8; day += 1) {
      const state = await advanceDays(request, 1);
      const harbour = account(state, HARBOUR);
      if (harbour.invoice.stage === 'reminded') remindedFirst = true;
      if (harbour.invoice.stage === 'suspended') break;
    }

    expect(remindedFirst, 'suspended without ever sending a reminder').toBe(true);
  });
});
