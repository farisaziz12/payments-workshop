/**
 * [TODO 3] Does the workspace page follow the server's entitlement decision?
 */
import { describe, expect, it } from 'vitest';
import type { AccessInputs, Entitlement, EntitlementReason } from '@stacknotes/lab-core/contracts';
import { deriveAccess } from '@lab/app/lab/accessDecision';

const WORKSPACE = 'ws_northstar';

function entitlement(access: 'none' | 'active', reason: EntitlementReason): Entitlement {
  return {
    workspaceId: WORKSPACE,
    access,
    reason,
    ...(access === 'active' ? { grantedByPaymentId: 'pay_1' } : {}),
    decidedAt: '2026-01-01T00:00:00.000Z',
  };
}

function inputs(overrides: Partial<AccessInputs> = {}): AccessInputs {
  return {
    workspaceId: WORKSPACE,
    entitlement: entitlement('none', 'no_payment'),
    clientStatus: 'none',
    search: new URLSearchParams(),
    ...overrides,
  };
}

describe('[TODO 3] access comes from the server\u2019s entitlement', () => {
  it('unlocks when the server says the entitlement is active', () => {
    const decision = deriveAccess(inputs({ entitlement: entitlement('active', 'payment_succeeded') }));

    expect(decision.unlocked).toBe(true);
  });

  it('stays locked when the server says there is no entitlement', () => {
    expect(deriveAccess(inputs()).unlocked).toBe(false);
  });

  it('stays locked while the payment is still processing, even though the browser saw it', () => {
    const decision = deriveAccess(
      inputs({ entitlement: entitlement('none', 'payment_processing'), clientStatus: 'processing' }),
    );

    expect(decision.unlocked).toBe(false);
  });

  it('stays locked while the entitlement has not loaded yet', () => {
    expect(deriveAccess(inputs({ entitlement: null, clientStatus: 'succeeded' })).unlocked).toBe(false);
  });

  it('stays locked when the succeeded payment belongs to another workspace', () => {
    const decision = deriveAccess(
      inputs({ entitlement: entitlement('none', 'payment_for_other_workspace'), clientStatus: 'succeeded' }),
    );

    expect(decision.unlocked).toBe(false);
  });

  it('explains a lock differently depending on the reason the server gave', () => {
    // Your wording is your own. What matters is that a customer whose payment is still
    // being confirmed does not read the same sentence as one whose payment was declined.
    const processing = deriveAccess(inputs({ entitlement: entitlement('none', 'payment_processing') }));
    const failed = deriveAccess(inputs({ entitlement: entitlement('none', 'payment_failed') }));
    const nothing = deriveAccess(inputs({ entitlement: entitlement('none', 'no_payment') }));

    expect(new Set([processing.detail, failed.detail, nothing.detail]).size).toBe(3);
  });

  it('always says something a customer can read', () => {
    const decision = deriveAccess(inputs({ entitlement: entitlement('active', 'payment_succeeded') }));

    expect(decision.headline.length).toBeGreaterThan(0);
    expect(decision.detail.length).toBeGreaterThan(0);
  });
});

describe('[TODO 3] the browser cannot grant itself access', () => {
  it('ignores ?paid=1 in the URL', () => {
    const decision = deriveAccess(inputs({ search: new URLSearchParams('paid=1') }));

    expect(decision.unlocked).toBe(false);
  });

  it('ignores a client-side payment status when the server granted nothing', () => {
    const decision = deriveAccess(inputs({ clientStatus: 'succeeded' }));

    expect(decision.unlocked).toBe(false);
  });

  it('ignores an unknown client status', () => {
    const decision = deriveAccess(inputs({ clientStatus: 'unknown' }));

    expect(decision.unlocked).toBe(false);
  });

  it('ignores a ?paid=1 link even when the server granted access to another workspace', () => {
    const decision = deriveAccess(
      inputs({
        entitlement: { ...entitlement('active', 'payment_succeeded'), workspaceId: 'ws_elsewhere' },
        search: new URLSearchParams('paid=1'),
      }),
    );

    expect(decision.unlocked).toBe(false);
  });
});
