import type { HealthValue, MetricType, PermissionState } from '../../services/health/types';
import { bidiIsolate, translate, type AppLanguage } from '../../i18n';

export type HealthReadingState = 'value' | 'no-data' | 'not-allowed' | 'not-available' | 'error';
export type OriginSummary = { origin: string; label: string; value: number; unit: string; latestAt: string; stale: boolean };
export type HealthSummary = {
  state: HealthReadingState; metric: MetricType; sources: OriginSummary[];
  total: number | null; latestAt: string | null; unverified: boolean; note: string;
};

/**
 * i18n-stored-ids: status codes, not copy. The Health screens compare these exact strings and show
 * `t()` text instead (today.tsx `note()`, health.tsx `readingNote()`, health-detail.tsx `displayNote()`);
 * `chartCopy.ts` does the same for the source labels. Changing a value would break those comparisons.
 * 'Samsung Health' is an app name and stays as it is.
 */
export const SOURCE_PHONE = 'Phone',
  SOURCE_SAMSUNG = 'Samsung Health',
  SOURCE_UNKNOWN = 'Unknown source',
  NOTE_NOT_ALLOWED = 'Not allowed',
  NOTE_NOT_AVAILABLE = 'Not available',
  NOTE_PERMISSION_UNCONFIRMED = 'Permission not confirmed',
  NOTE_NO_DATA = 'No data',
  NOTE_NO_MEASURED_SOURCE = 'No measured source',
  NOTE_UNVERIFIED_DEVICE = 'Unverified device. The data origin does not prove this came from a watch.',
  NOTE_SEPARATE_SOURCES = 'Separate sources; no combined total.';

/** App package is provenance, NOT proof that a connected watch supplied the record. */
export function sourceName(origin: string): string {
  if (origin === 'com.android.healthconnect.phone' ||
      origin.startsWith('com.android.healthconnect.phone.')) return SOURCE_PHONE;
  if (origin === 'com.sec.android.app.shealth') return SOURCE_SAMSUNG;
  return origin.trim() || SOURCE_UNKNOWN;
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
    note: state === 'not-allowed' ? NOTE_NOT_ALLOWED :
      state === 'not-available' ? NOTE_NOT_AVAILABLE :
        permission === 'unknown' ? NOTE_PERMISSION_UNCONFIRMED : NOTE_NO_DATA };
}

/** Group a metric by contributing app. Only one-origin steps expose a single total. */
export function summarizeRecords(
  metric: MetricType, records: HealthValue[], permission: PermissionState = 'granted', available = true,
  nowMs = Date.now(),
): HealthSummary {
  if (!available || permission !== 'granted') return emptyMetricState(metric, permission, available);
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
    note: metric === 'heart-rate' ? NOTE_UNVERIFIED_DEVICE :
      sources.length > 1 ? NOTE_SEPARATE_SOURCES : '',
  };
}

/** The daily-energy gate remains NOT READY: no HC aggregate is measured Phase-2 energy. */
export function phase2EnergyMessage(permission: PermissionState, available: boolean): string {
  if (!available) return NOTE_NOT_AVAILABLE;
  if (permission === 'denied') return NOTE_NOT_ALLOWED;
  if (permission === 'unknown') return NOTE_PERMISSION_UNCONFIRMED;
  return NOTE_NO_MEASURED_SOURCE;
}

/** Daily steps that straddle midnight are clipped proportionally, not silently discarded.
 * Does not merge separate app/device origins; records retain their unique IDs.
 */
export function onlyLocalDayRecords(metric: MetricType, records: HealthValue[], start: Date, end: Date): HealthValue[] {
  if (metric !== 'steps' && metric !== 'exercise-session' && metric !== 'sleep-session') return records;
  const from = start.getTime(), until = end.getTime();
  const result: HealthValue[] = [];
  for (const record of records) {
    if (record.kind === 'aggregate') continue;
    if (metric === 'steps') {
      if (record.kind !== 'interval' || record.metric !== 'steps') continue;
      const a = Date.parse(record.start), b = Date.parse(record.end);
      if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a || !Number.isFinite(record.value)) continue;
      const overlapStart = Math.max(a, from), overlapEnd = Math.min(b, until);
      if (overlapEnd <= overlapStart) continue;
      const scaled = Math.round(record.value * (overlapEnd - overlapStart) / (b - a));
      if (scaled <= 0) continue;
      result.push({ ...record, start: new Date(overlapStart).toISOString(),
        end: new Date(overlapEnd).toISOString(), value: scaled });
      continue;
    }
    if (metric === 'exercise-session' && record.kind !== 'session') continue;
    if (metric === 'sleep-session' && record.kind !== 'sleep') continue;
    if (record.kind !== 'session' && record.kind !== 'sleep') continue;
    const a = Date.parse(record.start), b = Date.parse(record.end);
    if (Number.isFinite(a) && Number.isFinite(b) && b >= from && b <= until &&
        (metric === 'sleep-session' || a >= from)) result.push(record);
  }
  return result;
}

export type HourlySeries = { origin: string; label: string; values: number[] };
/** Per-source hourly counts; no source totals are ever stacked or silently combined. */
export function hourlyStepsBySource(records: HealthValue[], start: Date, end: Date): HourlySeries[] {
  const startMs = start.getTime(), endMs = end.getTime();
  const groups = new Map<string, number[]>();
  const seen = new Set<string>();
  for (const r of records) {
    if (r.kind !== 'interval' || r.metric !== 'steps' || !r.dataOrigin ||
        !Number.isFinite(r.value) || r.value < 0) continue;
    const id = r.adapter + ':' + r.dataOrigin + ':' + r.recordId;
    if (seen.has(id)) continue;
    seen.add(id);
    const from = Date.parse(r.start), to = Date.parse(r.end);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) continue;
    const span = Math.max(from, startMs), stop = Math.min(to, endMs);
    if (stop <= span) continue;
    const hours = groups.get(r.dataOrigin) ?? Array.from({ length: 24 }, () => 0);
    for (let hour = 0; hour < 24; hour++) {
      const bucketStart = new Date(start); bucketStart.setHours(hour, 0, 0, 0);
      const bucketEnd = new Date(bucketStart); bucketEnd.setHours(hour + 1);
      const shared = Math.max(0, Math.min(stop, bucketEnd.getTime()) - Math.max(span, bucketStart.getTime()));
      if (shared > 0) hours[hour] = (hours[hour] ?? 0) + r.value * shared / (to - from);
    }
    groups.set(r.dataOrigin, hours);
  }
  return [...groups.entries()].map(([origin, values]) => ({
    origin, label: sourceName(origin), values: values.map(Math.round),
  }));
}

export type HeartSample = { time: string; bpm: number; origin: string };
export function heartRateSamples(records: HealthValue[], start: Date, end: Date): HeartSample[] {
  const seen = new Set<string>(), out: HeartSample[] = [];
  for (const r of records) {
    if (r.kind !== 'series' || r.metric !== 'heart-rate') continue;
    for (const pt of r.points) {
      const at = Date.parse(pt.time);
      const id = r.adapter + ':' + r.dataOrigin + ':' + r.recordId + ':' + pt.time;
      if (!seen.has(id) && Number.isFinite(at) && at >= start.getTime() &&
          at <= end.getTime() && Number.isFinite(pt.value)) {
        seen.add(id);
        out.push({ time: pt.time, bpm: pt.value, origin: r.dataOrigin });
      }
    }
  }
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

export function earliestCachedRecordAt(records: HealthValue[]): string | null {
  const times = records.map(r => r.kind === 'instant' || r.kind === 'rate' ? r.time :
    r.kind === 'aggregate' ? r.windowStart : r.start).filter(t => Number.isFinite(Date.parse(t)));
  return times.length ? times.sort()[0]! : null;
}

/** Freshness labels use the record timestamp, never the time a cached row was re-read. */
export function ageLabel(timestamp: string, nowMs = Date.now(), language: AppLanguage = 'en'): string {
  const time = Date.parse(timestamp);
  if (!Number.isFinite(time)) return translate(language, 'healthOverview.timeUnknown');
  const elapsedMinutes = Math.max(0, Math.floor((nowMs - time) / 60000));
  if (elapsedMinutes < 60) return translate(language, 'healthOverview.minutesAgo', { count: elapsedMinutes });
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return translate(language, 'healthOverview.hoursAgo', { count: hours });
  return translate(language, 'healthOverview.daysAgo', { count: Math.floor(hours / 24) });
}

export function healthAvailabilityText(
  availability: 'available' | 'not-installed' | 'needs-update' | 'unsupported' | null,
  language: AppLanguage = 'en',
): string {
  switch(availability) {
    case null: return translate(language, 'healthOverview.checkingStatus');
    case 'available': return translate(language, 'healthOverview.available');
    case 'not-installed': return translate(language, 'healthOverview.missing');
    case 'needs-update': return translate(language, 'healthOverview.update');
    default: return translate(language, 'healthOverview.unsupported');
  }
}
export function canInstallHealthConnect(availability: 'available' | 'not-installed' | 'needs-update' | 'unsupported' | null): boolean {
  return availability === 'not-installed' || availability === 'needs-update';
}

/** Week charts use seven independent local-day bins, never a combined multi-origin value. */
export function dailyStepsBySource(records: HealthValue[], start: Date, end: Date): HourlySeries[] {
  const groups = new Map<string, number[]>();
  const seen = new Set<string>();
  for (const r of records) {
    if (r.kind !== 'interval' || r.metric !== 'steps' || !r.dataOrigin ||
        !Number.isFinite(r.value) || r.value < 0) continue;
    const id = r.adapter + ':' + r.dataOrigin + ':' + r.recordId;
    if (seen.has(id)) continue;
    seen.add(id);
    const from = Date.parse(r.start), to = Date.parse(r.end);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) continue;
    const bins = groups.get(r.dataOrigin) ?? Array.from({length:7},() => 0);
    for (let d=0; d<7; d++) {
      const binFrom = new Date(start); binFrom.setDate(binFrom.getDate()+d);
      const binTo = new Date(binFrom); binTo.setDate(binTo.getDate()+1);
      const shared = Math.max(0, Math.min(to,end.getTime(),binTo.getTime()) -
        Math.max(from,start.getTime(),binFrom.getTime()));
      if (shared > 0) bins[d] = (bins[d] ?? 0) + r.value * shared / (to-from);
    }
    groups.set(r.dataOrigin,bins);
  }
  return [...groups.entries()].map(([origin,values]) => ({
    origin,label:sourceName(origin),values:values.map(Math.round),
  }));
}


// Each permission state is presented as an Android-owned setting, never as device provenance.
export function historyPermissionMessage(
  status: 'granted' | 'denied' | 'unverified' | 'unavailable', language: AppLanguage = 'en',
): string {
  switch (status) {
    case 'granted': return translate(language, 'healthHistory.granted');
    case 'denied': return translate(language, 'healthHistory.denied');
    case 'unverified': return translate(language, 'healthHistory.unverified');
    case 'unavailable': return translate(language, 'healthHistory.unavailable');
  }
}

/** One local-day window with clipped intervals and heart-rate samples; never sum sources. */
export function recordsInWindow(metric: MetricType, values: HealthValue[], start: Date, end: Date): HealthValue[] {
  if (metric === 'steps') return onlyLocalDayRecords(metric, values, start, end);
  const from = start.getTime(), until = end.getTime();
  const result: HealthValue[] = [];
  for (const record of values) {
    if (record.kind === 'aggregate') continue;
    const recordMetric = record.kind === 'session' ? 'exercise-session' :
      record.kind === 'sleep' ? 'sleep-session' : record.metric;
    if (recordMetric !== metric) continue;
    if (record.kind === 'series') {
      const points = record.points.filter(point => {
        const at = Date.parse(point.time);
        return Number.isFinite(at) && at >= from && at <= until;
      });
      if (points.length) result.push({ ...record, points });
      continue;
    }
    const time = record.kind === 'instant' || record.kind === 'rate'
      ? Date.parse(record.time) : Date.parse(record.end);
    if (Number.isFinite(time) && time >= from && time <= until) result.push(record);
  }
  return result;
}

/** Today intentionally preserves yesterday's newest HR as stale instead of showing it as current. */
export function heartRateTodayStatus(
  latestAt: string, now: Date, language: AppLanguage = 'en',
): { stale: boolean; age: string } {
  const at = new Date(latestAt);
  if (!Number.isFinite(at.getTime())) return { stale: true, age: translate(language, 'healthOverview.timeUnknown') };
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (at.getTime() >= midnight && at.getTime() <= now.getTime()) {
    return { stale: false, age: ageLabel(latestAt, now.getTime(), language) };
  }
  const yesterday = new Date(midnight); yesterday.setDate(yesterday.getDate() - 1);
  const locale = language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB';
  const time = bidiIsolate(language, at.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }));
  const label = at.getTime() >= yesterday.getTime() && at.getTime() < midnight
    ? translate(language, 'healthChart.yesterdayAt', { time })
    : at.toLocaleDateString(language === 'ar' ? locale : undefined);
  return { stale: true, age: `${label} · ${ageLabel(latestAt, now.getTime(), language)}` };
}
