import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { healthConnect } from '../../services/health';
import { listCachedHealth, saveHealthValues } from '../../services/database';
import type { HealthValue, MetricType, PermissionState } from '../../services/health/types';
import { emptyMetricState, onlyLocalDayRecords, recordsInWindow, summarizeRecords, type HealthSummary } from './presentation';

export const overviewMetrics = [
  'steps', 'heart-rate', 'exercise-session', 'sleep-session',
  'weight', 'body-fat', 'active-calories',
] as const satisfies readonly MetricType[];

export type HealthSnapshot = {
  availability: Awaited<ReturnType<typeof healthConnect.getAvailability>> | null;
  loaded: boolean;
  permissions: Partial<Record<MetricType, PermissionState>>;
  readings: Partial<Record<MetricType, HealthSummary>>;
  records: HealthValue[];
  readAt: string | null;
  fresh: boolean; // true only when a live Health Connect read was attempted this refresh
};
const empty: HealthSnapshot = {
  availability: null, loaded: false, permissions: {}, readings: {}, records: [], readAt: null, fresh: false,
};
const refreshIntervalMs = 15 * 60 * 1000;
let lastForegroundRead = 0;
let lastActualReadAt: string | null = null;

export async function loadHealthSnapshot(metrics: readonly MetricType[], readLive = true): Promise<HealthSnapshot> {
  const availability = await healthConnect.getAvailability();
  const available = availability === 'available';
  const permissions: Partial<Record<MetricType, PermissionState>> = available ? await healthConnect.getPermissionStatus([...metrics]) : {};
  const cached = await listCachedHealth(500);
  let all: HealthValue[] = cached.ok ? cached.value : [];
  let attempted = false;
  const readings: Partial<Record<MetricType, HealthSummary>> = {};
  const now = new Date();
  const localStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (readLive && available) {
    const until = new Date(), from = new Date(until);
    from.setHours(0, 0, 0, 0);
    const fresh: HealthValue[] = [];
    for (const metric of metrics) {
      if (permissions[metric] !== 'granted' || metric === 'active-calories' ||
          metric === 'total-calories' || metric === 'basal-metabolic-rate') continue;
      attempted = true;
      const result = await healthConnect.read(metric, { start: from, end: until });
      if (result.status === 'ok') fresh.push(...result.records);
      if (result.status === 'error') {
        const prior = summarizeRecords(metric, recordsInWindow(metric, all, localStart, now), 'granted', true);
        readings[metric] = { ...prior, state: 'error',
          note: 'Could not read Health Connect. Cached readings may be stale. Try again.' };
      } else if (result.status === 'permission-denied') {
        readings[metric] = emptyMetricState(metric, 'denied', true);
      }
    }
    // Keeping old cache entries is fine; each source has independent freshness.
    if (fresh.length) {
      await saveHealthValues(fresh);
      all = [...fresh, ...all];
    }
    lastForegroundRead = Date.now();
    if (attempted) lastActualReadAt = new Date(lastForegroundRead).toISOString();
  }
  for (const metric of metrics) {
    if (readings[metric]) continue;
    readings[metric] = summarizeRecords(metric, onlyLocalDayRecords(metric, all, localStart, now), permissions[metric] ?? 'unknown', available);
  }

  return { availability, loaded: true, permissions, readings, records: all,
    readAt: lastActualReadAt, fresh: attempted };
}

/** Foreground reads are at most once per 15 min; manual refresh always overrides that gate. */
export function useHealthSnapshot(metrics: readonly MetricType[]) {
  const [snapshot, setSnapshot] = useState<HealthSnapshot>(empty);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async (force = false) => {
    const live = force || Date.now() - lastForegroundRead >= refreshIntervalMs;
    setRefreshing(true);
    try { setSnapshot(await loadHealthSnapshot(metrics, live)); }
    catch {
      // A failed availability check must not be mislabeled as unsupported hardware.
      setSnapshot(previous => ({ ...previous, loaded: true, fresh: false }));
    }
    finally { setRefreshing(false); }
  }, [metrics]);
  useEffect(() => {
    let mounted = true;
    void Promise.resolve().then(() => { if (mounted) return refresh(); });
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    return () => { mounted = false; sub.remove(); };
  }, [refresh]);
  return { snapshot, refreshing, refresh };
}
