/**
 * HTTP handlers for the lab's application server.
 *
 * The routing and retry decisions run here, on the server, because that is where they
 * run in real life. Each app wires its own `src/lab/` functions in through
 * `createHandlers`, so the starter and the solution share one server and differ only in
 * the two files you are asked to write.
 *
 * One rule runs through all of them: a 4xx means the request was malformed. A failed
 * payment is a perfectly successful HTTP 200 that says the payment failed.
 */
import type { DashboardState } from '../contracts/index';
import { GATEWAYS } from './gateways';
import { currentHealth } from './health';
import { incidentSummaries, isIncidentId } from './incidents';
import type { LabPolicy } from './orchestrator';
import { advance, burst, MAX_ATTEMPTS } from './orchestrator';
import { getStore, resetStore } from './store';
import { logTimeline, readTimeline } from './timeline';
import { ATTEMPTS_PER_SECOND } from './traffic';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

/** How many attempts the feed shows. Newest first. */
const FEED_SIZE = 40;

function dashboardState(): DashboardState {
  const store = getStore();
  return {
    health: currentHealth(),
    ledger: { ...store.ledger },
    orchestrator: {
      running: store.running,
      attemptsPerSecond: ATTEMPTS_PER_SECOND,
      maxAttempts: MAX_ATTEMPTS,
      incidents: incidentSummaries(),
    },
    gateways: GATEWAYS,
    recent: [...store.attempts].slice(-FEED_SIZE).reverse(),
  };
}

export type LabHandlers = {
  dashboard: () => Response;
  timeline: () => Response;
  setRunning: (request: Request) => Promise<Response>;
  setIncident: (request: Request) => Promise<Response>;
  burst: (request: Request) => Promise<Response>;
  reset: () => Response;
};

export function createHandlers(policy: LabPolicy): LabHandlers {
  /** Every read catches the simulation up first, so traffic flows while anyone is watching. */
  const catchUp = (): void => {
    advance(policy);
  };

  return {
    dashboard(): Response {
      catchUp();
      return json(dashboardState());
    },

    timeline(): Response {
      catchUp();
      return json({ entries: readTimeline() });
    },

    async setRunning(request: Request): Promise<Response> {
      catchUp();
      const body = await readJson(request);
      if (body === null) return json({ error: 'Body must be JSON' }, 400);
      const { running } = body;
      if (typeof running !== 'boolean') return json({ error: 'Expected { running: boolean }' }, 400);

      const store = getStore();
      store.running = running;
      store.lastAdvanceAt = Date.now();
      logTimeline({ actor: 'chaos', message: running ? 'Traffic resumed' : 'Traffic paused' });
      return json(dashboardState());
    },

    async setIncident(request: Request): Promise<Response> {
      catchUp();
      const body = await readJson(request);
      if (body === null) return json({ error: 'Body must be JSON' }, 400);
      const { incidentId, active } = body;
      if (!isIncidentId(incidentId) || typeof active !== 'boolean') {
        return json({ error: 'Expected { incidentId, active: boolean }' }, 400);
      }

      const store = getStore();
      if (active) store.activeIncidents.add(incidentId);
      else store.activeIncidents.delete(incidentId);
      logTimeline({
        actor: 'chaos',
        message: `${active ? 'Injected' : 'Cleared'} "${incidentId}"`,
      });
      return json(dashboardState());
    },

    async burst(request: Request): Promise<Response> {
      const body = await readJson(request);
      if (body === null) return json({ error: 'Body must be JSON' }, 400);
      const { count } = body;
      if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 500) {
        return json({ error: 'Expected { count: integer between 1 and 500 }' }, 400);
      }
      burst(policy, count);
      return json(dashboardState());
    },

    reset(): Response {
      resetStore();
      logTimeline({ actor: 'chaos', message: 'Reset: attempts, captures, the ledger and every fault are gone' });
      return json(dashboardState());
    },
  };
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  } catch {
    return null;
  }
}
