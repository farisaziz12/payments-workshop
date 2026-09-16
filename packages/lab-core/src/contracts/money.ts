/** Money, and the one plan Bigpdf sells. Shared by both exercises. */

export type Currency = 'EUR' | 'GBP';

export const PLAN = {
  planId: 'team-monthly',
  name: 'Bigpdf Team',
  amountMinor: 2000,
  currency: 'EUR',
  interval: 'month',
  unit: 'workspace',
  taxNote: 'before applicable tax',
} as const;

const SYMBOL: Readonly<Record<Currency, string>> = { EUR: '€', GBP: '£' };

export function formatMoney(amountMinor: number, currency: Currency): string {
  return `${SYMBOL[currency]}${(amountMinor / 100).toFixed(2)}`;
}

/** Basis points of an amount, rounded to the nearest minor unit. */
export function feeFor(amountMinor: number, feeBps: number): number {
  return Math.round((amountMinor * feeBps) / 10_000);
}
