import { normalizeHealthRecord } from '../normalize';

const meta = { id: 'real-record-001', dataOrigin: 'com.sec.android.app.shealth', lastModifiedTime: '2026-10-18T08:00:00Z',
  device: { manufacturer: 'Samsung', model: 'Galaxy Watch4', type: 2 } };
test('steps preserve source, IDs and interval', () => {
  const value = normalizeHealthRecord('steps', { metadata: meta, count: 45, startTime: '2026-10-18T06:00:00+03:00', endTime: '2026-10-18T06:05:00+03:00' });
  expect(value).toMatchObject({ kind: 'interval', recordId: 'real-record-001', dataOrigin: 'com.sec.android.app.shealth', unit: 'count', value: 45 });
});
test('energy remains a bounded interval, not a daily total', () => {
  const value = normalizeHealthRecord('total-calories', { metadata: meta, energy: { inKilocalories: 170 }, startTime: '2026-10-18T08:00:00Z', endTime: '2026-10-18T09:00:00Z' });
  expect(value).toMatchObject({ kind: 'interval', value: 170, unit: 'kcal' });
});
test('BMR remains a rate, not summed energy', () => {
  const value = normalizeHealthRecord('basal-metabolic-rate', { metadata: meta, time: '2026-10-18T08:00:00Z', basalMetabolicRate: { inWatts: 78 } });
  expect(value).toMatchObject({ kind: 'rate', unit: 'W', value: 78 });
});
test('heart rate is a series, exercises have duration', () => {
  const hr = normalizeHealthRecord('heart-rate', { metadata: meta, startTime: '2026-10-18T06:00:00Z', endTime: '2026-10-18T06:01:00Z',
    samples: [{ time: '2026-10-18T06:00:30Z', beatsPerMinute: 88 }] });
  expect(hr).toMatchObject({ kind: 'series', points: [{ value: 88 }] });
  const session = normalizeHealthRecord('exercise-session', { metadata: meta, startTime: '2026-10-18T06:00:00Z', endTime: '2026-10-18T06:30:00Z', exerciseType: 80 });
  expect(session).toMatchObject({ kind: 'session', durationSec: 1800 });
});
test('missing source ID is rejected, never synthesized', () => {
  expect(normalizeHealthRecord('steps', { metadata: { dataOrigin: 'x' }, count: 12, startTime: '2026-10-18T00:00:00Z', endTime: '2026-10-18T01:00:00Z' })).toBeNull();
});
