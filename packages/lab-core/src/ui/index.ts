/**
 * Client entry point for the lab.
 *
 * Safe to import from client components. It never reaches the server store: the browser
 * talks to the application server over HTTP, like any other browser would.
 */
export { labApi, billingApi, CLIENT_TIMEOUT_MS, type LabApi, type BillingApi } from './api';
export {
  usePoll,
  useTimeline,
  useDashboard,
  useBilling,
  POLL_INTERVAL_MS,
  type DashboardControls,
  type BillingControls,
} from './hooks';
export { Dashboard } from './Dashboard';
export { BillingConsole } from './BillingConsole';
export { SegmentGrid } from './SegmentGrid';
export { GatewayTable } from './GatewayTable';
export { AttemptFeed } from './AttemptFeed';
export { ChaosPanel } from './ChaosPanel';
export { Shell } from './Shell';
export {
  THEME,
  HEALTH,
  OUTCOME,
  FAILURE,
  ACTOR,
  STAGE,
  PAYMENT_STATE,
  healthTone,
  formatRate,
  type HealthTone,
} from './theme';
export { APP_LABEL, PROVIDER_LABEL } from './labels';
