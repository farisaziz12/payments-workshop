/**
 * Client entry point for the lab.
 *
 * Safe to import from client components. It never reaches the server store: the browser
 * talks to the application server over HTTP, like any other browser would.
 */
export { labApi, CLIENT_TIMEOUT_MS, type LabApi } from './api';
export { usePoll, useTimeline, useDashboard, POLL_INTERVAL_MS, type DashboardControls } from './hooks';
export { Dashboard } from './Dashboard';
export { SegmentGrid } from './SegmentGrid';
export { GatewayTable } from './GatewayTable';
export { AttemptFeed } from './AttemptFeed';
export { ChaosPanel } from './ChaosPanel';
export { Shell } from './Shell';
export { THEME, HEALTH, OUTCOME, FAILURE, ACTOR, healthTone, formatRate, type HealthTone } from './theme';
export { APP_LABEL, PROVIDER_LABEL } from './labels';
