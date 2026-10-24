import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { healthConnect, readDailyEnergy } from '../../services/health';
import { listCachedHealth, saveHealthValues } from '../../services/database';
import type { HealthValue, MetricType, PermissionState } from '../../services/health/types';
import { emptyMetricState, measuredEnergy, onlyLocalDayRecords, summarizeRecords, type HealthSummary } from './presentation';

export const overviewMetrics = [
  'steps', 'heart-rate', 'exercise-session', 'sleep-session',
  'weight', 'body-fat', 'active-calories',
] as const satisfies readonly MetricType[];

export type HealthSnapshot = {
  availability: Awaited<ReturnType<typeof healthConnect.getAvailability>>;
  permissions: Partial<Record<MetricType, PermissionState>>;
  readings: Partial<Record<MetricType, HealthSummary>>;
  records: HealthValue[];
  energy: { kcal: number; origin: string } | null;
  readAt: string | null;
};
const empty: HealthSnapshot = {
  availability: 'unsupported', permissions: {}, readings: {}, records: [], energy: null, readAt: null,
};
const refreshIntervalMs = 15 * 60 * 1000;
let lastForegroundRead = 0;

export async function loadHealthSnapshot(metrics: readonly MetricType[], readLive = true): Promise<HealthSnapshot> {
  const availability = await healthConnect.getAvailability();
  const available = availability === 'available';
  const permissions: Partial<Record<MetricType, PermissionState>> = available ? await healthConnect.getPermissionStatus([...metrics]) : {};
  const cached = await listCachedHealth(500);
  let all: HealthValue[] = cached.ok ? cached.value : [];
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
      const result = await healthConnect.read(metric, { start: from, end: until });
      if (result.status === 'ok') fresh.push(...result.records);
      if (result.status === 'error' && !all.some(v => 'metric' in v && v.metric === metric)) {
        readings[metric] = { ...emptyMetricState(metric, 'granted', true),
          state: 'error', note: 'Could not read Health Connect. Try again.' };
      }
    }
    // Keeping old cache entries is fine; each source has independent freshness.
    if (fresh.length) {
      await saveHealthValues(fresh);
      all = [...fresh, ...all];
    }
    lastForegroundRead = Date.now();
  }
  for (const metric of metrics) {
    if (readings[metric]) continue;
    readings[metric] = summarizeRecords(metric, onlyLocalDayRecords(metric, all, localStart, now), permissions[metric] ?? 'unknown', available);
  }

  let energy: HealthSnapshot['energy'] = null;
  if (readLive && available && metrics.includes('active-calories')) {
    const rows = await readDailyEnergy(1);
    // Disallow unattributed fallback estimates even if Health Connect returned a number.
    energy = measuredEnergy(rows.filter((row): row is Extract<typeof row, { status:'ok' }> =>
      row.status === 'ok').map(row => row.value));
  }
  return { availability, permissions, readings, records: all, energy, readAt: new Date().toISOString() };
}

/** Foreground reads are at most once per 15 min; manual refresh always overrides that gate. */
export function useHealthSnapshot(metrics: readonly MetricType[]) {
  const [snapshot, setSnapshot] = useState<HealthSnapshot>(empty);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async (force = false) => {
    const live = force || Date.now() - lastForegroundRead >= refreshIntervalMs;
    setRefreshing(true);
    try { setSnapshot(await loadHealthSnapshot(metrics, live)); }
    catch { /* Retain previous known, sourced records; never replace them with invented zeroes. */ }
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
