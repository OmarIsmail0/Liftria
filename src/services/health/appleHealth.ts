/** Read-only Apple Health adapter. Android must not import this file: it loads
 * @kingstinct/react-native-healthkit, which is iOS-only. Nothing here writes samples,
 * requests sharing permission, or enables background delivery.
 *
 * HealthKit does not tell an app whether read access was denied, so permission
 * stays 'unknown'. Daily totals come from HKStatistics (cumulativeSum), which
 * deduplicates iPhone and Watch samples. A missing total is empty, never 0.
 */
import {
  getRequestStatusForAuthorization,
  isHealthDataAvailableAsync,
  queryCategorySamples,
  queryQuantitySamples,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
  WorkoutActivityType,
  WorkoutTypeIdentifier,
} from '@kingstinct/react-native-healthkit';
import type { ObjectTypeIdentifier, QueryStatisticsResponse } from '@kingstinct/react-native-healthkit';
import type {
  AggregateValue, DailyEnergyRow, EnergyMetric, HealthDataSource, HealthRecord,
  MetricType, PermissionState, ReadResult, SourceMeta,
} from './types';
import { APPLE_NOT_REQUESTED, energyMetrics, metricTypes } from './types';

const sleepStageName: Record<number, string> = {
  // CategoryValueSleepAnalysis. asleep and asleepUnspecified are both 1; use the current name.
  0: 'inBed',
  1: 'asleepUnspecified',
  2: 'awake',
  3: 'asleepCore',
  4: 'asleepDeep',
  5: 'asleepREM',
};

type CumulativeMetric = 'steps' | 'active-calories' | 'basal-metabolic-rate';
type SampleMetric = 'heart-rate' | 'exercise-session' | 'sleep-session' | 'weight' | 'body-fat' | 'lean-body-mass';

type StatRead =
  | { status: 'ok'; value: AggregateValue }
  | { status: 'empty' }
  | { status: 'error'; code: string; message: string };

function unknownPermissions(): Record<MetricType, PermissionState> {
  return Object.fromEntries(metricTypes.map(metric => [metric, 'unknown'])) as Record<MetricType, PermissionState>;
}

function readError(err: unknown): { status: 'error'; code: string; message: string } {
  if (err instanceof Error) {
    const code = 'code' in err && typeof err.code === 'string' && err.code.length > 0
      ? err.code : 'apple-health-read-failed';
    return { status: 'error', code, message: err.message || 'Apple Health read failed.' };
  }
  if (err && typeof err === 'object') {
    const record = err as { code?: unknown; message?: unknown };
    const code = typeof record.code === 'string' && record.code.length > 0
      ? record.code : 'apple-health-read-failed';
    const message = typeof record.message === 'string' && record.message.length > 0
      ? record.message : 'Apple Health read failed.';
    return { status: 'error', code, message };
  }
  return { status: 'error', code: 'apple-health-read-failed', message: 'Apple Health read failed.' };
}

function codedError(code: string, message: string): Error {
  const error = new Error(message) as Error & { code?: string };
  error.code = code;
  return error;
}

async function healthKitAvailable(): Promise<boolean> {
  try {
    return await isHealthDataAvailableAsync();
  } catch {
    return false;
  }
}

function readIdentifiers(types: readonly MetricType[]): ObjectTypeIdentifier[] {
  const identifiers: ObjectTypeIdentifier[] = [];
  for (const metric of types) {
    switch (metric) {
      case 'steps': identifiers.push('HKQuantityTypeIdentifierStepCount'); break;
      case 'heart-rate': identifiers.push('HKQuantityTypeIdentifierHeartRate'); break;
      case 'active-calories': identifiers.push('HKQuantityTypeIdentifierActiveEnergyBurned'); break;
      case 'basal-metabolic-rate': identifiers.push('HKQuantityTypeIdentifierBasalEnergyBurned'); break;
      case 'exercise-session': identifiers.push(WorkoutTypeIdentifier); break;
      case 'sleep-session': identifiers.push('HKCategoryTypeIdentifierSleepAnalysis'); break;
      case 'weight': identifiers.push('HKQuantityTypeIdentifierBodyMass'); break;
      case 'body-fat': identifiers.push('HKQuantityTypeIdentifierBodyFatPercentage'); break;
      case 'lean-body-mass': identifiers.push('HKQuantityTypeIdentifierLeanBodyMass'); break;
      case 'total-calories': break;
      default: {
        const neverMetric: never = metric;
        void neverMetric;
      }
    }
  }
  return identifiers;
}

/** AuthorizationRequestStatus.shouldRequest: the read prompt has never been shown.
 * HealthKit then fails every query, which is not a read error. */
const SHOULD_REQUEST = 1;

async function readNotRequested(metric: MetricType): Promise<boolean> {
  const toRead = readIdentifiers([metric]);
  if (toRead.length === 0) return false;
  try {
    return (await getRequestStatusForAuthorization({ toRead })) === SHOULD_REQUEST;
  } catch {
    return false;
  }
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function iso(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  }
  if (typeof value === 'string' && Number.isFinite(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return null;
}

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function deviceFrom(device: unknown): SourceMeta['device'] | undefined {
  if (!device || typeof device !== 'object') return undefined;
  const raw = device as { manufacturer?: unknown; model?: unknown; name?: unknown };
  const manufacturer = text(raw.manufacturer);
  const model = text(raw.model);
  const type = text(raw.name);
  if (!manufacturer && !model && !type) return undefined;
  return {
    ...(manufacturer ? { manufacturer } : {}),
    ...(model ? { model } : {}),
    ...(type ? { type } : {}),
  };
}

function sourceMeta(sample: {
  uuid?: unknown;
  sourceRevision?: { source?: { bundleIdentifier?: unknown } };
  device?: unknown;
}): SourceMeta | null {
  const recordId = text(sample.uuid);
  const dataOrigin = text(sample.sourceRevision?.source?.bundleIdentifier);
  if (!recordId || !dataOrigin) return null;
  const device = deviceFrom(sample.device);
  return { adapter: 'apple-health', recordId, dataOrigin, ...(device ? { device } : {}) };
}

function zoneOffset(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  return text((metadata as { HKTimeZone?: unknown }).HKTimeZone);
}

function expectedUnit(metric: CumulativeMetric): 'count' | 'kcal' {
  return metric === 'steps' ? 'count' : 'kcal';
}

/** A positive deduplicated total. Zero and a missing sum are empty, not a 0 record. */
export function interpretAppleStatistics(
  metric: CumulativeMetric, raw: unknown, windowStart: string, windowEnd: string,
): StatRead {
  if (!raw || typeof raw !== 'object' || !('sumQuantity' in raw) || raw.sumQuantity == null) {
    return { status: 'empty' };
  }
  const sum = raw.sumQuantity;
  if (typeof sum !== 'object') {
    return { status: 'error', code: 'invalid-quantity', message: 'Apple Health statistics sum was not a quantity.' };
  }
  const quantity = finite((sum as { quantity?: unknown }).quantity);
  const unit = (sum as { unit?: unknown }).unit;
  if (quantity === undefined) {
    return { status: 'error', code: 'invalid-quantity', message: 'Apple Health statistics sum was not a finite number.' };
  }
  if (unit !== expectedUnit(metric)) {
    return { status: 'error', code: 'unit-mismatch', message: 'Apple Health statistics unit did not match the requested unit.' };
  }
  if (quantity < 0) {
    return { status: 'error', code: 'invalid-quantity', message: 'Apple Health statistics sum was negative.' };
  }
  if (quantity === 0) return { status: 'empty' };
  const sources = 'sources' in raw && Array.isArray(raw.sources) ? raw.sources : [];
  const dataOrigins = sources.flatMap(source => {
    if (!source || typeof source !== 'object') return [];
    const bundle = text((source as { bundleIdentifier?: unknown }).bundleIdentifier);
    return bundle ? [bundle] : [];
  });
  const only = dataOrigins.length === 1 ? dataOrigins[0] : undefined;
  return {
    status: 'ok',
    value: {
      kind: 'aggregate', metric, adapter: 'apple-health', operation: 'cumulativeSum',
      windowStart, windowEnd, value: quantity, unit: expectedUnit(metric),
      ...(only ? { dataOrigin: only } : {}),
      dataOrigins,
    },
  };
}

export function normalizeAppleEnergyAggregate(
  metric: EnergyMetric, raw: unknown, windowStart: string, windowEnd: string,
): AggregateValue | null {
  // DietaryEnergyConsumed is food intake, not expenditure. HealthKit has no total-burned type.
  if (metric === 'total-calories') return null;
  const interpreted = interpretAppleStatistics(metric, raw, windowStart, windowEnd);
  return interpreted.status === 'ok' ? interpreted.value : null;
}

function bpm(unit: unknown, quantity: unknown): number | null {
  const value = finite(quantity);
  if (value === undefined || value <= 0) return null;
  if (unit === 'count/min') return value;
  if (unit === 'count/s') return value * 60;
  return null;
}

function kilograms(unit: unknown, quantity: unknown): number | null {
  const value = finite(quantity);
  if (value === undefined || value <= 0) return null;
  if (unit === 'kg') return value;
  if (unit === 'g') return value / 1000;
  return null;
}

function kilocalories(unit: unknown, quantity: unknown): number | null {
  const value = finite(quantity);
  if (value === undefined || value < 0) return null;
  return unit === 'kcal' ? value : null;
}

function bodyFatPercent(unit: unknown, quantity: unknown): number | null {
  const value = finite(quantity);
  // HealthKit's percent unit (HKUnit.percent(), which the library uses for '%') is a
  // fraction: 0.175 means 17.5 %. Liftria stores body fat on a 0–100 scale.
  if (value === undefined || value < 0 || value > 1) return null;
  return unit === '%' ? Math.round(value * 1000) / 10 : null;
}

function exerciseName(activity: unknown): string | null {
  if (typeof activity === 'string' && activity.length > 0) return activity;
  if (typeof activity === 'number' && Number.isInteger(activity)) {
    const table = WorkoutActivityType as unknown as Record<number, string | undefined>;
    const name = table[activity];
    return typeof name === 'string' ? name : String(activity);
  }
  return null;
}

function durationSeconds(
  duration: { quantity?: unknown; unit?: unknown } | undefined, start: string, end: string,
): number | null {
  const quantity = finite(duration?.quantity);
  if (quantity !== undefined && quantity >= 0) {
    if (duration?.unit === 's') return quantity;
    if (duration?.unit === 'min') return quantity * 60;
    if (duration?.unit === 'hr') return quantity * 3600;
  }
  const seconds = (Date.parse(end) - Date.parse(start)) / 1000;
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return seconds;
}

function sleepStage(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return sleepStageName[value] ?? String(value);
  return text(value);
}

/** Maps one HealthKit sample. Basal energy and total calories are not sample records:
 * basal daily energy is a statistics aggregate, and HealthKit has no total-burned type. */
export function normalizeAppleSample(metric: MetricType, input: unknown): HealthRecord | null {
  if (!input || typeof input !== 'object') return null;
  const sample = input as {
    uuid?: unknown;
    sourceRevision?: { source?: { bundleIdentifier?: unknown } };
    device?: unknown;
    startDate?: unknown;
    endDate?: unknown;
    quantity?: unknown;
    unit?: unknown;
    metadata?: unknown;
    workoutActivityType?: unknown;
    duration?: { quantity?: unknown; unit?: unknown };
    value?: unknown;
  };
  const meta = sourceMeta(sample);
  if (!meta) return null;
  const start = iso(sample.startDate);
  const end = iso(sample.endDate);
  const zone = zoneOffset(sample.metadata);
  switch (metric) {
    case 'steps': {
      const value = sample.unit === 'count' ? finite(sample.quantity) : undefined;
      if (!start || !end || value === undefined || value <= 0) return null;
      return { ...meta, kind: 'interval', metric, start, end, value, unit: 'count' };
    }
    case 'active-calories': {
      const value = kilocalories(sample.unit, sample.quantity);
      if (!start || !end || value === null || value <= 0) return null;
      return { ...meta, kind: 'interval', metric, start, end, value, unit: 'kcal' };
    }
    case 'heart-rate': {
      const value = bpm(sample.unit, sample.quantity);
      if (!start || !end || value === null) return null;
      return { ...meta, kind: 'series', metric, start, end, points: [{ time: start, value }], unit: 'bpm' };
    }
    case 'weight':
    case 'lean-body-mass': {
      const time = start ?? end;
      const value = kilograms(sample.unit, sample.quantity);
      if (!time || value === null) return null;
      return {
        ...meta, kind: 'instant', metric, time, ...(zone ? { zoneOffset: zone } : {}),
        value, unit: 'kg',
      };
    }
    case 'body-fat': {
      const time = start ?? end;
      const value = bodyFatPercent(sample.unit, sample.quantity);
      if (!time || value === null) return null;
      return {
        ...meta, kind: 'instant', metric, time, ...(zone ? { zoneOffset: zone } : {}),
        value, unit: '%',
      };
    }
    case 'exercise-session': {
      if (!start || !end) return null;
      const exerciseType = exerciseName(sample.workoutActivityType);
      const durationSec = durationSeconds(sample.duration, start, end);
      if (!exerciseType || durationSec === null) return null;
      const title = sample.metadata && typeof sample.metadata === 'object'
        ? text((sample.metadata as { HKWorkoutBrandName?: unknown }).HKWorkoutBrandName) : undefined;
      return { ...meta, kind: 'session', start, end, exerciseType, ...(title ? { title } : {}), durationSec };
    }
    case 'sleep-session': {
      if (!start || !end) return null;
      const stage = sleepStage(sample.value);
      return {
        ...meta, kind: 'sleep', start, end,
        ...(stage ? { stages: [{ stage, start, end }] } : {}),
      };
    }
    case 'basal-metabolic-rate':
    case 'total-calories':
      return null;
    default: {
      const neverMetric: never = metric;
      void neverMetric;
      return null;
    }
  }
}

function dateFilter(range: { start: Date; end: Date }) {
  return { date: { startDate: range.start, endDate: range.end } };
}

async function queryCumulativeSum(
  metric: CumulativeMetric, range: { start: Date; end: Date },
): Promise<QueryStatisticsResponse> {
  const filter = dateFilter(range);
  if (metric === 'steps') {
    return queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], { unit: 'count', filter });
  }
  if (metric === 'active-calories') {
    return queryStatisticsForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], { unit: 'kcal', filter });
  }
  return queryStatisticsForQuantity('HKQuantityTypeIdentifierBasalEnergyBurned', ['cumulativeSum'], { unit: 'kcal', filter });
}

async function mappedSamples(metric: SampleMetric, range: { start: Date; end: Date }): Promise<HealthRecord[]> {
  const filter = dateFilter(range);
  const limit = 0;
  let samples: readonly unknown[];
  if (metric === 'heart-rate') {
    samples = await queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', { limit, ascending: true, unit: 'count/min', filter });
  } else if (metric === 'weight') {
    samples = await queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', { limit, ascending: true, unit: 'kg', filter });
  } else if (metric === 'body-fat') {
    samples = await queryQuantitySamples('HKQuantityTypeIdentifierBodyFatPercentage', { limit, ascending: true, unit: '%', filter });
  } else if (metric === 'lean-body-mass') {
    samples = await queryQuantitySamples('HKQuantityTypeIdentifierLeanBodyMass', { limit, ascending: true, unit: 'kg', filter });
  } else if (metric === 'sleep-session') {
    samples = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', { limit, ascending: true, filter });
  } else {
    samples = await queryWorkoutSamples({ limit, ascending: true, filter });
  }
  const records: HealthRecord[] = [];
  let dropped = 0;
  for (const sample of samples) {
    const normalized = normalizeAppleSample(metric, sample);
    if (normalized) records.push(normalized);
    else dropped += 1;
  }
  if (!records.length && dropped > 0) {
    throw codedError('unreadable-sample', 'Apple Health returned samples that could not be mapped.');
  }
  return records;
}

export const appleHealth: HealthDataSource = {
  id: 'apple-health',
  async getAvailability() {
    return (await healthKitAvailable()) ? 'available' : 'unsupported';
  },
  async getPermissionStatus(types) {
    const states = unknownPermissions();
    // authorizationStatusFor reports sharing (write) status, not read access.
    for (const metric of types) states[metric] = 'unknown';
    return states;
  },
  async requestPermissions(types) {
    try {
      if (await healthKitAvailable()) {
        const toRead = readIdentifiers(types);
        // Read access only. Omitting toShare does not ask HealthKit for write permission.
        if (toRead.length > 0) await requestAuthorization({ toRead });
      }
    } catch {
      // The prompt failing still does not reveal whether read access was denied.
    }
    const states = unknownPermissions();
    for (const metric of types) states[metric] = 'unknown';
    return states;
  },
  async read(metric, range): Promise<ReadResult> {
    if (metric === 'total-calories') return { status: 'unsupported' };
    try {
      if (!(await healthKitAvailable())) return { status: 'unavailable' };
      if (await readNotRequested(metric)) {
        return { status: 'error', code: APPLE_NOT_REQUESTED, message: 'Apple Health read access has not been requested yet.' };
      }
      const windowStart = range.start.toISOString();
      const windowEnd = range.end.toISOString();
      if (metric === 'steps' || metric === 'active-calories' || metric === 'basal-metabolic-rate') {
        const stats = await queryCumulativeSum(metric, range);
        const interpreted = interpretAppleStatistics(metric, stats, windowStart, windowEnd);
        if (interpreted.status === 'empty') return { status: 'empty' };
        if (interpreted.status === 'error') return interpreted;
        return { status: 'ok', records: [interpreted.value] };
      }
      const records = await mappedSamples(metric, range);
      return records.length ? { status: 'ok', records } : { status: 'empty' };
    } catch (err: unknown) {
      return readError(err);
    }
  },
};

/** Local days, including today's partial day. Totals are statistics, never summed samples. */
export async function readAppleDailyEnergy(days = 7): Promise<DailyEnergyRow[]> {
  if (!(await healthKitAvailable())) return [];
  const result: DailyEnergyRow[] = [];
  const today = new Date();
  const count = Math.max(1, Math.min(Math.floor(days), 30));
  // Before the read prompt every query fails; that is no data yet, not a read error.
  const notRequested = new Set<EnergyMetric>();
  for (const metric of energyMetrics) {
    if (metric !== 'total-calories' && await readNotRequested(metric)) notRequested.add(metric);
  }
  for (let index = count - 1; index >= 0; index -= 1) {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - index);
    const end = index === 0 ? today : new Date(today.getFullYear(), today.getMonth(), today.getDate() - index + 1);
    const date = [start.getFullYear(), String(start.getMonth() + 1).padStart(2, '0'), String(start.getDate()).padStart(2, '0')].join('-');
    for (const metric of energyMetrics) {
      if (metric === 'total-calories') {
        result.push({
          metric, date, status: 'unavailable',
          message: 'Apple Health has no total-calories type.',
        });
        continue;
      }
      if (notRequested.has(metric)) {
        result.push({ metric, date, status: 'empty', message: APPLE_NOT_REQUESTED });
        continue;
      }
      try {
        const interpreted = interpretAppleStatistics(
          metric, await queryCumulativeSum(metric, { start, end }), start.toISOString(), end.toISOString(),
        );
        if (interpreted.status === 'ok') {
          const origins = interpreted.value.dataOrigins ?? [];
          result.push({ metric, date, status: origins.length ? 'ok' : 'no-source', value: interpreted.value });
        } else if (interpreted.status === 'empty') {
          result.push({ metric, date, status: 'empty' });
        } else {
          result.push({ metric, date, status: 'error', message: interpreted.message });
        }
      } catch (err: unknown) {
        result.push({ metric, date, status: 'error', message: readError(err).message });
      }
    }
  }
  return result;
}
