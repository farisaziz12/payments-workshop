/**
 * Exercise 02 contracts: invoices, the payment behind them, and dunning.
 *
 * The whole exercise is one question. An invoice is due and nothing has confirmed. How
 * long do you wait before you act, and what does the answer depend on?
 */
import type { Currency, PaymentMethod } from './common';

/**
 * What the payment behind an invoice is doing.
 *
 * `submitted` is the state that matters. A card is never submitted for long: it authorises
 * in the request. A SEPA debit sits in `submitted` for days, and looks exactly like a
 * customer who has not paid.
 */
export type InvoicePaymentState = 'submitted' | 'paid' | 'returned';

/** What the bank said when it sent a debit back. A closed set, like a real return code list. */
export type ReturnReason = 'insufficient_funds' | 'account_closed' | 'mandate_cancelled' | 'disputed';

export const RETURN_REASON_LABEL: Readonly<Record<ReturnReason, string>> = {
  insufficient_funds: 'Insufficient funds',
  account_closed: 'Account closed',
  mandate_cancelled: 'Mandate cancelled',
  disputed: 'Disputed by the payer',
};

export type Invoice = {
  invoiceId: string;
  workspaceId: string;
  workspaceName: string;
  amountMinor: number;
  currency: Currency;
  method: PaymentMethod;
  /** When the money was due. The date on the invoice. */
  dueAt: string;
  /** When the payment was actually sent to the rail. For a card, the same moment it answered. */
  submittedAt: string;
  paymentState: InvoicePaymentState;
  /** Set when the rail confirmed. */
  paidAt?: string;
  /** Set when the bank sent the debit back, which can be days after it was submitted. */
  returnedAt?: string;
  returnReason?: ReturnReason;
  /** What dunning has already done to this account. */
  stage: DunningStage;
};

/**
 * How far dunning has gone.
 *
 * `none` is quiet, `reminded` has emailed the customer, `suspended` has taken the product
 * away. Suspension is the expensive one: it is visible, it interrupts work, and undoing it
 * does not undo the email.
 */
export type DunningStage = 'none' | 'reminded' | 'suspended';

export const DUNNING_STAGE_LABEL: Readonly<Record<DunningStage, string>> = {
  none: 'Nothing sent',
  reminded: 'Reminder sent',
  suspended: 'Account suspended',
};

/**
 * The numbers the product has decided on. They are given, and they are not the exercise.
 *
 * The exercise is noticing that one of them is measured in hours and the other in business
 * days, and that which one applies is a property of the payment rail rather than of the
 * customer.
 */
export const CARD_GRACE_HOURS = 24;

/**
 * The SEPA scheme lets a bank return a direct debit for up to five business days after
 * settlement. Until that window closes, "no news" means the money is probably on its way.
 */
export const SEPA_RETURN_BUSINESS_DAYS = 5;

/** How long a reminded account has before dunning suspends it. */
export const REMINDER_TO_SUSPENSION_DAYS = 2;

/** What the attendee's `graceWindowFor` returns. A deadline, and why it is that deadline. */
export type GraceWindow = {
  /** The moment the account stops being given the benefit of the doubt. */
  deadline: string;
  /** One line, shown in the console. Say what the window is measured from and why. */
  reason: string;
};

/** What the billing run may do to an account today. */
export type DunningAction = 'wait' | 'remind' | 'suspend' | 'clear';

export type DunningDecision = {
  action: DunningAction;
  /** Shown on the account card. A customer's suspension deserves a sentence. */
  reason: string;
};

export type DunningInput = {
  invoice: Invoice;
  /** The simulated clock, as epoch milliseconds. */
  now: number;
  /** Whatever `graceWindowFor` returned for this invoice. */
  window: GraceWindow;
};

/** One account as the console shows it. */
export type AccountView = {
  invoice: Invoice;
  window: GraceWindow;
  decision: DunningDecision;
  /** True when the product is usable. Suspension is the only thing that takes it away. */
  active: boolean;
  /** Days from the due date to now, for the timeline strip. Negative before it is due. */
  daysPastDue: number;
};

export type BillingState = {
  /** Epoch milliseconds. Advanced explicitly, never from the wall clock. */
  now: string;
  /** The day number since the invoices were issued, which is how the console labels it. */
  day: number;
  accounts: ReadonlyArray<AccountView>;
  /** The scheme's return window, in business days. Real, and the reason 24 hours is wrong. */
  sepaReturnBusinessDays: number;
  cardGraceHours: number;
};

/** The day a bank return is scheduled for, if one is scheduled at all. */
export type BankReturnPlan = {
  invoiceId: string;
  onDay: number;
  reason: ReturnReason;
};
