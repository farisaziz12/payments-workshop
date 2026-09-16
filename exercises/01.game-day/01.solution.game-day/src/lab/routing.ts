/**
 * Where does this payment go?
 *
 * Three questions, in this order, and the order is the point.
 *
 *   1. What can take it at all? Eligibility is a fact about the gateway, not a preference.
 *   2. What is healthy for this segment? Not healthy in general. For this segment.
 *   3. Of what is left, what does the configured priority say?
 *
 * Doing health before eligibility gets you a beautifully chosen gateway that returns
 * "unsupported method". Doing either of them against the global gateway numbers moves
 * traffic that was never in trouble.
 */
import type { Gateway, RoutingDecision, RoutingInput } from '@bigpdf/lab-core/contracts';
import { gatewayHealthFor, segmentHealthFor, supportsSegment } from '@bigpdf/lab-core/contracts';

export function chooseGateway(input: RoutingInput): RoutingDecision {
  const eligible = input.gateways
    .filter((gateway) => supportsSegment(gateway, input.segment))
    .filter((gateway) => !input.tried.includes(gateway.id));

  if (eligible.length === 0) {
    return {
      gatewayId: null,
      reason: input.tried.length
        ? 'Every gateway that accepts this has already been tried'
        : 'No gateway accepts this method and currency',
    };
  }

  // The segment slice, never the top level gateway numbers. Atlas failing German cards
  // drags its overall rate down, and British cards on Atlas are perfectly fine.
  const health = segmentHealthFor(input.health, input.segment);
  const healthy = eligible.filter((gateway) => !gatewayHealthFor(health, gateway.id)?.degraded);

  if (healthy.length > 0) {
    const chosen = byPriority(healthy);
    const moved = chosen.id !== byPriority(eligible).id;
    return {
      gatewayId: chosen.id,
      reason: moved
        ? `${byPriority(eligible).name} is degraded for this segment, so ${chosen.name}`
        : `${chosen.name} is healthy for this segment and first by priority`,
    };
  }

  // Everything eligible is degraded. Degraded is not dead, so send it to whichever is
  // doing least badly and say so. Giving up here would be a self-inflicted outage.
  const leastBad = [...eligible].sort(
    (left, right) =>
      (gatewayHealthFor(health, right.id)?.successRate ?? 0) -
      (gatewayHealthFor(health, left.id)?.successRate ?? 0),
  )[0] as Gateway;

  return {
    gatewayId: leastBad.id,
    reason: `Every gateway for this segment is degraded. ${leastBad.name} is the least bad`,
  };
}

function byPriority(gateways: ReadonlyArray<Gateway>): Gateway {
  return [...gateways].sort((left, right) => left.priority - right.priority)[0] as Gateway;
}
