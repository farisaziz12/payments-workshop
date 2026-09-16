import { describe, expect, it } from 'vitest';
import { GATEWAYS } from '@bigpdf/lab-core/server';
import { chooseGateway } from '@lab/01/lab/routing';
import {
  CARD_DE,
  CARD_GB,
  SEPA_DE,
  atlasBrokenForGermanCards,
  borealisBrokenForSepa,
  empty,
  healthy,
} from './fixtures';

const route = (input: Parameters<typeof chooseGateway>[0]) => chooseGateway(input);

describe('[Task 1] routing respects what a gateway can actually accept', () => {
  it('sends German cards to the primary gateway while everything is healthy', () => {
    const decision = route({ segment: CARD_DE, gateways: GATEWAYS, health: healthy(), tried: [] });
    expect(decision.gatewayId).toBe('atlas');
  });

  it('never sends a SEPA debit anywhere but the gateway that takes SEPA', () => {
    const decision = route({ segment: SEPA_DE, gateways: GATEWAYS, health: healthy(), tried: [] });
    expect(decision.gatewayId).toBe('borealis');
  });

  it('never sends a sterling card to a gateway that has no sterling', () => {
    const decision = route({ segment: CARD_GB, gateways: GATEWAYS, health: healthy(), tried: [] });
    expect(decision.gatewayId).not.toBe('borealis');
  });

  it('decides something sensible before any traffic has been measured', () => {
    expect(route({ segment: CARD_DE, gateways: GATEWAYS, health: empty(), tried: [] }).gatewayId).toBe('atlas');
    expect(route({ segment: SEPA_DE, gateways: GATEWAYS, health: empty(), tried: [] }).gatewayId).toBe('borealis');
  });

  it('gives a reason for whatever it decided', () => {
    const decision = route({ segment: CARD_DE, gateways: GATEWAYS, health: healthy(), tried: [] });
    expect(decision.reason.trim().length).toBeGreaterThan(0);
  });
});

describe('[Task 1] routing moves traffic away from a gateway that is failing this segment', () => {
  it('stops sending German cards to a gateway that is timing them out', () => {
    const decision = route({
      segment: CARD_DE,
      gateways: GATEWAYS,
      health: atlasBrokenForGermanCards(),
      tried: [],
    });
    expect(decision.gatewayId).not.toBe('atlas');
    expect(decision.gatewayId).not.toBeNull();
  });

  it('leaves sterling cards where they were, because that segment is fine', () => {
    // Atlas looks bad overall in this snapshot. It is not bad for this segment, and a
    // policy that reads the global number moves traffic that was never in trouble, onto
    // a gateway that authorises less and costs more.
    const decision = route({
      segment: CARD_GB,
      gateways: GATEWAYS,
      health: atlasBrokenForGermanCards(),
      tried: [],
    });
    expect(decision.gatewayId).toBe('atlas');
  });

  it('still sends SEPA to its only gateway when that gateway is the one struggling', () => {
    // There is nowhere else. Degraded is not dead, and refusing to route here would be a
    // self-inflicted outage on top of the provider's.
    const decision = route({
      segment: SEPA_DE,
      gateways: GATEWAYS,
      health: borealisBrokenForSepa(),
      tried: [],
    });
    expect(decision.gatewayId).toBe('borealis');
  });
});

describe('[Task 1] routing never repeats a gateway this charge has already used', () => {
  it('picks a different gateway when the first one has been tried', () => {
    const decision = route({
      segment: CARD_DE,
      gateways: GATEWAYS,
      health: healthy(),
      tried: ['atlas'],
    });
    expect(decision.gatewayId).not.toBe('atlas');
    expect(decision.gatewayId).not.toBeNull();
  });

  it('routes nowhere once every gateway that accepts this has been tried', () => {
    const decision = route({
      segment: SEPA_DE,
      gateways: GATEWAYS,
      health: healthy(),
      tried: ['borealis'],
    });
    expect(decision.gatewayId).toBeNull();
    expect(decision.reason.trim().length).toBeGreaterThan(0);
  });

  it('routes nowhere for cards once all three have been tried', () => {
    const decision = route({
      segment: CARD_DE,
      gateways: GATEWAYS,
      health: healthy(),
      tried: ['atlas', 'borealis', 'cirrus'],
    });
    expect(decision.gatewayId).toBeNull();
  });
});
