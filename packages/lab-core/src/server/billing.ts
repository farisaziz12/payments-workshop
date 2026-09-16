/**
 * Exercise 02's server: three accounts, a simulated clock, and a bank that answers late.
 *
 * Day 0 is Monday 2 March 2026, and it is a Monday on purpose. Five business days from a
 * Monday is the following Monday, and a policy that counts calendar days lands on the
 * Saturday, when no bank is going to confirm anything.
 *
 * State lives on `globalThis` for the same reason as exercise 01: it has to survive a hot
 * reload while somebody edits the lab files.
 */
import type {
  AccountView,
  BillingState,
  DunningDecision,
  DunningInput,
  GraceWindow,
  Invoice,
  ReturnReason,
  TimelineEntry,
} from '../contracts/index';
import { CARD_GRACE_HOURS, PLAN, SEPA_RETURN_BUSINESS_DAYS } from '../contracts/index';

/** Monday. Everything in this exercise is measured from here. */
export const DAY_ZERO = Date.parse('2026-03-02T09:00:00.000Z');

export const DAY_MS = 24 * 60 * 60 * 1000;

type ScheduledBankEvent = {
  invoiceId: string;
  /** Days after day zero, in calendar days, because that is how a bank's clock runs. */
  onDay: number;
  outcome: 'paid' | 'returned';
  reason?: ReturnReason;
};

/**
 * What the banks are going to do, decided before anyone starts.
 *
 * Nothing here is random. The same three accounts behave the same way for everyone, so a
 * suspension an attendee sees is a suspension you can reproduce.
 */
const BANK_SCHEDULE: ReadonlyArray<ScheduledBankEvent> = [
  // Northstar's debit is perfectly good. The bank confirms on the Friday.
  { invoiceId: 'inv_northstar', onDay: 4, outcome: 'paid' },
  // Harbour's is not. The bank sends it back on the Wednesday, and that is a real answer.
  { invoiceId: 'inv_harbour', onDay: 2, outcome: 'returned', reason: 'insufficient_funds' },
];

function seedInvoices(): Invoice[] {
  const dueAt = new Date(DAY_ZERO).toISOString();
  return [
    {
      invoiceId: 'inv_acme',
      workspaceId: 'ws_acme',
      workspaceName: 'Acme',
      amountMinor: PLAN.amountMinor,
      currency: PLAN.currency,
      method: 'card',
      dueAt,
      submittedAt: dueAt,
      // The card answered in the request, the way cards do, and the answer was no.
      paymentState: 'returned',
      returnedAt: dueAt,
      returnReason: 'insufficient_funds',
      stage: 'none',
    },
    {
      invoiceId: 'inv_northstar',
      workspaceId: 'ws_northstar',
      workspaceName: 'Northstar',
      amountMinor: PLAN.amountMinor,
      currency: PLAN.currency,
      method: 'sepa_debit',
      dueAt,
      submittedAt: dueAt,
      paymentState: 'submitted',
      stage: 'none',
    },
    {
      invoiceId: 'inv_harbour',
      workspaceId: 'ws_harbour',
      workspaceName: 'Harbour',
      amountMinor: PLAN.amountMinor,
      currency: PLAN.currency,
      method: 'sepa_debit',
      dueAt,
      submittedAt: dueAt,
      paymentState: 'submitted',
      stage: 'none',
    },
  ];
}

export type BillingLabState = {
  now: number;
  invoices: Map<string, Invoice>;
  /** Bank events already applied, so advancing the clock twice does not apply them twice. */
  appliedBankEvents: Set<string>;
  timeline: TimelineEntry[];
  counters: { timeline: number };
};

const STORE_KEY = Symbol.for('bigpdf.lab.billing');

type GlobalWithStore = typeof globalThis & { [STORE_KEY]?: BillingLabState };

function createState(): BillingLabState {
  return {
    now: DAY_ZERO,
    invoices: new Map(seedInvoices().map((invoice) => [invoice.invoiceId, invoice])),
    appliedBankEvents: new Set(),
    timeline: [],
    counters: { timeline: 0 },
  };
}

export function getBillingStore(): BillingLabState {
  const holder = globalThis as GlobalWithStore;
  holder[STORE_KEY] ??= createState();
  return holder[STORE_KEY];
}

export function resetBillingStore(): BillingLabState {
  const holder = globalThis as GlobalWithStore;
  holder[STORE_KEY] = createState();
  return holder[STORE_KEY];
}

export function billingLog(message: string, actor: TimelineEntry['actor'] = 'billing'): void {
  const store = getBillingStore();
  store.counters.timeline += 1;
  store.timeline.push({
    id: `tl_${store.counters.timeline}`,
    at: new Date(store.now).toISOString(),
    actor,
    message,
  });
  if (store.timeline.length > 200) store.timeline.splice(0, store.timeline.length - 200);
}

export function currentDay(now: number = getBillingStore().now): number {
  return Math.floor((now - DAY_ZERO) / DAY_MS);
}

/** Apply anything the banks were going to do on or before the current day. */
function applyBankSchedule(): void {
  const store = getBillingStore();
  const day = currentDay();

  for (const event of BANK_SCHEDULE) {
    if (event.onDay > day) continue;
    if (store.appliedBankEvents.has(event.invoiceId)) continue;

    const invoice = store.invoices.get(event.invoiceId);
    if (!invoice || invoice.paymentState !== 'submitted') continue;

    const at = new Date(DAY_ZERO + event.onDay * DAY_MS).toISOString();
    store.appliedBankEvents.add(event.invoiceId);

    if (event.outcome === 'paid') {
      invoice.paymentState = 'paid';
      invoice.paidAt = at;
      billingLog(`${invoice.workspaceName}: the bank confirmed the debit on day ${event.onDay}`, 'bank');
    } else {
      invoice.paymentState = 'returned';
      invoice.returnedAt = at;
      invoice.returnReason = event.reason;
      billingLog(
        `${invoice.workspaceName}: the bank returned the debit on day ${event.onDay} (${event.reason})`,
        'bank',
      );
    }
  }
}

export type BillingPolicy = {
  graceWindowFor(invoice: Invoice): GraceWindow;
  decideDunning(input: DunningInput): DunningDecision;
};

/** A window the console can still render when `graceWindowFor` throws. */
function guardWindow(policy: BillingPolicy, invoice: Invoice): GraceWindow {
  try {
    return policy.graceWindowFor(invoice);
  } catch (error) {
    return {
      deadline: invoice.dueAt,
      reason: `graceWindowFor threw: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function guardDecision(policy: BillingPolicy, input: DunningInput): DunningDecision {
  try {
    return policy.decideDunning(input);
  } catch (error) {
    return {
      action: 'wait',
      reason: `decideDunning threw: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * The nightly billing run, except it runs whenever the clock moves.
 *
 * It asks the two lab functions what to do and then does it. It does not second-guess
 * either answer, because the point of the exercise is to watch a policy meet a rail.
 */
export function runBilling(policy: BillingPolicy): AccountView[] {
  applyBankSchedule();

  const store = getBillingStore();
  const views: AccountView[] = [];

  for (const invoice of store.invoices.values()) {
    const window = guardWindow(policy, invoice);
    const decision = guardDecision(policy, { invoice, now: store.now, window });

    const before = invoice.stage;
    if (decision.action === 'remind') invoice.stage = 'reminded';
    if (decision.action === 'suspend') invoice.stage = 'suspended';
    if (decision.action === 'clear') invoice.stage = 'none';

    if (invoice.stage !== before) {
      billingLog(
        `${invoice.workspaceName}: ${before} -> ${invoice.stage} on day ${currentDay()}. ${decision.reason}`,
      );
    }

    views.push({
      invoice: { ...invoice },
      window,
      decision,
      active: invoice.stage !== 'suspended',
      daysPastDue: Math.floor((store.now - Date.parse(invoice.dueAt)) / DAY_MS),
    });
  }

  return views;
}

export function billingState(policy: BillingPolicy): BillingState {
  const store = getBillingStore();
  return {
    now: new Date(store.now).toISOString(),
    day: currentDay(),
    accounts: runBilling(policy),
    sepaReturnBusinessDays: SEPA_RETURN_BUSINESS_DAYS,
    cardGraceHours: CARD_GRACE_HOURS,
  };
}

/** Move the simulated clock. The billing run happens on the way through. */
export function advanceClock(policy: BillingPolicy, hours: number): BillingState {
  const store = getBillingStore();
  store.now += hours * 60 * 60 * 1000;
  billingLog(`Clock advanced to day ${currentDay()}`);
  return billingState(policy);
}

export function readBillingTimeline(): TimelineEntry[] {
  return [...getBillingStore().timeline].reverse();
}
