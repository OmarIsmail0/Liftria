import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ar } from '../ar';
import { csvFileTypeError, importerLabel, parseImportCsv } from '../../features/import/importCsv';
import { createImportPlan } from '../../features/import/importPlanning';
import { onboardingStepCaption } from '../../features/onboarding/flow';
import { healthConnectInstallLabel } from '../../features/onboarding/healthPermissionCopy';
import { profileFieldErrors } from '../../features/onboarding/profileValidation';
import { keyTestMessage } from '../../features/settings/keyTest';
import { checkSettingsTarget } from '../../features/settings/profileTargets';
import { deleteEverythingOnPhone, formatLocalDatabaseSize } from '../../features/settings/storage';
import { displayHeight } from '../../features/settings/units';
import { calculateMuscleRecovery, recoveryRowText } from '../../features/train/recoveryMath';
import { scheduleRestOver } from '../../features/train/restAlerts';
import { displayRest, restAnnouncement } from '../../features/train/restClock';
import { displayWeight, sideLabel } from '../../features/train/workoutUnits';
import { validateSet } from '../../features/train/workoutData';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async () => 'scheduled-1'),
}));
jest.mock('../../services/database', () => ({ dbOperation: jest.fn(async () => ({ ok: true, value: undefined })) }));

/** Words an Arabic reader should never meet. kg and lb stay Latin by app convention. */
const latinWords = (text: string): string[] =>
  text.replace(/\{\w+\}/g, ' ').match(/[A-Za-z]+/g)?.filter(word => word !== 'kg' && word !== 'lb') ?? [];
const expectArabic = (text: string | null) => {
  expect(text).toEqual(expect.any(String));
  expect(latinWords(text as string)).toEqual([]);
};

describe('runtime copy comes out in Arabic when asked', () => {
  test('rest timer text and announcements', () => {
    expectArabic(displayRest(null, 0, 'ar'));
    expectArabic(displayRest(new Date(0).toISOString(), 10_000, 'ar'));
    for (const [previous, current] of [[30100, 29900], [10500, 9500], [500, 0]] as const) {
      expectArabic(restAnnouncement(previous, current, 'ar'));
    }
  });
  test('weights and sides', () => {
    expectArabic(displayWeight(0, 'bodyweight', 'kg', 'ar'));
    expectArabic(displayWeight(20, 'dumbbell', 'kg', 'ar'));
    expect(displayWeight(20, 'dumbbell', 'kg', 'en')).toBe('20 kg each');
    expectArabic(sideLabel('L', 'ar'));
    expectArabic(sideLabel('R', 'ar'));
    expect(sideLabel('L', 'en')).toBe('L');
  });
  test('set validation messages', () => {
    const set = { sessionId: 's', sessionExerciseId: 'e', position: 0, side: null, kind: 'working' as const,
      weight: 50, reps: 8, restSec: 90 };
    for (const bad of [{ weight: -1 }, { reps: 0 }, { restSec: -1 }, { rpe: 0 }, { rir: 1.5 }, { rpe: 7, rir: 1 }]) {
      expectArabic(validateSet({ ...set, ...bad }, 'ar'));
    }
  });
  test('muscle recovery rows', () => {
    const now = new Date('2026-10-21T09:41:00.000Z');
    const rows = calculateMuscleRecovery([{ sessionId: 's', sessionExerciseId: 'se1', exerciseId: 'x', name: 'x',
      type: 'weighted', endedAt: '2026-10-21T09:41:00Z', loggedAt: new Date(now.valueOf() - 15 * 3600000).toISOString(),
      weight: 50, reps: 8, kind: 'working', side: null, position: 0, unilateral: false,
      primary: ['glutes'], secondary: ['lower back'] }], now);
    for (const muscle of ['glutes', 'lower back', 'neck'] as const) {
      const row = rows.find(r => r.muscle === muscle)!;
      for (const mode of ['recent', 'volume', 'untrained'] as const) expectArabic(recoveryRowText(row, mode, now, 'ar'));
    }
  });
  test('settings and onboarding messages', () => {
    expectArabic(formatLocalDatabaseSize(6 * 1024 * 1024, 'ar'));
    expectArabic(formatLocalDatabaseSize(Number.NaN, 'ar'));
    expect(formatLocalDatabaseSize(6 * 1024 * 1024)).toBe('6.00 MB');
    expect(formatLocalDatabaseSize(6 * 1024 * 1024, 'ar')).toContain('\u00A0');
    for (const outcome of ['works', 'unauthorized', 'offline', 'unavailable'] as const) {
      expectArabic(keyTestMessage(outcome, 'ar'));
    }
    expect(latinWords(keyTestMessage('model-unavailable', 'ar'))).toEqual([]);
    expectArabic(displayHeight(180, 'cm', 'ar'));
    expectArabic(onboardingStepCaption('goal', 'ar'));
    expectArabic(healthConnectInstallLabel('not-installed', 'ar'));
    const errors = profileFieldErrors({ name: 'a'.repeat(31), age: '15', heightCm: '10', weightKg: '999' }, 'ar');
    for (const message of Object.values(errors)) expect(latinWords(message).filter(w => w !== 'cm')).toEqual([]);
    const low = checkSettingsTarget(900, { sexForFormula: null, ageYear: null, heightCm: null, weightKg: null,
      activity: 'light', goal: 'maintain' } as never, 2026, 'ar');
    expectArabic(low.reason);
  });
  test('delete outcomes', async () => {
    const ops = { removeDatabase: jest.fn(async () => ({ ok: false as const, error: { code: 'db-error' as const, message: 'x' } })),
      removeKey: jest.fn(async () => ({ status: 'missing' as const })) };
    const typed = await deleteEverythingOnPhone('nope', ops as never, 'ar');
    const failed = await deleteEverythingOnPhone('DELETE', ops as never, 'ar');
    for (const outcome of [typed, failed]) {
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) expect(latinWords(outcome.message).filter(w => w !== 'DELETE' && w !== 'API')).toEqual([]);
    }
  });
  test('import text', () => {
    for (const source of ['csv', 'hevy'] as const) {
      const message = csvFileTypeError('x.xlsx', source, 'ar') as string;
      expect(latinWords(message).filter(word => !['CSV', 'Excel', 'Hevy'].includes(word))).toEqual([]);
    }
    expect(importerLabel('hevy')).toBe('Hevy');
    const csv = 'date,exercise,weight,reps\n2026-10-20,Squat,100,5\n';
    expectArabic(parseImportCsv('csv', 'a.csv', csv, 'ar').workouts[0]!.title);
    expect(parseImportCsv('csv', 'a.csv', csv).workouts[0]!.title).toBe('Imported workout');
    const parsed = parseImportCsv('csv', 'a.csv', csv, 'ar');
    const empty = { exercises: [], days: [], importedHashes: [], remembered: {}, observations: [], existingRecords: [] };
    const plan = createImportPlan(parsed, empty as never, 'kg', {}, 'kg', 'ar');
    for (const change of plan.changes) expect(latinWords(change.before + ' ' + change.after)).toEqual([]);
  });
  test('rest-over notification', async () => {
    const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
    const original = Platform.OS;
    Platform.OS = 'android';
    try {
      const soon = new Date(Date.now() + 60_000).toISOString();
      await scheduleRestOver(soon, 'session-1', 'سكوات', undefined, 'ar');
      const content = (schedule.mock.calls[0]![0] as { content: { title: string; body: string } }).content;
      expectArabic(content.title);
      expectArabic(content.body);
      expect(content.body).toContain('سكوات');
    } finally {
      Platform.OS = original;
    }
  });
});

describe('Arabic strings that carry a unit', () => {
  test('no Latin cm, sec, min, bpm or MB in Arabic values (kg and lb stay Latin)', () => {
    const hits = Object.entries(ar).flatMap(([key, value]) =>
      latinWords(value).filter(word => /^(cm|sec|min|bpm|MB)$/.test(word)).map(word => key + ': ' + word));
    expect(hits).toEqual([]);
  });
});
