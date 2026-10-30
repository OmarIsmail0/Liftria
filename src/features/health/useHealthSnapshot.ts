import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { healthConnect } from '../../services/health';
import { listCachedHealth, saveHealthValues } from '../../services/database';
import type { HealthValue, MetricType, PermissionState } from '../../services/health/types';
import { APPLE_NOT_REQUESTED } from '../../services/health/types';
import { appleHealthPhone, healthAdapterVisible } from './deviceHealth';
import {
  appleWindowSummary, emptyMetricState, NOTE_APPLE_READ_ERROR, NOTE_NO_DATA, onlyLocalDayRecords,
  recordsInWindow, summarizeAppleTotal, summarizeRecords, type HealthSummary,
} from './presentation';

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
  fresh: boolean; // true only when a live platform health read was attempted this refresh
};
const empty: HealthSnapshot = {
  availability: null, loaded: false, permissions: {}, readings: {}, records: [], readAt: null, fresh: false,
};
const refreshIntervalMs = 15 * 60 * 1000;
let lastForegroundRead = 0;
let lastActualReadAt: string | null = null;

function noDataReading(metric: MetricType): HealthSummary {
  return { metric, state: 'no-data', sources: [], total: null, latestAt: null, unverified: false, note: NOTE_NO_DATA };
}

export async function loadHealthSnapshot(metrics: readonly MetricType[], readLive = true): Promise<HealthSnapshot> {
  // On iPhone, healthConnect is the Apple Health adapter. Android-cached rows
  // (health-connect / samsung-health) stay in the database and stay off this screen.
  const ios = appleHealthPhone();
  const availability = await healthConnect.getAvailability();
  const available = availability === 'available';
  const permissions: Partial<Record<MetricType, PermissionState>> = available ? await healthConnect.getPermissionStatus([...metrics]) : {};
  const cached = await listCachedHealth(500);
  let all: HealthValue[] = (cached.ok ? cached.value : []).filter(row => healthAdapterVisible(row.adapter));
  let attempted = false;
  const readings: Partial<Record<MetricType, HealthSummary>> = {};
  const now = new Date();
  const localStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (readLive && available) {
    const until = new Date(), from = new Date(until);
    from.setHours(0, 0, 0, 0);
    const fresh: HealthValue[] = [];
    for (const metric of metrics) {
      // HealthKit never returns 'granted' for a read. Still attempt it.
      // Android keeps the granted gate and still skips active energy here.
      const mayRead = ios
        ? metric !== 'total-calories' && metric !== 'basal-metabolic-rate'
        : permissions[metric] === 'granted' && metric !== 'active-calories' &&
          metric !== 'total-calories' && metric !== 'basal-metabolic-rate';
      if (!mayRead) continue;
      attempted = true;
      const result = await healthConnect.read(metric, { start: from, end: until });
      if (result.status === 'ok') {
        const visible = result.records.filter(row => healthAdapterVisible(row.adapter) &&
          !(row.kind === 'aggregate' && !(row.value > 0)));
        fresh.push(...visible);
        if (ios) {
          const aggregate = visible.find(row => row.kind === 'aggregate' && row.metric === metric);
          if (aggregate && aggregate.kind === 'aggregate') {
            readings[metric] = summarizeAppleTotal(metric, aggregate, now.getTime());
          } else if (!visible.some(row => row.kind !== 'aggregate')) {
            readings[metric] = noDataReading(metric);
          }
        }
      } else if (ios && result.status === 'error' && result.code === APPLE_NOT_REQUESTED) {
        readings[metric] = emptyMetricState(metric, 'unknown', true);
      } else if (result.status === 'error') {
        const prior = ios
          ? appleWindowSummary(metric, all, localStart, now, true)
          : summarizeRecords(metric, recordsInWindow(metric, all, localStart, now), 'granted', true);
        readings[metric] = { ...prior, state: 'error',
          note: ios ? NOTE_APPLE_READ_ERROR
            : 'Could not read Health Connect. Cached readings may be stale. Try again.' };
      } else if (result.status === 'permission-denied') {
        readings[metric] = emptyMetricState(metric, 'denied', true);
      } else if (ios && result.status === 'empty') {
        readings[metric] = noDataReading(metric);
      } else if (ios && (result.status === 'unavailable' || result.status === 'unsupported')) {
        readings[metric] = emptyMetricState(metric, 'unknown', false);
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
    if (ios) {
      readings[metric] = appleWindowSummary(metric, all, localStart, now, available);
      continue;
    }
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
