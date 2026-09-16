/** Shapes both exercises share. Safe on the client and on the server. */

export type Currency = 'EUR' | 'GBP';

/**
 * The methods Bigpdf accepts, and the reason there are two exercises.
 *
 * A card authorises in the request. A SEPA direct debit is submitted, and the bank can
 * come back days later to say it was never paid. Every timing decision downstream, from
 * routing to dunning, follows from that difference.
 */
export type PaymentMethod = 'card' | 'sepa_debit';

export type Country = 'DE' | 'FR' | 'GB';

export function methodLabel(method: PaymentMethod): string {
  return method === 'card' ? 'Card' : 'SEPA debit';
}

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
