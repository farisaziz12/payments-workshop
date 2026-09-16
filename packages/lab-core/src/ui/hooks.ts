'use client';

/**
 * Polling plumbing. Supplied so the exercise can stay on the payment decisions.
 *
 * The console polls independently of anything you write, and every poll also advances the
 * simulated traffic. The numbers on screen are the server's own account of what your
 * orchestrator did, not your code reporting on itself.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiResult, DashboardState, IncidentId, TimelineEntry } from '../contracts/index';
import { labApi } from './api';

export const POLL_INTERVAL_MS = 1000;

type PollState<T> = {
  /** The most recent answer, including the ones that say we did not get one. */
  result: ApiResult<T> | null;
  /** The last answer that actually arrived. Kept so a blip does not blank the screen. */
  lastData: T | null;
};

/** Run `fetcher` now and then every `intervalMs`, while `enabled` stays true. */
export function usePoll<T>(
  fetcher: () => Promise<ApiResult<T>>,
  { enabled = true, intervalMs = POLL_INTERVAL_MS }: { enabled?: boolean; intervalMs?: number } = {},
): PollState<T> & { refresh: () => Promise<void> } {
  const [state, setState] = useState<PollState<T>>({ result: null, lastData: null });
  const alive = useRef(true);
  const fetcherRef = useRef(fetcher);

  // Keep the ref pointing at the latest fetcher without touching it during render.
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const refresh = useCallback(async () => {
    const next = await fetcherRef.current();
    if (!alive.current) return;
    setState((previous) => ({
      result: next,
      lastData: next.ok ? next.data : previous.lastData,
    }));
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const timer = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs, refresh]);

  return { ...state, refresh };
}

export function useTimeline(enabled = true): TimelineEntry[] {
  const { lastData } = usePoll(() => labApi.getTimeline(), { enabled });
  return lastData?.entries ?? [];
}

export type DashboardControls = {
  state: DashboardState | null;
  /** The last poll did not come back. What is on screen is the previous snapshot. */
  stale: boolean;
  setRunning: (running: boolean) => Promise<void>;
  setIncident: (incidentId: IncidentId, active: boolean) => Promise<void>;
  burst: (count: number) => Promise<void>;
  reset: () => Promise<void>;
};

export function useDashboard(): DashboardControls {
  const { result, lastData, refresh } = usePoll(() => labApi.getDashboard());

  const after = async (call: Promise<unknown>): Promise<void> => {
    await call;
    await refresh();
  };

  return {
    state: lastData,
    stale: result !== null && !result.ok,
    setRunning: (running) => after(labApi.setRunning(running)),
    setIncident: (incidentId, active) => after(labApi.setIncident(incidentId, active)),
    burst: (count) => after(labApi.burst(count)),
    reset: () => after(labApi.reset()),
  };
}
