import {
  getSdkStatus, SdkAvailabilityStatus, initialize, getGrantedPermissions,
  requestPermission, readRecords, aggregateRecord,
} from 'react-native-health-connect';
import type { AggregateValue, HealthDataSource, HealthRecord, MetricType, PermissionState, ReadResult } from './types';
import { metricTypes } from './types';
import { normalizeHealthRecord } from './normalize';

const recordType = {
  steps: 'Steps',
  'heart-rate': 'HeartRate',
  'active-calories': 'ActiveCaloriesBurned',
  'total-calories': 'TotalCaloriesBurned',
  'basal-metabolic-rate': 'BasalMetabolicRate',
  'exercise-session': 'ExerciseSession',
  'sleep-session': 'SleepSession',
  weight: 'Weight',
  'body-fat': 'BodyFat',
  'lean-body-mass': 'LeanBodyMass',
} as const satisfies Record<MetricType, string>;

const allDenied = (): Record<MetricType, PermissionState> =>
  Object.fromEntries(metricTypes.map(type => [type, 'unknown'])) as Record<MetricType, PermissionState>;

async function enabled() {
  const available = await getSdkStatus();
  return available === SdkAvailabilityStatus.SDK_AVAILABLE && (await initialize());
}
async function getStates(types: MetricType[]): Promise<Record<MetricType, PermissionState>> {
  const states = allDenied();
  if (!(await enabled())) return states;
  const grants = await getGrantedPermissions();
  for (const metric of types) {
    states[metric] = grants.some(perm =>
      perm.accessType === 'read' && perm.recordType === recordType[metric]) ? 'granted' : 'denied';
  }
  return states;
}

export const healthConnect: HealthDataSource = {
  id: 'health-connect',
  async getAvailability() {
    try {
      const status = await getSdkStatus();
      if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
      if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs-update';
      return 'unsupported';
    } catch { return 'not-installed'; }
  },
  async getPermissionStatus(types) {
    try { return await getStates(types); }
    catch { return allDenied(); }
  },
  async requestPermissions(types) {
    try {
      if (!(await enabled())) return allDenied();
      // Only read grants, never request write/background permissions.
      await requestPermission(types.map((type) => ({ accessType: 'read' as const, recordType: recordType[type] })));
      return await getStates(types);
    } catch { return allDenied(); }
  },
  async read(metric, range): Promise<ReadResult> {
    try {
      if (!(await enabled())) return { status: 'unavailable' };
      const states = await getStates([metric]);
      if (states[metric] !== 'granted') return { status: 'permission-denied' };
      const records: HealthRecord[] = [];
      const seen = new Set<string>();
      let pageToken: string | undefined;
      // A truncated response must never masquerade as complete Samsung Health coverage.
      for (let page = 0; page < 100; page++) {
        const rows = await readRecords(recordType[metric], {
          timeRangeFilter: { operator: 'between', startTime: range.start.toISOString(), endTime: range.end.toISOString() },
          pageSize: 1000,
          ...(pageToken ? { pageToken } : {}),
        });
        for (const raw of rows.records) {
          const normalized = normalizeHealthRecord(metric, raw);
          if (normalized) records.push(normalized);
        }
        if (!rows.pageToken) return records.length ? { status: 'ok', records } : { status: 'empty' };
        if (seen.has(rows.pageToken)) {
          return { status: 'error', code: 'pagination-loop', message: 'Health Connect repeated a page token; import aborted.' };
        }
        seen.add(rows.pageToken);
        pageToken = rows.pageToken;
      }
      return { status: 'error', code: 'pagination-limit', message: 'Health Connect exceeded 100 pages; import aborted.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (/permission|security|access denied/i.test(message)) return { status: 'permission-denied' };
      return { status: 'error', code: 'health-read-failed', message: 'Health Connect read failed.' };
    }
  },
};

// Separate permission: history is NOT implicitly granted with the metric reads.
// Upstream issue #276 reports that special history grants are not reliably returned.
export async function requestHistoryReadPermission(): Promise<'granted' | 'denied' | 'unverified' | 'unavailable'> {
  try {
    if (!(await enabled())) return 'unavailable';
    const special = { accessType: 'read', recordType: 'ReadHealthDataHistory' };
    const grants = await requestPermission([special] as Parameters<typeof requestPermission>[0]);
    if (grants.some(p => p.recordType === 'ReadHealthDataHistory')) return 'granted';
    // An empty result is NOT reliable proof of denial; verify in Android settings.
    return 'unverified';
  } catch { return 'unverified'; }
}

/**
 * Health Connect aggregate totals describe their query window, NOT necessarily complete daily
 * expenditure. Samsung Health may only contribute exercise intervals to these aggregates.
 */
export const energyMetrics = ['active-calories', 'total-calories', 'basal-metabolic-rate'] as const;
export type EnergyMetric = typeof energyMetrics[number];
export type DailyEnergyRow =
  | { metric: EnergyMetric; date: string; status: 'ok'; value: AggregateValue }
  | { metric: EnergyMetric; date: string; status: 'empty' | 'unavailable' | 'permission-denied' | 'error'; message?: string };

/** Convert a documented energy aggregate. Missing metric values are NOT zero calories. */
export function normalizeEnergyAggregate(
  metric: EnergyMetric, raw: unknown, windowStart: string, windowEnd: string,
): AggregateValue | null {
  const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const operation = metric === 'active-calories'
    ? 'ACTIVE_CALORIES_TOTAL' : metric === 'total-calories' ? 'ENERGY_TOTAL' : 'BASAL_CALORIES_TOTAL';
  const value = record[operation];
  const kilocalories = value && typeof value === 'object'
    ? (value as { inKilocalories?: unknown }).inKilocalories : undefined;
  if (typeof kilocalories !== 'number' || !Number.isFinite(kilocalories) || kilocalories < 0) return null;
  const dataOrigins = Array.isArray(record.dataOrigins)
    ? record.dataOrigins.filter((x): x is string => typeof x === 'string') : [];
  return {
    kind: 'aggregate', metric, adapter: 'health-connect', operation,
    windowStart, windowEnd, value: kilocalories, unit: 'kcal',
    ...(dataOrigins.length === 1 ? { dataOrigin: dataOrigins[0] } : {}),
    dataOrigins,
  };
}

/** Last seven LOCAL calendar days including today's partial day; no arithmetic across metric types. */
export async function readDailyEnergy(days = 7): Promise<DailyEnergyRow[]> {
  const result: DailyEnergyRow[] = [];
  const today = new Date();
  const status = await healthConnect.getAvailability();
  const granted = status === 'available'
    ? await healthConnect.getPermissionStatus([...energyMetrics]) : null;
  const count = Math.max(1, Math.min(Math.floor(days), 30));
  for (let index = count - 1; index >= 0; index--) {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - index);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - index + 1);
    const date = [start.getFullYear(), String(start.getMonth() + 1).padStart(2, '0'), String(start.getDate()).padStart(2, '0')].join('-');
    for (const metric of energyMetrics) {
      if (!granted) { result.push({ metric, date, status: 'unavailable' }); continue; }
      if (granted[metric] !== 'granted') {
        result.push({ metric, date, status: 'permission-denied' });
        continue;
      }
      const timeRangeFilter = { operator: 'between' as const, startTime: start.toISOString(), endTime: end.toISOString() };
      try {
        let raw: unknown;
        if (metric === 'active-calories') raw = await aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter });
        else if (metric === 'total-calories') raw = await aggregateRecord({ recordType: 'TotalCaloriesBurned', timeRangeFilter });
        else raw = await aggregateRecord({ recordType: 'BasalMetabolicRate', timeRangeFilter });
        const value = normalizeEnergyAggregate(metric, raw, timeRangeFilter.startTime, timeRangeFilter.endTime);
        result.push(value ? { metric, date, status: 'ok', value } : { metric, date, status: 'empty' });
      } catch {
        result.push({ metric, date, status: 'error', message: 'Health Connect daily aggregate failed.' });
      }
    }
  }
  return result;
}
