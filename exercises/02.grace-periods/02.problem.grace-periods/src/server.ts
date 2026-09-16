/**
 * Where your code meets the server.
 *
 * The dunning run is a server decision, so the two functions in `src/lab/` run here. The
 * handlers are shared with the reference app; only those two functions are injected.
 */
import { createBillingHandlers } from '@bigpdf/lab-core/server';
import { graceWindowFor } from './lab/graceWindow';
import { decideDunning } from './lab/dunningDecision';

export const handlers = createBillingHandlers({ graceWindowFor, decideDunning });
