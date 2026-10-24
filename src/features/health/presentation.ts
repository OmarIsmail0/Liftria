import type { HealthValue, MetricType, PermissionState } from '../../services/health/types';

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

/** The daily-energy gate remains NOT READY: no HC aggregate is measured Phase-2 energy. */
export function phase2EnergyMessage(permission: PermissionState, available: boolean): string {
  if (!available) return 'Not available';
  if (permission === 'denied') return 'Not allowed';
  if (permission === 'unknown') return 'Permission not confirmed';
  return 'No measured source';
}

/** Never sum a cached step or exercise interval from a different local day into Today. */
export function onlyLocalDayRecords(metric: MetricType, records: HealthValue[], start: Date, end: Date): HealthValue[] {
  if (metric !== 'steps' && metric !== 'exercise-session' && metric !== 'sleep-session') return records;
  const from = start.getTime(), until = end.getTime();
  return records.filter(r => {
    if (r.kind === 'aggregate') return false;
    if (metric === 'steps' && r.kind !== 'interval') return false;
    if (metric === 'exercise-session' && r.kind !== 'session') return false;
    if (metric === 'sleep-session' && r.kind !== 'sleep') return false;
    if (r.kind !== 'interval' && r.kind !== 'session' && r.kind !== 'sleep') return false;
    const a = Date.parse(r.start), b = Date.parse(r.end);
    // Sleep can begin yesterday; a completed session counted today ends today.
    return Number.isFinite(a) && Number.isFinite(b) && b >= from && b <= until &&
      (metric === 'sleep-session' || a >= from);
  });
}

/** Freshness labels use the record timestamp, never the time a cached row was re-read. */
export function ageLabel(timestamp: string, nowMs = Date.now()): string {
  const time = Date.parse(timestamp);
  if (!Number.isFinite(time)) return 'Time unknown';
  const elapsedMinutes = Math.max(0, Math.floor((nowMs - time) / 60000));
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}
