'use client';

/**
 * Polling plumbing. Supplied so the exercise can stay on payment state.
 *
 * The timeline and the simulator panel poll on their own, independently of anything
 * you write. That is deliberate: when the checkout screen and the server disagree,
 * the timeline keeps telling you the truth.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiResult, Entitlement, SimulatorState, TimelineEntry } from '../contracts/index';
import { labApi } from './api';

export const POLL_INTERVAL_MS = 1500;

/** Run `fetcher` now and then every `intervalMs`, while `enabled` stays true. */
export function usePoll<T>(
  fetcher: () => Promise<ApiResult<T>>,
  { enabled = true, intervalMs = POLL_INTERVAL_MS }: { enabled?: boolean; intervalMs?: number } = {},
): { result: ApiResult<T> | null; refresh: () => Promise<void> } {
  const [result, setResult] = useState<ApiResult<T> | null>(null);
  const alive = useRef(true);
  const fetcherRef = useRef(fetcher);

  // Keep the ref pointing at the latest fetcher without touching it during render.
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const refresh = useCallback(async () => {
    const next = await fetcherRef.current();
    if (alive.current) setResult(next);
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

  return { result, refresh };
}

export function useTimeline(enabled = true): TimelineEntry[] {
  const { result } = usePoll(() => labApi.getTimeline(), { enabled });
  return result?.ok ? result.data.entries : [];
}

export function useSimulator(): {
  state: SimulatorState | null;
  setScenario: (id: SimulatorState['scenarioId']) => Promise<void>;
  deliverNow: () => Promise<void>;
  reset: () => Promise<void>;
} {
  const { result, refresh } = usePoll(() => labApi.getSimulator());
  const state = result?.ok ? result.data : null;

  return {
    state,
    setScenario: async (id) => {
      await labApi.setScenario(id);
      await refresh();
    },
    deliverNow: async () => {
      await labApi.deliverNow();
      await refresh();
    },
    reset: async () => {
      await labApi.reset();
      await refresh();
    },
  };
}

export function useEntitlement(workspaceId: string): Entitlement | null {
  const { result } = usePoll(() => labApi.getEntitlement(workspaceId));
  return result?.ok ? result.data : null;
}
