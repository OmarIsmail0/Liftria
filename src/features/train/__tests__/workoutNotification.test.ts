import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { deleteLocalDatabase, dbOperation } from '../../../services/database';
import { resetMemorySqlite } from '../../settings/__tests__/memorySqlite';
import { REST_ACTION_PLUS_30, REST_ACTION_SKIP, handleNotificationOpen } from '../restAlerts';
import { logWorkoutSet, readWorkout } from '../workoutData';
import {
  alignWorkoutNotifications, formatClock, installNotificationBehavior, resetWorkoutNotificationCache,
  workoutNotificationText,
} from '../workoutNotification';

jest.mock('expo-sqlite', () => jest.requireActual('../../settings/__tests__/memorySqlite').memoryExpoSqlite);
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6, LOW: 4 },
  AndroidNotificationPriority: { LOW: 'low' },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn(async () => undefined),
  setNotificationCategoryAsync: jest.fn(async () => undefined),
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async (request: { identifier?: string }) => request.identifier ?? 'scheduled'),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getPresentedNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  dismissNotificationAsync: jest.fn(async () => undefined),
}));

const START = '2026-10-25T10:00:00.000Z';
const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
const originalPlatform = Platform.OS;
const latin = /[A-Za-z]/;

beforeAll(() => { installNotificationBehavior(); });
beforeEach(async () => {
  jest.clearAllMocks();
  resetWorkoutNotificationCache();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  await deleteLocalDatabase();
  resetMemorySqlite();
  const seeded = await dbOperation(async db => {
    await db.runAsync("INSERT INTO exercises (id,name,type,source) VALUES ('ex1','بنش برس','weighted','custom')");
    await db.runAsync(
      "INSERT INTO sessions (id,title,source,started_at,state) VALUES ('s1','تمرين دفع','manual',?,'in-progress')",
      [START]);
    await db.runAsync(
      "INSERT INTO session_exercises (id,session_id,exercise_id,position) VALUES ('se1','s1','ex1',0)");
  });
  if (!seeded.ok) throw new Error(seeded.error.message);
});
afterAll(() => { Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform }); });

function posted() {
  return schedule.mock.calls.map(call => call[0] as {
    identifier: string;
    content: { title: string; body: string; sticky?: boolean; categoryIdentifier?: string; sound?: boolean | string };
    trigger: { channelId?: string; date?: Date } | null;
  });
}

test('the clock and the workout notice stay in Arabic without a frozen countdown', async () => {
  expect(formatClock('en', Date.parse('2026-10-25T16:42:00.000Z'))).toMatch(/^\d{2}:\d{2}$/);
  const arabicClock = formatClock('ar', Date.parse('2026-10-25T16:42:00.000Z'));
  expect(arabicClock).toMatch(/^\d{2}:\d{2}$/);
  expect(latin.test(arabicClock)).toBe(false);
  const loaded = await readWorkout('s1');
  if (!loaded.ok || !loaded.value) throw new Error('missing');
  const now = Date.parse(START);
  const working = workoutNotificationText(loaded.value, 'ar', now);
  expect(working.phase).toBe('working');
  expect(working.body).toContain('المجموعة الأولى');
  expect(working.body).toContain('3');
  expect(working.body).not.toContain('1 من');
  expect(latin.test(working.title + working.body)).toBe(false);
  const logged = await logWorkoutSet({
    sessionId: 's1', sessionExerciseId: 'se1', position: 0, side: null,
    kind: 'working', weight: 60, reps: 8, restSec: 90,
  });
  if (!logged.ok || !logged.value.restDeadline) throw new Error('rest missing');
  const again = await readWorkout('s1');
  if (!again.ok || !again.value) throw new Error('missing');
  const resting = workoutNotificationText(again.value, 'ar', Date.parse(logged.value.loggedAt) + 1000);
  expect(resting.phase).toBe('rest');
  expect(resting.title.startsWith('\u2068') || resting.title.includes('\u2068')).toBe(true);
  expect(resting.title).toContain('تنتهي الراحة');
  expect(latin.test(resting.title + resting.body)).toBe(false);
  const english = workoutNotificationText(again.value, 'en', Date.parse(logged.value.loggedAt) + 1000);
  expect(english.title.startsWith('Rest ends at ')).toBe(true);
  expect(english.body).toContain('Next: Set 2 of 3');
});

test('Android posts one ongoing notification and keeps a single rest alert on the deadline', async () => {
  const logged = await logWorkoutSet({
    sessionId: 's1', sessionExerciseId: 'se1', position: 0, side: null,
    kind: 'working', weight: 60, reps: 8, restSec: 90,
  });
  if (!logged.ok || !logged.value.restDeadline) throw new Error('rest missing');
  const now = Date.parse(logged.value.loggedAt) + 1000;
  await alignWorkoutNotifications('ar', now);
  await alignWorkoutNotifications('ar', now);
  const ongoing = posted().filter(call => call.identifier === 'liftria-workout');
  const alerts = posted().filter(call => call.identifier === 'liftria-rest:s1');
  expect(ongoing).toHaveLength(1);
  expect(ongoing[0]?.content.sticky).toBe(true);
  expect(ongoing[0]?.content.sound).toBe(false);
  expect(ongoing[0]?.content.categoryIdentifier).toBe('liftria_workout_rest');
  expect(ongoing[0]?.trigger).toEqual({ channelId: 'liftria-workout' });
  expect(alerts).toHaveLength(1);
  expect(alerts[0]?.trigger && 'date' in alerts[0].trigger && alerts[0].trigger.date?.toISOString())
    .toBe(logged.value.restDeadline);
  expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('liftria-workout',
    expect.objectContaining({ importance: Notifications.AndroidImportance.LOW, sound: null }));
});

test('iPhone keeps the end-of-rest alert and does not post an ongoing workout notification', async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  const logged = await logWorkoutSet({
    sessionId: 's1', sessionExerciseId: 'se1', position: 0, side: null,
    kind: 'working', weight: 60, reps: 8, restSec: 60,
  });
  if (!logged.ok) throw new Error('log failed');
  await alignWorkoutNotifications('en', Date.parse(logged.value.loggedAt) + 500);
  expect(posted().some(call => call.identifier === 'liftria-workout')).toBe(false);
  expect(posted().some(call => call.identifier === 'liftria-rest:s1')).toBe(true);
  expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
});

test('skip and +30 s move the stored deadline and the alert follows', async () => {
  const logged = await logWorkoutSet({
    sessionId: 's1', sessionExerciseId: 'se1', position: 0, side: null,
    kind: 'working', weight: 60, reps: 8, restSec: 90,
  });
  if (!logged.ok || !logged.value.restDeadline) throw new Error('rest missing');
  const before = Date.parse(logged.value.restDeadline);
  let opened = 0;
  await handleNotificationOpen({
    actionIdentifier: REST_ACTION_PLUS_30,
    notification: { date: 10, request: { identifier: 'liftria-workout', content: {
      data: { kind: 'liftria-workout', sessionId: 's1' },
    }, trigger: null } },
  } as unknown as Notifications.NotificationResponse, () => { opened += 1; });
  await handleNotificationOpen({
    actionIdentifier: REST_ACTION_PLUS_30,
    notification: { date: 10, request: { identifier: 'liftria-workout', content: {
      data: { kind: 'liftria-workout', sessionId: 's1' },
    }, trigger: null } },
  } as unknown as Notifications.NotificationResponse, () => { opened += 1; });
  const plus = await readWorkout('s1');
  if (!plus.ok || !plus.value) throw new Error('missing');
  const moved = plus.value.sets[0]?.restDeadline;
  expect(moved).toBeTruthy();
  expect(Math.abs(Date.parse(moved!) - (before + 30_000))).toBeLessThan(2000);
  expect(opened).toBe(1);
  await handleNotificationOpen({
    actionIdentifier: REST_ACTION_SKIP,
    notification: { date: 11, request: { identifier: 'liftria-workout', content: {
      data: { kind: 'liftria-workout', sessionId: 's1' },
    }, trigger: null } },
  } as unknown as Notifications.NotificationResponse, () => { opened += 1; });
  const skipped = await readWorkout('s1');
  if (!skipped.ok || !skipped.value) throw new Error('missing');
  expect(Date.parse(skipped.value.sets[0]!.restDeadline!)).toBeLessThanOrEqual(Date.now());
  expect(opened).toBe(2);
});
