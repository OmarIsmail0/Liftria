import type { AggregateValue, HealthValue, MetricType, PermissionState } from '../../services/health/types';

export type HealthReadingState = 'value' | 'no-data' | 'not-allowed' | 'not-available' | 'error';
export type OriginSummary = { origin: string; label: string; value: number; unit: string; latestAt: string; stale: boolean };
export type HealthSummary = {
  state: HealthReadingState; metric: MetricType; sources: OriginSummary[];
  total: number | null; latestAt: string | null; unverified: boolean; note: string;
};

/** App package is provenance, NOT proof that a connected watch supplied the record. */
export function sourceName(origin: string): string {
  if (origin === 'com.android.healthconnect.phone' ||
      origin.startsWith('com.android.healthconnect.phone.')) return 'Phone';
  if (origin === 'com.sec.android.app.shealth') return 'Samsung Health';
  return origin.trim() || 'Unknown source';
}

export function sourceStale(metric: MetricType, at: string, nowMs: number): boolean {
  const timestamp = Date.parse(at);
  if (!Number.isFinite(timestamp)) return true;
  const maxAgeHours = metric === 'weight' || metric === 'body-fat' || metric === 'lean-body-mass'
    ? 24 * 14 : metric === 'total-calories' || metric === 'active-calories' ? 24 : 6;
  return nowMs - timestamp > maxAgeHours * 60 * 60 * 1000;
}

export function emptyMetricState(metric: MetricType, permission: PermissionState, available: boolean): HealthSummary {
  const state = !available ? 'not-available' : permission === 'denied' ? 'not-allowed' : 'no-data';
  return { metric, state, sources: [], total: null, latestAt: null, unverified: false,
    note: state === 'not-allowed' ? 'Not allowed' :
      state === 'not-available' ? 'Not available' : 'No data' };
}

/** Group a metric by contributing app. Only one-origin steps expose a single total. */
export function summarizeRecords(
  metric: MetricType, records: HealthValue[], permission: PermissionState = 'granted', available = true,
  nowMs = Date.now(),
): HealthSummary {
  if (!available || permission === 'denied') return emptyMetricState(metric, permission, available);
  const groups = new Map<string, { value: number; unit: string; latestAt: string }>();
  const seen = new Set<string>();
  for (const record of records) {
    if (record.kind === 'aggregate') continue;
    const kindMetric = record.kind === 'session' ? 'exercise-session'
      : record.kind === 'sleep' ? 'sleep-session' : record.metric;
    if (kindMetric !== metric || !record.dataOrigin) continue;
    const uniqueId = record.adapter + ':' + record.dataOrigin + ':' + record.recordId;
    if (seen.has(uniqueId)) continue;
    seen.add(uniqueId);
    const origin = record.dataOrigin;
    if (metric === 'steps' && record.kind === 'interval') {
      const current = groups.get(origin);
      groups.set(origin, { value: (current?.value ?? 0) + record.value, unit: 'steps',
        latestAt: current && current.latestAt > record.end ? current.latestAt : record.end });
    } else if (metric === 'heart-rate' && record.kind === 'series') {
      const points = record.points.filter(point => Number.isFinite(point.value) && Number.isFinite(Date.parse(point.time)));
      const newest = points.sort((a, b) => Date.parse(b.time) - Date.parse(a.time))[0];
      if (!newest) continue;
      const current = groups.get(origin);
      if (!current || newest.time > current.latestAt) groups.set(origin,
        { value: newest.value, unit: 'bpm', latestAt: newest.time });
    } else if (record.kind === 'instant' && record.metric === metric) {
      const current = groups.get(origin);
      if (!current || record.time > current.latestAt) groups.set(origin,
        { value: record.value, unit: record.unit, latestAt: record.time });
    } else if (record.kind === 'session') {
      const current = groups.get(origin);
      groups.set(origin, { value: (current?.value ?? 0) + 1, unit: 'sessions',
        latestAt: current && current.latestAt > record.end ? current.latestAt : record.end });
    } else if (record.kind === 'sleep') {
      const current = groups.get(origin);
      groups.set(origin, { value: (current?.value ?? 0) + (Date.parse(record.end) - Date.parse(record.start)) / 60000,
        unit: 'minutes', latestAt: current && current.latestAt > record.end ? current.latestAt : record.end });
    }
  }
  const sources = [...groups.entries()].map(([origin, v]) => ({
    origin, label: sourceName(origin), value: v.value, unit: v.unit,
    latestAt: v.latestAt, stale: sourceStale(metric, v.latestAt, nowMs),
  })).sort((a, b) => b.latestAt.localeCompare(a.latestAt));
  if (!sources.length) return emptyMetricState(metric, permission, available);
  const latestAt = sources[0]?.latestAt ?? null;
  // A total for multiple sources is misleading; we never sum phone and watch.
  const total = sources.length === 1 ? sources[0]!.value : null;
  return {
    metric, state: 'value', sources, total, latestAt,
    unverified: metric === 'heart-rate',
    note: metric === 'heart-rate' ? 'Unverified device. The data origin does not prove this came from a watch.' :
      sources.length > 1 ? 'Separate sources; no combined total.' : '',
  };
}

/** Unattributed Health Connect energy is a provider estimate, not measured exercise. */
export function measuredEnergy(aggregates: AggregateValue[]): { kcal: number; origin: string } | null {
  const valid = aggregates.filter(item => (item.metric === 'active-calories' || item.metric === 'total-calories') &&
    Number.isFinite(item.value) && item.value >= 0);
  for (const item of valid) {
    const fromList = item.dataOrigins?.filter(v => v.trim()) ?? [];
    const origins = fromList.length ? fromList : item.dataOrigin ? [item.dataOrigin] : [];
    // Multiple origins are not silently merged into a single measurement.
    if (origins.length === 1) return { kcal: item.value, origin: origins[0]! };
  }
  return null;
}
