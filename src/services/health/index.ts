import {
  getSdkStatus, SdkAvailabilityStatus, initialize, getGrantedPermissions,
  requestPermission, readRecords,
} from 'react-native-health-connect';
import type { HealthDataSource, MetricType, PermissionState, ReadResult } from './types';
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
      const rows = await readRecords(recordType[metric], {
        timeRangeFilter: { operator: 'between', startTime: range.start.toISOString(), endTime: range.end.toISOString() },
        pageSize: 1000,
      });
      const records = rows.records.map((raw: unknown) => normalizeHealthRecord(metric, raw)).filter(
        (value): value is NonNullable<typeof value> => value !== null);
      // Explicitly do not aggregate/merge overlapping records or extrapolate to daily totals.
      return records.length ? { status: 'ok', records } : { status: 'empty' };
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
