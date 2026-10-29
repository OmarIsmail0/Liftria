import * as HK from '@kingstinct/react-native-healthkit';
import {
  appleHealth, interpretAppleStatistics, normalizeAppleSample, readAppleDailyEnergy,
} from '../appleHealth';
import { metricTypes } from '../types';

jest.mock('@kingstinct/react-native-healthkit', () => ({
  isHealthDataAvailableAsync: jest.fn(async () => true),
  requestAuthorization: jest.fn(async () => true),
  queryQuantitySamples: jest.fn(async () => []),
  queryCategorySamples: jest.fn(async () => []),
  queryWorkoutSamples: jest.fn(async () => []),
  queryStatisticsForQuantity: jest.fn(async () => ({ sources: [] })),
  WorkoutTypeIdentifier: 'HKWorkoutTypeIdentifier',
  WorkoutActivityType: { running: 37, 37: 'running' },
}));

const range = { start: new Date('2026-10-20T00:00:00Z'), end: new Date('2026-10-21T00:00:00Z') };

function sample(uuid: string, extra: Record<string, unknown>) {
  return {
    uuid,
    sourceRevision: { source: { bundleIdentifier: 'com.apple.Health' } },
    device: { manufacturer: 'Apple Inc.', model: 'Watch', name: 'Apple Watch' },
    startDate: new Date('2026-10-20T08:00:00Z'),
    endDate: new Date('2026-10-20T09:00:00Z'),
    metadata: { HKTimeZone: 'Africa/Cairo' },
    ...extra,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (HK.isHealthDataAvailableAsync as jest.Mock).mockResolvedValue(true);
  (HK.requestAuthorization as jest.Mock).mockResolvedValue(true);
  (HK.queryQuantitySamples as jest.Mock).mockResolvedValue([]);
  (HK.queryCategorySamples as jest.Mock).mockResolvedValue([]);
  (HK.queryWorkoutSamples as jest.Mock).mockResolvedValue([]);
  (HK.queryStatisticsForQuantity as jest.Mock).mockResolvedValue({ sources: [] });
});

test('maps recorded samples to shared records, ids and units', () => {
  const device = { manufacturer: 'Apple Inc.', model: 'Watch', type: 'Apple Watch' };
  expect(normalizeAppleSample('steps', sample('step-1', { quantity: 120, unit: 'count' }))).toMatchObject({
    kind: 'interval', metric: 'steps', adapter: 'apple-health', recordId: 'step-1',
    dataOrigin: 'com.apple.Health', device, value: 120, unit: 'count',
    start: '2026-10-20T08:00:00.000Z', end: '2026-10-20T09:00:00.000Z',
  });
  expect(normalizeAppleSample('heart-rate', sample('hr-1', { quantity: 72, unit: 'count/min' }))).toMatchObject({
    kind: 'series', unit: 'bpm', recordId: 'hr-1', points: [{ time: '2026-10-20T08:00:00.000Z', value: 72 }],
  });
  expect(normalizeAppleSample('heart-rate', sample('hr-s', { quantity: 1.5, unit: 'count/s' }))).toMatchObject({
    unit: 'bpm', points: [{ value: 90 }],
  });
  expect(normalizeAppleSample('active-calories', sample('kcal-1', { quantity: 40, unit: 'kcal' }))).toMatchObject({
    kind: 'interval', unit: 'kcal', value: 40, recordId: 'kcal-1',
  });
  expect(normalizeAppleSample('weight', sample('kg-1', { quantity: 70.2, unit: 'kg' }))).toMatchObject({
    kind: 'instant', unit: 'kg', value: 70.2, zoneOffset: 'Africa/Cairo', device,
  });
  expect(normalizeAppleSample('weight', sample('g-1', { quantity: 70200, unit: 'g' }))).toMatchObject({
    unit: 'kg', value: 70.2,
  });
  expect(normalizeAppleSample('body-fat', sample('fat-1', { quantity: 17.5, unit: '%' }))).toMatchObject({
    kind: 'instant', unit: '%', value: 17.5, recordId: 'fat-1',
  });
  expect(normalizeAppleSample('lean-body-mass', sample('lean-1', { quantity: 55, unit: 'kg' }))).toMatchObject({
    kind: 'instant', unit: 'kg', value: 55, recordId: 'lean-1',
  });
  expect(normalizeAppleSample('sleep-session', sample('sleep-1', { value: 4 }))).toMatchObject({
    kind: 'sleep', recordId: 'sleep-1', dataOrigin: 'com.apple.Health',
    stages: [{ stage: 'asleepDeep', start: '2026-10-20T08:00:00.000Z', end: '2026-10-20T09:00:00.000Z' }],
  });
  expect(normalizeAppleSample('exercise-session', sample('run-1', {
    workoutActivityType: 37, duration: { quantity: 1800, unit: 's' },
    metadata: { HKWorkoutBrandName: 'Morning Run' },
  }))).toMatchObject({
    kind: 'session', recordId: 'run-1', exerciseType: 'running', durationSec: 1800, title: 'Morning Run', device,
  });
  expect(normalizeAppleSample('basal-metabolic-rate', sample('bmr-1', { quantity: 1400, unit: 'kcal' }))).toBeNull();
  expect(normalizeAppleSample('total-calories', sample('total-1', { quantity: 2000, unit: 'kcal' }))).toBeNull();
  expect(normalizeAppleSample('steps', { ...sample('x', { quantity: 12, unit: 'count' }), uuid: '' })).toBeNull();
});

test('read permission stays unknown after a request and never asks to write', async () => {
  const before = await appleHealth.getPermissionStatus([...metricTypes]);
  expect(Object.values(before)).toEqual(metricTypes.map(() => 'unknown'));
  expect(HK.requestAuthorization).not.toHaveBeenCalled();
  const after = await appleHealth.requestPermissions([...metricTypes]);
  expect(Object.values(after)).toEqual(metricTypes.map(() => 'unknown'));
  expect(after.steps).not.toBe('granted');
  expect(HK.requestAuthorization).toHaveBeenCalledTimes(1);
  const request = (HK.requestAuthorization as jest.Mock).mock.calls[0][0] as { toRead?: string[]; toShare?: unknown };
  expect(request.toShare).toBeUndefined();
  expect(request.toRead).toEqual([
    'HKQuantityTypeIdentifierStepCount',
    'HKQuantityTypeIdentifierHeartRate',
    'HKQuantityTypeIdentifierActiveEnergyBurned',
    'HKQuantityTypeIdentifierBasalEnergyBurned',
    'HKWorkoutTypeIdentifier',
    'HKCategoryTypeIdentifierSleepAnalysis',
    'HKQuantityTypeIdentifierBodyMass',
    'HKQuantityTypeIdentifierBodyFatPercentage',
    'HKQuantityTypeIdentifierLeanBodyMass',
  ]);
});

test('empty statistics and empty samples are empty, never zero', async () => {
  expect(await appleHealth.read('steps', range)).toEqual({ status: 'empty' });
  (HK.queryStatisticsForQuantity as jest.Mock).mockResolvedValue({
    sumQuantity: { quantity: 0, unit: 'count' }, sources: [],
  });
  expect(await appleHealth.read('steps', range)).toEqual({ status: 'empty' });
  expect(await appleHealth.read('heart-rate', range)).toEqual({ status: 'empty' });
  expect(await appleHealth.read('total-calories', range)).toEqual({ status: 'unsupported' });
});

test('a thrown HealthKit error is returned with its code and message', async () => {
  const err = new Error('store locked') as Error & { code?: string };
  err.code = 'hk-locked';
  (HK.queryQuantitySamples as jest.Mock).mockRejectedValue(err);
  expect(await appleHealth.read('heart-rate', range)).toEqual({
    status: 'error', code: 'hk-locked', message: 'store locked',
  });
});

test('daily totals are deduplicated statistics, not summed samples', async () => {
  (HK.queryQuantitySamples as jest.Mock).mockResolvedValue([
    sample('phone-steps', { quantity: 5000, unit: 'count' }),
    sample('watch-steps', { quantity: 5000, unit: 'count' }),
  ]);
  (HK.queryStatisticsForQuantity as jest.Mock).mockResolvedValue({
    sumQuantity: { quantity: 6200, unit: 'count' },
    sources: [
      { bundleIdentifier: 'com.apple.health' },
      { bundleIdentifier: 'com.apple.Health' },
    ],
  });
  const steps = await appleHealth.read('steps', range);
  expect(HK.queryStatisticsForQuantity).toHaveBeenCalledWith(
    'HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], expect.objectContaining({ unit: 'count' }),
  );
  expect(HK.queryQuantitySamples).not.toHaveBeenCalled();
  expect(steps).toMatchObject({
    status: 'ok',
    records: [{
      kind: 'aggregate', metric: 'steps', adapter: 'apple-health', operation: 'cumulativeSum',
      value: 6200, unit: 'count', dataOrigins: ['com.apple.health', 'com.apple.Health'],
    }],
  });
  if (steps.status === 'ok' && steps.records[0]?.kind === 'aggregate') {
    expect(steps.records[0].dataOrigin).toBeUndefined();
    expect(steps.records[0].value).not.toBe(10000);
  }

  (HK.queryStatisticsForQuantity as jest.Mock).mockImplementation(async (identifier: string) => {
    if (identifier === 'HKQuantityTypeIdentifierActiveEnergyBurned') {
      return {
        sumQuantity: { quantity: 220, unit: 'kcal' },
        sources: [{ bundleIdentifier: 'com.apple.health' }],
      };
    }
    if (identifier === 'HKQuantityTypeIdentifierBasalEnergyBurned') {
      return { sumQuantity: { quantity: 1400, unit: 'kcal' }, sources: [{ bundleIdentifier: 'com.apple.health' }] };
    }
    return { sources: [] };
  });
  const active = await appleHealth.read('active-calories', range);
  const basal = await appleHealth.read('basal-metabolic-rate', range);
  expect(active).toMatchObject({
    status: 'ok',
    records: [{ kind: 'aggregate', adapter: 'apple-health', unit: 'kcal', value: 220, dataOrigin: 'com.apple.health' }],
  });
  expect(basal).toMatchObject({
    status: 'ok',
    records: [{ kind: 'aggregate', metric: 'basal-metabolic-rate', unit: 'kcal', value: 1400 }],
  });
  expect(interpretAppleStatistics('active-calories', { ACTIVE_CALORIES_TOTAL: { inKilocalories: 999 } }, 'a', 'b'))
    .toEqual({ status: 'empty' });
});

test('sample reads keep the recorded uuid, origin, device and unit', async () => {
  (HK.queryQuantitySamples as jest.Mock).mockImplementation(async (identifier: string) => {
    if (identifier === 'HKQuantityTypeIdentifierHeartRate') return [sample('hr-1', { quantity: 72, unit: 'count/min' })];
    if (identifier === 'HKQuantityTypeIdentifierBodyMass') return [sample('kg-1', { quantity: 70.2, unit: 'kg' })];
    if (identifier === 'HKQuantityTypeIdentifierBodyFatPercentage') return [sample('fat-1', { quantity: 17.5, unit: '%' })];
    if (identifier === 'HKQuantityTypeIdentifierLeanBodyMass') return [sample('lean-1', { quantity: 55, unit: 'kg' })];
    return [];
  });
  (HK.queryCategorySamples as jest.Mock).mockResolvedValue([sample('sleep-1', { value: 3 })]);
  (HK.queryWorkoutSamples as jest.Mock).mockResolvedValue([sample('run-1', {
    workoutActivityType: 37, duration: { quantity: 30, unit: 'min' },
  })]);

  const heart = await appleHealth.read('heart-rate', range);
  const weight = await appleHealth.read('weight', range);
  const fat = await appleHealth.read('body-fat', range);
  const lean = await appleHealth.read('lean-body-mass', range);
  const sleep = await appleHealth.read('sleep-session', range);
  const workout = await appleHealth.read('exercise-session', range);
  expect(heart).toMatchObject({ status: 'ok', records: [{ recordId: 'hr-1', unit: 'bpm', dataOrigin: 'com.apple.Health' }] });
  expect(weight).toMatchObject({ status: 'ok', records: [{ recordId: 'kg-1', unit: 'kg', value: 70.2 }] });
  expect(fat).toMatchObject({ status: 'ok', records: [{ recordId: 'fat-1', unit: '%', value: 17.5 }] });
  expect(lean).toMatchObject({ status: 'ok', records: [{ recordId: 'lean-1', unit: 'kg', value: 55 }] });
  expect(sleep).toMatchObject({ status: 'ok', records: [{ recordId: 'sleep-1', stages: [{ stage: 'asleepCore' }] }] });
  expect(workout).toMatchObject({ status: 'ok', records: [{ recordId: 'run-1', exerciseType: 'running', durationSec: 1800 }] });
  expect(HK.queryQuantitySamples).toHaveBeenCalledWith(
    'HKQuantityTypeIdentifierHeartRate', expect.objectContaining({ unit: 'count/min' }),
  );
  expect(HK.queryQuantitySamples).toHaveBeenCalledWith(
    'HKQuantityTypeIdentifierBodyMass', expect.objectContaining({ unit: 'kg' }),
  );
});

test('daily energy uses statistics and leaves total calories unsupported', async () => {
  (HK.queryStatisticsForQuantity as jest.Mock).mockImplementation(async (identifier: string) => {
    if (identifier === 'HKQuantityTypeIdentifierActiveEnergyBurned') {
      return { sumQuantity: { quantity: 180, unit: 'kcal' }, sources: [{ bundleIdentifier: 'com.apple.health' }] };
    }
    return { sumQuantity: { quantity: 0, unit: 'kcal' }, sources: [] };
  });
  const rows = await readAppleDailyEnergy(1);
  expect(rows).toHaveLength(3);
  const active = rows.find(row => row.metric === 'active-calories');
  const basal = rows.find(row => row.metric === 'basal-metabolic-rate');
  const total = rows.find(row => row.metric === 'total-calories');
  expect(active).toMatchObject({ status: 'ok', value: { adapter: 'apple-health', value: 180, unit: 'kcal', operation: 'cumulativeSum' } });
  expect(basal).toMatchObject({ status: 'empty' });
  expect(total).toMatchObject({ status: 'unavailable' });
  expect(HK.queryStatisticsForQuantity).toHaveBeenCalledWith(
    'HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], expect.objectContaining({ unit: 'kcal' }),
  );
  expect(HK.queryStatisticsForQuantity).not.toHaveBeenCalledWith(
    'HKQuantityTypeIdentifierDietaryEnergyConsumed', expect.anything(), expect.anything(),
  );
  expect(HK.queryQuantitySamples).not.toHaveBeenCalled();
});

test('HealthKit unavailable reports unsupported and does not query', async () => {
  (HK.isHealthDataAvailableAsync as jest.Mock).mockResolvedValue(false);
  expect(await appleHealth.getAvailability()).toBe('unsupported');
  expect(await appleHealth.read('weight', range)).toEqual({ status: 'unavailable' });
  expect(await readAppleDailyEnergy(7)).toEqual([]);
  await appleHealth.requestPermissions(['steps']);
  expect(HK.requestAuthorization).not.toHaveBeenCalled();
  expect(HK.queryQuantitySamples).not.toHaveBeenCalled();
  expect(HK.queryStatisticsForQuantity).not.toHaveBeenCalled();
});
