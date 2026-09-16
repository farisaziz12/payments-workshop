/**
 * Where does this payment go?
 *
 * 🧾 This function is pure. It gets one argument and returns a decision. No fetching, no
 *    state. The orchestrator calls it once per charge, on the server, and sends the
 *    payment wherever you say.
 *
 * 🧾 What you are handed, in `input`:
 *      segment    method, country and currency. The unit failures actually cluster in
 *      gateways   the table, in configured priority order. Lower priority number wins
 *      health     the whole rolling window, every segment and every gateway
 *      tried      gateways this charge has already been sent to. Do not send it back
 *
 * 🧾 Two helpers are exported from `@bigpdf/lab-core/contracts`, ready to add to the
 *    import below when you want them:
 *      supportsSegment(gateway, segment)     can this gateway take this at all?
 *      segmentHealthFor(health, segment)     this segment's slice of the window
 *
 * 🧾 `health.gateways` is the same gateway measured across every segment at once. It is
 *    what a status page shows. It is not the number that answers a routing question.
 */
import type { RoutingDecision, RoutingInput } from '@bigpdf/lab-core/contracts';

export function chooseGateway(input: RoutingInput): RoutingDecision {
  // 🦆 Task 1: this sends everything to whichever gateway happens to be first in the
  //    table, for ever, whatever is happening to it and whether or not it can even
  //    accept the payment.
  //
  //    Two things are wrong with it, and the console shows both:
  //      - SEPA debits go to a gateway that does not take SEPA, and come back as
  //        "Method not supported there". Watch the Misrouted counter climb.
  //      - when a gateway starts failing one segment, every charge in that segment keeps
  //        going to it anyway.
  //
  //    What you return is a `RoutingDecision`:
  //      gatewayId   the gateway to send it to, or null to send it nowhere
  //      reason      one short line, shown in the attempt feed. Say what decided it
  //
  //    Returning null is a real answer. When nothing eligible is left, stopping is
  //    correct, and it is better than sending money at a gateway that will refuse it.
  //
  //    Order worth working in: eligibility first, then health, then priority.
  const first = input.gateways[0];
  return {
    gatewayId: first ? first.id : null,
    reason: 'Primary gateway',
  };
}
