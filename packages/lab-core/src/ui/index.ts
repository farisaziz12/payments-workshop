/**
 * Client entry point for the lab.
 *
 * Safe to import from client components. It never reaches the server store: the browser
 * talks to the application server over HTTP, like any other browser would.
 */
export { labApi, mintPurchaseId, PURCHASE_STORAGE_KEY, CLIENT_TIMEOUT_MS, type LabApi } from './api';
export { usePoll, useTimeline, useSimulator, useEntitlement, POLL_INTERVAL_MS } from './hooks';
export { CheckoutScreen, type CheckoutScreenProps, type RestoreContext, type RestoreResult } from './CheckoutScreen';
export { WorkspaceScreen } from './WorkspaceScreen';
export { SimulatorPanel } from './SimulatorPanel';
export { Timeline } from './Timeline';
export { Shell } from './Shell';
export { PlanPanel } from './PlanPanel';
export { StatusPanel } from './StatusPanel';
export { THEME, STATUS, ACTOR, OUTCOME } from './theme';
export { APP_LABEL, PROVIDER_LABEL } from './labels';
