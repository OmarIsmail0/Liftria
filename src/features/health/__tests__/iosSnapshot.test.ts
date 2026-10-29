import { Platform } from 'react-native';
import { listCachedHealth, saveHealthValues } from '../../../services/database';
import { healthConnect } from '../../../services/health';
import type { AggregateValue, HealthValue } from '../../../services/health/types';
import { loadHealthSnapshot, overviewMetrics } from '../useHealthSnapshot';
import { NOTE_APPLE_TOTAL, NOTE_NO_DATA, NOTE_PERMISSION_UNCONFIRMED } from '../presentation';

jest.mock('../../../services/database', () => ({
  listCachedHealth: jest.fn(),
  saveHealthValues: jest.fn(async () => ({ ok: true, value: 1 })),
}));
jest.mock('../../../services/health', () => ({
  healthConnect: {
    getAvailability: jest.fn(),
    getPermissionStatus: jest.fn(),
    read: jest.fn(),
    requestPermissions: jest.fn(),
  },
}));

const listCached = listCachedHealth as jest.Mock;
const saveCached = saveHealthValues as jest.Mock;
const availability = healthConnect.getAvailability as jest.Mock;
const permissionStatus = healthConnect.getPermissionStatus as jest.Mock;
const read = healthConnect.read as jest.Mock;
const original = Platform.OS;

function setOs(os: string) {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
}
afterAll(() => { Object.defineProperty(Platform, 'OS', { configurable: true, value: original }); });

const unknown = Object.fromEntries(overviewMetrics.map(metric => [metric, 'unknown']));
const androidSteps: HealthValue = {
  kind: 'interval', metric: 'steps', adapter: 'health-connect', recordId: 'android-steps',
  dataOrigin: 'com.sec.android.app.shealth', start: '2026-10-24T00:00:00.000Z',
  end: '2026-10-24T12:00:00.000Z', value: 99999, unit: 'count',
};
const samsungSteps: HealthValue = { ...androidSteps, adapter: 'samsung-health', recordId: 'samsung-steps' };
const appleHeart: HealthValue = {
  kind: 'series', metric: 'heart-rate', adapter: 'apple-health', recordId: 'apple-hr',
  dataOrigin: 'com.apple.Health', start: '2026-10-24T08:00:00.000Z',
  end: '2026-10-24T08:00:00.000Z', unit: 'bpm', points: [{ time: '2026-10-24T08:00:00.000Z', value: 70 }],
};

function stepsTotal(value: number): AggregateValue {
  const end = new Date();
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  return {
    kind: 'aggregate', metric: 'steps', adapter: 'apple-health', operation: 'cumulativeSum',
    windowStart: start.toISOString(), windowEnd: end.toISOString(), value, unit: 'count',
    dataOrigin: 'com.apple.Health', dataOrigins: ['com.apple.Health'],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  availability.mockResolvedValue('available');
  permissionStatus.mockResolvedValue(unknown);
  listCached.mockResolvedValue({ ok: true, value: [androidSteps, samsungSteps, appleHeart] });
  read.mockResolvedValue({ status: 'empty' });
});

test('iPhone reads Apple Health even when access is unknown, and hides Android cache rows', async () => {
  setOs('ios');
  const total = stepsTotal(4200);
  read.mockImplementation(async (metric: string) => {
    if (metric === 'steps') return { status: 'ok', records: [total] };
    return { status: 'empty' };
  });
  const snapshot = await loadHealthSnapshot(overviewMetrics, true);
  expect(read).toHaveBeenCalled();
  expect(snapshot.permissions.steps).toBe('unknown');
  expect(snapshot.readings.steps?.total).toBe(4200);
  expect(snapshot.readings.steps?.note).toBe(NOTE_APPLE_TOTAL);
  expect(snapshot.readings.steps?.total).not.toBe(0);
  expect(snapshot.readings.steps?.total).not.toBe(99999);
  expect(snapshot.readings['heart-rate']?.state).toBe('no-data');
  expect(snapshot.readings['heart-rate']?.note).toBe(NOTE_NO_DATA);
  expect(snapshot.readings['heart-rate']?.total).toBeNull();
  expect(snapshot.records.map(row => row.adapter)).not.toContain('health-connect');
  expect(snapshot.records.map(row => row.adapter)).not.toContain('samsung-health');
  expect(snapshot.records.some(row => row.adapter === 'apple-health')).toBe(true);
});

test('a zero Apple Health total stays no data', async () => {
  setOs('ios');
  listCached.mockResolvedValue({ ok: true, value: [] });
  read.mockImplementation(async (metric: string) => (
    metric === 'steps' ? { status: 'ok', records: [stepsTotal(0)] } : { status: 'empty' }
  ));
  const snapshot = await loadHealthSnapshot(overviewMetrics, true);
  expect(snapshot.readings.steps?.state).toBe('no-data');
  expect(snapshot.readings.steps?.total).toBeNull();
  expect(saveCached).not.toHaveBeenCalled();
});

test('Android still waits for a granted permission and still shows its own cache', async () => {
  setOs('android');
  const snapshot = await loadHealthSnapshot(overviewMetrics, true);
  expect(read).not.toHaveBeenCalled();
  expect(snapshot.readings.steps?.note).toBe(NOTE_PERMISSION_UNCONFIRMED);
  expect(snapshot.records.flatMap(row => row.kind === 'aggregate' ? [] : [row.recordId])).toEqual(
    expect.arrayContaining(['android-steps', 'samsung-steps', 'apple-hr']),
  );
  permissionStatus.mockResolvedValue({ ...unknown, steps: 'granted' });
  read.mockResolvedValue({ status: 'ok', records: [{ ...androidSteps, recordId: 'live', value: 1200 }] });
  await loadHealthSnapshot(overviewMetrics, true);
  expect(read.mock.calls.map(call => call[0])).toEqual(['steps']);
});

test('before the read prompt, iPhone shows access not confirmed, not a read error', async () => {
  setOs('ios');
  listCached.mockResolvedValue({ ok: true, value: [] });
  read.mockResolvedValue({ status: 'error', code: 'not-requested', message: 'not requested' });
  const snapshot = await loadHealthSnapshot(overviewMetrics);
  expect(snapshot.readings.steps?.state).toBe('no-data');
  expect(snapshot.readings.steps?.note).toBe(NOTE_PERMISSION_UNCONFIRMED);
  expect(snapshot.readings['heart-rate']?.note).toBe(NOTE_PERMISSION_UNCONFIRMED);
  expect(snapshot.readings.steps?.total).toBeNull();
});
