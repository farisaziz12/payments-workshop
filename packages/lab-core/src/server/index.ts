/**
 * Server entry point for the lab.
 *
 * Import this only from route handlers and server components. It owns the in-memory store,
 * so pulling it into a client bundle would give the browser a second, private copy of the
 * truth, which is the bug both exercises exist to prevent.
 */
export * from './store';
export * from './timeline';
export * from './gateways';
export * from './incidents';
export * from './traffic';
export * from './health';
export * from './orchestrator';
export * from './billing';
export * from './handlers';
