import { healthConnect, normalizeEnergyAggregate, readDailyEnergy } from '../index';
import * as HC from 'react-native-health-connect';

jest.mock('react-native-health-connect', () => ({
  SdkAvailabilityStatus: { SDK_AVAILABLE: 3, SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2 },
  getSdkStatus: jest.fn(async () => 3),
  initialize: jest.fn(async () => true),
  getGrantedPermissions: jest.fn(async () => [
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
    { accessType: 'read', recordType: 'TotalCaloriesBurned' },
    { accessType: 'read', recordType: 'BasalMetabolicRate' },
  ]),
  requestPermission: jest.fn(async () => []),
  readRecords: jest.fn(),
  aggregateRecord: jest.fn(),
}));

const meta = { id: 'real-id-1', dataOrigin: 'com.sec.android.app.shealth' };
const first = { metadata: meta, count: 5, startTime: '2026-10-15T00:00:00Z', endTime: '2026-10-15T00:01:00Z' };
const second = { ...first, metadata: { ...meta, id: 'real-id-2' } };

beforeEach(() => jest.clearAllMocks());

test('reads every Health Connect page and never silently imports a partial page', async () => {
  (HC.readRecords as jest.Mock)
    .mockResolvedValueOnce({ records: [first], pageToken: 'next' })
    .mockResolvedValueOnce({ records: [second], pageToken: undefined });
  const r = await healthConnect.read('steps', { start: new Date('2026-10-15T00:00:00Z'), end: new Date('2026-10-17T00:00:00Z') });
  expect(r.status).toBe('ok');
  if (r.status === 'ok') expect(r.records.map(v => v.kind === 'aggregate' ? null : v.recordId))
    .toEqual(['real-id-1', 'real-id-2']);
  expect(HC.readRecords).toHaveBeenCalledTimes(2);
  expect((HC.readRecords as jest.Mock).mock.calls[1][1].pageToken).toBe('next');
});

test('repeated page token returns error, never success with partial records', async () => {
  (HC.readRecords as jest.Mock).mockResolvedValue({ records: [first], pageToken: 'same' });
  expect(await healthConnect.read('steps', { start: new Date('2026-10-15'), end: new Date('2026-10-18') }))
    .toMatchObject({ status: 'error', code: 'pagination-loop' });
});

test('normalizes distinct daily energy aggregates and source origins', () => {
  expect(normalizeEnergyAggregate(
    'active-calories',
    { ACTIVE_CALORIES_TOTAL: { inKilocalories: 120 }, dataOrigins: ['com.sec.android.app.shealth'] },
    '2026-10-15T00:00:00Z', '2026-10-16T00:00:00Z',
  )).toMatchObject({
    kind: 'aggregate', operation: 'ACTIVE_CALORIES_TOTAL', value: 120,
    dataOrigin: 'com.sec.android.app.shealth',
  });
  expect(normalizeEnergyAggregate('basal-metabolic-rate', { BASAL_CALORIES_TOTAL: { inKilocalories: 900 } }, 'x', 'y'))
    .toMatchObject({ operation: 'BASAL_CALORIES_TOTAL', value: 900 });
  expect(normalizeEnergyAggregate('total-calories', { ENERGY_TOTAL: null }, 'x', 'y')).toBeNull();
});

test('daily aggregate reads keep each metric separate and preserve missing values', async () => {
  (HC.aggregateRecord as jest.Mock).mockImplementation(async ({ recordType }: { recordType: string }) => {
    if (recordType === 'ActiveCaloriesBurned') return { ACTIVE_CALORIES_TOTAL: { inKilocalories: 220 }, dataOrigins: ['a', 'b'] };
    if (recordType === 'TotalCaloriesBurned') return { ENERGY_TOTAL: { inKilocalories: 500 }, dataOrigins: ['a'] };
    return { BASAL_CALORIES_TOTAL: null, dataOrigins: [] };
  });
  const rows = await readDailyEnergy(2);
  expect(rows).toHaveLength(6);
  expect(rows.filter(x => x.status === 'ok')).toHaveLength(4);
  const active = rows.find(x => x.metric === 'active-calories' && x.status === 'ok');
  if (active?.status === 'ok') {
    expect(active.value.dataOrigin).toBeUndefined();
    expect(active.value.dataOrigins).toEqual(['a', 'b']);
  }
  expect(rows.filter(x => x.status === 'empty')).toHaveLength(2);
});

test('totals no app contributed to are flagged as estimates, never ok (S22 device test 2026-10-21)', async () => {
  // Observed on the owner's phone with no Samsung Health sync: active 0, total = basal = 1564.5, no origins.
  (HC.aggregateRecord as jest.Mock).mockImplementation(async ({ recordType }: { recordType: string }) => {
    if (recordType === 'ActiveCaloriesBurned') return { ACTIVE_CALORIES_TOTAL: { inKilocalories: 0 }, dataOrigins: [] };
    if (recordType === 'TotalCaloriesBurned') return { ENERGY_TOTAL: { inKilocalories: 1564.5 }, dataOrigins: [] };
    return { BASAL_CALORIES_TOTAL: { inKilocalories: 1564.5 }, dataOrigins: [] };
  });
  const before = Date.now();
  const rows = await readDailyEnergy(1);
  const after = Date.now();
  expect(rows.map(x => x.status)).toEqual(['no-source', 'no-source', 'no-source']);
  // Today's aggregate ends at capture time; it never covers unelapsed hours.
  for (const row of rows) {
    if (row.status === 'no-source') {
      expect(Date.parse(row.value.windowEnd)).toBeGreaterThanOrEqual(before);
      expect(Date.parse(row.value.windowEnd)).toBeLessThanOrEqual(after);
    }
  }
  const total = rows.find(x => x.metric === 'total-calories');
  if (total?.status === 'no-source') expect(total.value.value).toBe(1564.5);
});
