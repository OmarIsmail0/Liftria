import { emptyMetricState, measuredEnergy, sourceName, sourceStale, summarizeRecords, onlyLocalDayRecords } from '../presentation';
import type { HealthValue, AggregateValue, IntervalSample } from '../../../services/health/types';

const end = '2026-10-24T12:30:00.000Z';
const start = '2026-10-24T11:30:00.000Z';
const now = Date.parse('2026-10-24T13:00:00.000Z');
function steps(recordId: string, origin: string, count: number): IntervalSample {
  return { adapter: 'health-connect', recordId, dataOrigin: origin,
    kind: 'interval', metric: 'steps', start, end, unit: 'count', value: count };
}
test('one phone origin has a visible total; two sources never add their steps', () => {
  const a = summarizeRecords('steps', [steps('a','com.android.healthconnect.phone', 5000),
    steps('b','com.android.healthconnect.phone', 200)], 'granted', true, now);
  expect(a.total).toBe(5200);
  expect(a.sources).toHaveLength(1);
  expect(a.sources[0]!.label).toBe('Phone');
  const multi = summarizeRecords('steps', [steps('a','com.android.healthconnect.phone', 5000),
    steps('a','com.android.healthconnect.phone', 5000), steps('b','com.sec.android.app.shealth', 1700)],
  'granted', true, now);
  expect(multi.sources.map(s=>s.value)).toEqual([5000,1700]);
  expect(multi.total).toBeNull();
  expect(multi.note).toMatch(/no combined total/i);
  expect(sourceName('com.sec.android.app.shealth')).toBe('Samsung Health');
});
test('Samsung Health heart rate without device metadata is unverified, never watch-labeled', () => {
  const hr: HealthValue = { kind: 'series', metric: 'heart-rate', adapter: 'health-connect',
    recordId: 'hr1', dataOrigin: 'com.sec.android.app.shealth', start, end, unit: 'bpm',
    points: [{ time: start, value: 68 }, { time: end, value: 72 }] };
  const r = summarizeRecords('heart-rate', [hr], 'granted', true, now);
  expect(r.total).toBe(72);
  expect(r.unverified).toBe(true);
  expect(r.sources[0]?.label).toBe('Samsung Health');
  expect(r.note).toMatch(/Unverified device/);
});
test('lack of records is No data, never 0; denied is Not allowed', () => {
  expect(summarizeRecords('steps', [], 'granted', true, now)).toMatchObject({ state:'no-data', total:null });
  expect(emptyMetricState('steps', 'denied', true)).toMatchObject({ state:'not-allowed', total:null });
  expect(emptyMetricState('steps', 'unknown', false)).toMatchObject({ state:'not-available', total:null });
});
test('unattributed or multi-origin energy never masquerades as measured', () => {
  const base: AggregateValue = { kind:'aggregate', metric:'total-calories', adapter:'health-connect',
    operation:'ENERGY_TOTAL', windowStart:start, windowEnd:end, value:1564.5, unit:'kcal', dataOrigins:[] };
  expect(measuredEnergy([base])).toBeNull();
  expect(measuredEnergy([{...base,dataOrigins:['phone','watch']}])).toBeNull();
  expect(measuredEnergy([{...base,dataOrigins:['com.sec.android.app.shealth']}]))
    .toEqual({ kcal: 1564.5, origin:'com.sec.android.app.shealth' });
});
test('freshness thresholds: six hours for steps/HR, fourteen days for body mass', () => {
  expect(sourceStale('steps', end, now)).toBe(false);
  expect(sourceStale('steps', end, now+7*3600000)).toBe(true);
  expect(sourceStale('weight', end, now+7*86400000)).toBe(false);
  expect(sourceStale('weight', end, now+15*86400000)).toBe(true);
});

test('Today filters cached step intervals from yesterday and refuses cross-midnight sums', () => {
  const from = new Date('2026-10-24T00:00:00.000Z');
  const until = new Date('2026-10-24T13:00:00.000Z');
  const old: HealthValue = { ...steps('y','com.android.healthconnect.phone',9000),
    start:'2026-10-23T09:00:00.000Z', end:'2026-10-23T10:00:00.000Z' };
  const cross: HealthValue = { ...steps('cross','com.android.healthconnect.phone',1000),
    start:'2026-10-23T23:45:00.000Z', end:'2026-10-24T00:15:00.000Z' };
  const today = steps('today','com.android.healthconnect.phone',500);
  const filtered = onlyLocalDayRecords('steps',[old,cross,today],from,until);
  expect(filtered).toHaveLength(1);
  expect(summarizeRecords('steps',filtered,'granted',true,now).total).toBe(500);
});
