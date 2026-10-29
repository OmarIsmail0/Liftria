import { Platform } from 'react-native';
import { listCachedHealth } from '../../../services/database';
import type { HealthValue } from '../../../services/health/types';
import { cachedHealthWeights } from '../weightRepository';

jest.mock('../../../services/database', () => ({
  listCachedHealth: jest.fn(),
  dbOperation: jest.fn(),
}));

const listCached = listCachedHealth as jest.Mock;
const original = Platform.OS;
function setOs(os: string) {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
}
afterAll(() => { Object.defineProperty(Platform, 'OS', { configurable: true, value: original }); });

function weight(adapter: HealthValue['adapter'], recordId: string): HealthValue {
  return {
    kind: 'instant', metric: 'weight', adapter, recordId, dataOrigin: 'origin.' + adapter,
    time: '2026-10-20T08:00:00.000Z', value: 80, unit: 'kg',
  };
}

const rows = [
  weight('health-connect', 'hc'),
  weight('samsung-health', 'samsung'),
  weight('apple-health', 'apple'),
];

beforeEach(() => {
  listCached.mockResolvedValue({ ok: true, value: rows });
});

test('iPhone weight trend keeps Apple Health rows and hides an Android backup', async () => {
  setOs('ios');
  const result = await cachedHealthWeights();
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value).toEqual([
    { id: 'apple-health:apple', at: '2026-10-20T08:00:00.000Z', kg: 80, source: 'apple-health', origin: 'origin.apple-health' },
  ]);
  expect(result.value.map(row => row.source)).not.toContain('health-connect');
});

test('Android weight trend still returns Health Connect rows', async () => {
  setOs('android');
  const result = await cachedHealthWeights();
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.map(row => row.id)).toEqual([
    'health-connect:hc', 'samsung-health:samsung', 'apple-health:apple',
  ]);
  expect(result.value.filter(row => row.source === 'health-connect')).toHaveLength(2);
  expect(result.value.filter(row => row.source === 'apple-health')).toHaveLength(1);
});
