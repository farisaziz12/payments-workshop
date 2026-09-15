/**
 * Server entry point for the lab.
 *
 * Import this only from route handlers and server components. It owns the in-memory store,
 * so pulling it into a client bundle would give the browser a second, private copy of the
 * truth. That is exactly the bug the exercise is about.
 */
export * from './store';
export * from './timeline';
export * from './scenarios';
export * from './provider';
export * from './events';
export * from './delivery';
export * from './entitlement';
export * from './checkout';
export * from './handlers';
