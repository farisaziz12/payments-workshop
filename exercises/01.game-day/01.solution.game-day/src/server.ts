/**
 * Where your code meets the server.
 *
 * Routing and retry are server decisions in this lab because they are server decisions in
 * real life. The handlers are shared with the reference app; the only things injected here
 * are the two functions in `src/lab/`.
 */
import { createHandlers } from '@bigpdf/lab-core/server';
import { chooseGateway } from './lab/routing';
import { planRetry } from './lab/retryPolicy';

export const handlers = createHandlers({ chooseGateway, planRetry });
