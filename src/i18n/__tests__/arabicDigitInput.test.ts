import { commitSetDraft } from '../../features/train/setTable';
import { parseMeasurementInput } from '../../features/progress/measurements';
import { profileFieldErrors } from '../../features/onboarding/profileValidation';
import { draftProfileInput, draftTargetInput } from '../../features/onboarding/persistence';
import { emptyDraft } from '../../features/onboarding/draft';
import { parseOptionalNumber } from '../../features/settings/profileTargets';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

/** An Arabic keyboard can type ٠–٩ and ٫. The same value must be accepted or refused
 * exactly as its Western-digit spelling is, at every edge that turns text into a number. */
test('a workout set typed in Arabic-Indic digits logs the same values', () => {
  const none = { placeholderWeight: null, placeholderReps: null };
  expect(commitSetDraft({ weightText: '٨٢٫٥', repsText: '٨', ...none })).toEqual({ ok: true, weight: 82.5, reps: 8 });
  expect(commitSetDraft({ weightText: '80', repsText: '-3', ...none })).toEqual({ ok: false, reason: 'reps' });
  expect(commitSetDraft({ weightText: '1e3', repsText: '5', ...none })).toEqual({ ok: false, reason: 'weight' });
  expect(commitSetDraft({ weightText: '80', repsText: '8.5', ...none })).toEqual({ ok: false, reason: 'reps' });
});

test('a tape measurement in Arabic-Indic digits is stored, nonsense is refused', () => {
  expect(parseMeasurementInput('٨٢٫٥', 'cm')).toEqual({ kind: 'value', cm: 82.5 });
  expect(parseMeasurementInput('  ', 'cm')).toEqual({ kind: 'blank' });
  expect(parseMeasurementInput('-80', 'cm')).toEqual({ kind: 'invalid' });
  expect(parseMeasurementInput('0x50', 'cm')).toEqual({ kind: 'invalid' });
});

test('onboarding accepts Arabic-Indic age, height and weight and saves real numbers', () => {
  expect(profileFieldErrors({ name: '', age: '٣٠', heightCm: '١٧٥', weightKg: '٧٢٫٥' })).toEqual({});
  expect(profileFieldErrors({ name: '', age: '١٥', heightCm: '٩٩٩', weightKg: '-70' }))
    .toMatchObject({ age: expect.any(String), heightCm: expect.any(String), weightKg: expect.any(String) });
  const draft = { ...emptyDraft, birthYear: '١٩٩٦', heightCm: '١٧٥', weightKg: '٧٢٫٥' };
  expect(draftProfileInput(draft)).toMatchObject({ birthYear: 1996, heightCm: 175, weightKg: 72.5 });
  expect(draftTargetInput({ ...emptyDraft, manualKcal: '٢٢٠٠', manualProtein: '١٥٠', manualFat: '٧٠', manualCarbs: '٢٠٠' }, 'manual'))
    .toMatchObject({ kcal: 2200, proteinG: 150, fatG: 70, carbsG: 200, source: 'manual' });
  expect(draftTargetInput({ ...emptyDraft, manualKcal: '2200', manualProtein: '-1', manualFat: '70', manualCarbs: '200' }, 'manual'))
    .toBeNull();
});

test('Settings profile fields read Arabic-Indic digits; blank stays blank, never 0', () => {
  expect(parseOptionalNumber('١٨٠')).toBe(180);
  expect(parseOptionalNumber('')).toBeNull();
  expect(parseOptionalNumber('abc')).toBeNaN();
});
