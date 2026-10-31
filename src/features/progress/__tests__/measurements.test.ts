import { deleteLocalDatabase } from '../../../services/database';
import { resetMemorySqlite } from '../../settings/__tests__/memorySqlite';
import {
  addMeasurements, latestBySite, listAllMeasurements, listMeasurements, removeMeasurement, saveMeasurement,
} from '../measurementRepository';
import {
  formatMeasurement, formatSignedMeasurement, fromCm, lengthUnitForWeight, lengthUnitLabel,
  measurementDrafts, shownChange, summarizeMeasurements, toCm, validateMeasurement,
  type BodyMeasurement,
} from '../measurements';

jest.mock('expo-sqlite', () => jest.requireActual('../../settings/__tests__/memorySqlite').memoryExpoSqlite);

const AT = '2026-01-15T12:00:00.000Z';

function row(partial: Partial<BodyMeasurement> & Pick<BodyMeasurement, 'id' | 'site' | 'cm' | 'measuredAt'>): BodyMeasurement {
  return { note: null, source: 'liftria', ...partial };
}

beforeEach(async () => {
  await deleteLocalDatabase();
  resetMemorySqlite();
});

test('centimeters stay centimeters and inches convert at 2.54, rounded to 0.1', () => {
  expect(lengthUnitForWeight('kg')).toBe('cm');
  expect(lengthUnitForWeight('lb')).toBe('in');
  expect(toCm(80, 'cm')).toBe(80);
  expect(toCm(80.04, 'cm')).toBe(80);
  expect(fromCm(80, 'cm')).toBe(80);
  expect(toCm(32, 'in')).toBe(81.28);
  expect(fromCm(81.28, 'in')).toBe(32);
  expect(fromCm(80, 'in')).toBe(31.5);
  expect(toCm(31.5, 'in')).toBe(80.01);
  expect(toCm(31.46, 'in')).toBe(80.01);
  expect(shownChange(82, 80, 'cm')).toBe(2);
  expect(shownChange(82, 80, 'in')).toBe(0.8);
  expect(toCm(0, 'cm')).toBe(0);
  expect(toCm(400, 'cm')).toBe(400);
  expect(validateMeasurement(toCm(0, 'cm'), AT, 'waist')).toBe(false);
  expect(validateMeasurement(399.9, AT, 'waist')).toBe(true);
  expect(validateMeasurement(400, AT, 'waist')).toBe(false);
});

test('a length and its unit are one isolated value with a no-break space', () => {
  expect(lengthUnitLabel('en', 'cm')).toBe('cm');
  expect(lengthUnitLabel('en', 'in')).toBe('in');
  expect(lengthUnitLabel('ar', 'cm')).toBe('سم');
  expect(lengthUnitLabel('ar', 'in')).toBe('بوصة');
  expect(formatMeasurement(80, 'cm', 'en')).toBe('80.0\u00A0cm');
  const arabic = formatMeasurement(80, 'cm', 'ar');
  expect(arabic.startsWith('\u2068')).toBe(true);
  expect(arabic.endsWith('\u2069')).toBe(true);
  expect(arabic).toContain('80.0\u00A0سم');
  expect(arabic).not.toMatch(/[٠-٩]/);
  expect(arabic).not.toMatch(/cm|in/);
  expect(formatSignedMeasurement(2, 'cm', 'en')).toBe('+2.0\u00A0cm');
  const down = formatSignedMeasurement(shownChange(80, 82, 'in'), 'in', 'ar');
  expect(down).toContain('\u00A0بوصة');
  expect(down).toContain('-');
  expect(down).not.toMatch(/[A-Za-z]/);
});

test('a blank field is skipped and zero is not saved', () => {
  expect(measurementDrafts({ waist: '', hips: '   ', chest: '90' }, 'cm')).toEqual({
    ok: true, values: [{ site: 'chest', cm: 90 }],
  });
  expect(measurementDrafts({ waist: '', arm_left: '  ' }, 'cm')).toEqual({ ok: false, reason: 'empty' });
  expect(measurementDrafts({ waist: '0', chest: '90' }, 'cm')).toEqual({ ok: false, reason: 'invalid' });
  expect(measurementDrafts({ waist: '0.0', neck: '' }, 'in')).toEqual({ ok: false, reason: 'invalid' });
  expect(measurementDrafts({ shoulders: 'nope' }, 'cm')).toEqual({ ok: false, reason: 'invalid' });
  expect(measurementDrafts({ thigh_left: '31,5' }, 'in')).toEqual({
    ok: true, values: [{ site: 'thigh_left', cm: 80.01 }],
  });
});

test('latest per site uses the previous entry for the change, including a same-time tie', () => {
  const summaries = summarizeMeasurements([
    row({ id: 'a', site: 'arm_right', cm: 35, measuredAt: '2026-03-01T12:00:00.000Z' }),
    row({ id: 'w1', site: 'waist', cm: 80, measuredAt: '2026-01-01T12:00:00.000Z' }),
    row({ id: 'w2', site: 'waist', cm: 82, measuredAt: '2026-02-01T12:00:00.000Z' }),
    row({ id: 'b', site: 'chest', cm: 80, measuredAt: '2026-04-01T12:00:00.000Z' }),
    row({ id: 'a', site: 'chest', cm: 81, measuredAt: '2026-04-01T12:00:00.000Z' }),
  ]);
  expect(summaries.map(item => item.site)).toEqual(['waist', 'chest', 'arm_right']);
  expect(summaries[0]).toMatchObject({ changeCm: 2, latest: { id: 'w2', cm: 82 }, previous: { id: 'w1' } });
  expect(summaries[1]).toMatchObject({ latest: { id: 'b', cm: 80 }, previous: { id: 'a', cm: 81 }, changeCm: -1 });
  expect(summaries[2]?.changeCm).toBeNull();
});

test('add, edit and delete keep only real measurements and the change from the previous entry', async () => {
  const draft = measurementDrafts({ waist: '80', hips: '', chest: '100', arm_right: '35' }, 'cm');
  expect(draft.ok).toBe(true);
  if (!draft.ok) return;
  const added = await addMeasurements({ measuredAt: '2026-01-01T12:00:00.000Z', note: '  ', entries: draft.values });
  expect(added.ok).toBe(true);
  if (!added.ok) return;
  expect(added.value.map(item => item.site).sort()).toEqual(['arm_right', 'chest', 'waist']);
  expect(added.value.every(item => item.note === null && item.source === 'liftria' && item.id.length > 0)).toBe(true);

  const later = await addMeasurements({
    measuredAt: '2026-02-01T12:00:00.000Z', note: 'tape', entries: [{ site: 'waist', cm: 82 }],
  });
  expect(later.ok).toBe(true);
  const summary = await latestBySite();
  expect(summary.ok).toBe(true);
  if (!summary.ok) return;
  const waist = summary.value.find(item => item.site === 'waist');
  const arm = summary.value.find(item => item.site === 'arm_right');
  expect(waist).toMatchObject({ changeCm: 2, latest: { cm: 82, note: 'tape' } });
  expect(arm?.changeCm).toBeNull();
  expect(summary.value.some(item => item.site === 'hips')).toBe(false);

  const edited = await saveMeasurement(waist!.latest.id, 81, '2026-02-01T12:00:00.000Z', 'tape');
  expect(edited.ok && edited.ok && edited.value.cm).toBe(81);
  const afterEdit = await latestBySite();
  expect(afterEdit.ok && afterEdit.value.find(item => item.site === 'waist')?.changeCm).toBe(1);

  const removed = await removeMeasurement(waist!.latest.id);
  expect(removed.ok && removed.value?.cm).toBe(81);
  const history = await listMeasurements('waist');
  expect(history.ok && history.value.map(item => item.cm)).toEqual([80]);
  const afterDelete = await latestBySite();
  expect(afterDelete.ok && afterDelete.value.find(item => item.site === 'waist')?.changeCm).toBeNull();
});

test('an invalid value in a batch saves nothing, including zero', async () => {
  const rejected = await addMeasurements({
    measuredAt: AT, note: null,
    entries: [{ site: 'chest', cm: 100 }, { site: 'waist', cm: 0 }],
  });
  expect(rejected.ok).toBe(false);
  const empty = await addMeasurements({ measuredAt: AT, note: null, entries: [] });
  expect(empty.ok).toBe(false);
  const future = await addMeasurements({
    measuredAt: '2099-01-01T00:00:00.000Z', note: null, entries: [{ site: 'neck', cm: 38 }],
  });
  expect(future.ok).toBe(false);
  const longNote = await addMeasurements({
    measuredAt: AT, note: 'x'.repeat(401), entries: [{ site: 'neck', cm: 38 }],
  });
  expect(longNote.ok).toBe(false);
  const all = await listAllMeasurements();
  expect(all).toEqual({ ok: true, value: [] });
});
