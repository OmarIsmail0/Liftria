import { emptyMetricState, phase2EnergyMessage, sourceName, sourceStale, summarizeRecords, onlyLocalDayRecords, ageLabel, hourlyStepsBySource, heartRateSamples, earliestCachedRecordAt, dailyStepsBySource, healthAvailabilityText, canInstallHealthConnect,
  recordsInWindow, heartRateTodayStatus, historyPermissionMessage } from '../presentation';
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
test('single-origin HC total is not Phase-2 measured energy, including Samsung Health', () => {
  const base: AggregateValue = { kind:'aggregate', metric:'total-calories', adapter:'health-connect',
    operation:'ENERGY_TOTAL', windowStart:start, windowEnd:end, value:1564.5, unit:'kcal',
    dataOrigins:['com.sec.android.app.shealth'] };
  const summary = summarizeRecords('active-calories', [base], 'granted', true, now);
  expect(summary.total).toBeNull();
  expect(phase2EnergyMessage('granted', true)).toBe('No measured source');
  expect(phase2EnergyMessage('denied', true)).toBe('Not allowed');
  expect(phase2EnergyMessage('granted', false)).toBe('Not available');
  expect(phase2EnergyMessage('unknown', true)).toBe('Permission not confirmed');
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
  expect(filtered).toHaveLength(2);
  expect(summarizeRecords('steps',filtered,'granted',true,now).total).toBe(1000);
  expect(filtered.find(r => 'recordId' in r && r.recordId === 'cross'))
    .toMatchObject({ kind: 'interval', value: 500, start: '2026-10-24T00:00:00.000Z' });
});

test('stale age reads from recorded time, not cache refresh timestamp', () => {
  expect(ageLabel(end, now)).toBe('30 min ago');
  expect(ageLabel(end, now+7*3600000)).toBe('7 h ago');
  expect(ageLabel(end, now+2*86400000)).toBe('2 d ago');
});

test('HE-2 charts respect hourly buckets, retain separate origins and dedupe cache/live', () => {
  const day = new Date('2026-10-24T00:00:00Z');
  const until = new Date('2026-10-25T00:00:00Z');
  const phone = { ...steps('a','com.android.healthconnect.phone',600),
    start:'2026-10-24T08:30:00Z', end:'2026-10-24T09:30:00Z' };
  const watch = { ...steps('b','com.sec.android.app.shealth',300),
    start:'2026-10-24T09:00:00Z', end:'2026-10-24T09:30:00Z' };
  const s = hourlyStepsBySource([phone, phone, watch], day, until);
  expect(s).toHaveLength(2);
  expect(s[0]?.values[8]).toBe(300);
  expect(s[0]?.values[9]).toBe(300);
  expect(s[1]?.values[9]).toBe(300);
  expect(earliestCachedRecordAt([phone,watch])).toBe(phone.start);
});
test('HE-2 heart-rate chart shows individual samples, no inferred watch origin', () => {
  const values: HealthValue[] = [{ kind:'series', metric:'heart-rate', adapter:'health-connect',
    recordId:'hr-1', dataOrigin:'com.sec.android.app.shealth',
    start, end, unit:'bpm', points:[{ time:start,value:68 },{ time:end,value:72 }] }];
  const result = heartRateSamples([...values,...values], new Date(start), new Date(end));
  expect(result).toHaveLength(2);
  expect(result.map(x=>x.bpm)).toEqual([68,72]);
  expect(result[0]?.origin).toBe('com.sec.android.app.shealth');
});

test('HE-1 availability status is human copy, unsupported is not an install instruction', () => {
  expect(healthAvailabilityText('needs-update')).not.toContain('needs-update');
  expect(healthAvailabilityText('unsupported')).toMatch(/works without/);
  expect(canInstallHealthConnect('unsupported')).toBe(false);
  expect(canInstallHealthConnect('not-installed')).toBe(true);
});
test('HE-2 week steps split by local dates without summing separate providers', () => {
  const from = new Date('2026-10-18T00:00:00.000Z');
  const until = new Date('2026-10-25T00:00:00.000Z');
  const vals = dailyStepsBySource([steps('a','phone',1400), steps('b','shealth',200)], from, until);
  expect(vals).toHaveLength(2);
  expect(vals[0]?.values.reduce((sum,n) => sum+n,0)).toBe(1400);
  expect(vals[1]?.values.reduce((sum,n) => sum+n,0)).toBe(200);
});

test('midnight step clipping never treats an invalid zero-length interval as a step value', () => {
  const from = new Date('2026-10-24T00:00:00Z');
  const to = new Date('2026-10-25T00:00:00Z');
  const bad = { ...steps('bad','phone',99), start:from.toISOString(),end:from.toISOString() };
  expect(onlyLocalDayRecords('steps',[bad],from,to)).toEqual([]);
});

test('unknown or revoked permissions never show cached measurements', () => {
  const cached = [steps('permitted','com.android.healthconnect.phone',800)];
  expect(summarizeRecords('steps',cached,'unknown',true,now)).toMatchObject({
    state:'no-data',total:null,note:'Permission not confirmed',
  });
  expect(summarizeRecords('steps',cached,'denied',true,now)).toMatchObject({
    state:'not-allowed',total:null,
  });
});


// Claude's final review: stable window scope and truthful loading/provenance copy.
test('Today HR regards yesterday as stale even 10 minutes after midnight, today as current even after six hours', () => {
  const now = new Date(2026, 9, 25, 0, 10);
  const yesterday = new Date(2026, 9, 24, 22, 40).toISOString();
  const prior = heartRateTodayStatus(yesterday, now);
  expect(prior.stale).toBe(true);
  expect(prior.age).toMatch(/yesterday 22:40/);
  expect(heartRateTodayStatus(new Date(2026,9,25,0,1).toISOString(),now).stale).toBe(false);
  expect(heartRateTodayStatus(new Date(2026,9,25,0,1).toISOString(),
    new Date(2026,9,25,23,50)).stale).toBe(false);
});
test('read-error source summaries cannot use yesterday steps, old HR samples or old weight', () => {
  const day = new Date(2026,9,25,0,0), now = new Date(2026,9,25,12,0);
  const oldStep: IntervalSample = { ...steps('old','phone',9000),
    start:new Date(2026,9,24,8).toISOString(), end:new Date(2026,9,24,9).toISOString() };
  const todays: IntervalSample = { ...steps('new','phone',400),
    start:new Date(2026,9,25,10).toISOString(), end:new Date(2026,9,25,11).toISOString() };
  expect(summarizeRecords('steps',recordsInWindow('steps',[oldStep,todays],day,now),'granted',true).total)
    .toBe(400);
  const oldHr: HealthValue = { kind:'series',metric:'heart-rate',adapter:'health-connect',
    recordId:'prior',dataOrigin:'com.sec.android.app.shealth',
    start:new Date(2026,9,24,21).toISOString(),end:new Date(2026,9,24,22).toISOString(),
    unit:'bpm',points:[{time:new Date(2026,9,24,22).toISOString(),value:72}] };
  const todayHr: HealthValue = { ...oldHr,recordId:'current',start:new Date(2026,9,25,8).toISOString(),
    end:new Date(2026,9,25,8,1).toISOString(),points:[{time:new Date(2026,9,25,8).toISOString(),value:75}] };
  const filtered = recordsInWindow('heart-rate',[oldHr,todayHr],day,now);
  expect(summarizeRecords('heart-rate',filtered,'granted',true).total).toBe(75);
});
test('history statuses are plain language and device status has unknown initial state', () => {
  expect(healthAvailabilityText(null)).toMatch(/Checking/);
  expect(canInstallHealthConnect(null)).toBe(false);
  expect(historyPermissionMessage('unverified')).not.toContain('unverified');
  expect(historyPermissionMessage('unavailable')).not.toContain('unavailable');
  expect(historyPermissionMessage('granted')).toMatch(/allowed/);
});
