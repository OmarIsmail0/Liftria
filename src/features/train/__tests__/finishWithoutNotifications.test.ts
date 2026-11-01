import * as Notifications from 'expo-notifications';
import { dbOperation, deleteLocalDatabase } from '../../../services/database';
import { resetMemorySqlite } from '../../settings/__tests__/memorySqlite';
import { runNotificationTurn } from '../restAlerts';
import {
  completeWorkout, discardInProgressWorkout, readInProgressWorkout, readWorkout, startManualWorkout,
} from '../workoutData';
import { suppressWorkoutNotificationPrompt } from '../workoutNotification';

jest.mock('expo-sqlite', () => jest.requireActual('../../settings/__tests__/memorySqlite').memoryExpoSqlite);
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6, LOW: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ granted: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  scheduleNotificationAsync: jest.fn(async () => { throw new Error('notifications not permitted'); }),
  getAllScheduledNotificationsAsync: jest.fn(async () => { throw new Error('notifications not permitted'); }),
  getPresentedNotificationsAsync: jest.fn(async () => { throw new Error('notifications not permitted'); }),
  cancelScheduledNotificationAsync: jest.fn(async () => { throw new Error('notifications not permitted'); }),
  dismissNotificationAsync: jest.fn(async () => { throw new Error('notifications not permitted'); }),
}));

const denied = new Error('notifications not permitted');

async function finishWithin<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), 400);
  });
  try { return await Promise.race([work, timeout]); }
  finally { if (timer) clearTimeout(timer); }
}
let releaseHungTurn: (() => void) | undefined;

beforeEach(async () => {
  jest.clearAllMocks();
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
  (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockRejectedValue(denied);
  (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockRejectedValue(denied);
  (Notifications.dismissNotificationAsync as jest.Mock).mockRejectedValue(denied);
  await deleteLocalDatabase();
  resetMemorySqlite();
  const seeded = await dbOperation(async db => {
    await db.runAsync(
      "INSERT INTO sessions (id,title,source,started_at,state) VALUES ('empty-demo','Demo · Upper A','manual',?,'in-progress')",
      ['2026-10-25T10:00:00.000Z']);
  });
  if (!seeded.ok) throw new Error(seeded.error.message);
  // The permission sheet's notification work is still pending and must not block finish.
  void runNotificationTurn(() => new Promise<void>(resolve => { releaseHungTurn = resolve; }));
});
afterEach(() => { releaseHungTurn?.(); releaseHungTurn = undefined; });

test('an empty demo finishes and a new workout starts when notifications are not permitted', async () => {
  const finished = await finishWithin(completeWorkout('empty-demo', null), 'completeWorkout waited on notifications');
  expect(finished.ok && finished.value).toBe(true);
  const closed = await readWorkout('empty-demo');
  expect(closed.ok && closed.value?.state).toBe('finished');
  const started = await startManualWorkout('Demo · Superset screenshot');
  expect(started.ok).toBe(true);
  const open = await readInProgressWorkout();
  expect(open.ok && open.value?.title).toBe('Demo · Superset screenshot');
  expect(suppressWorkoutNotificationPrompt('1')).toBe(true);
  expect(suppressWorkoutNotificationPrompt(['1'])).toBe(true);
  expect(suppressWorkoutNotificationPrompt(undefined)).toBe(false);
});

test('discarding also ignores a denied notification permission', async () => {
  const removed = await finishWithin(discardInProgressWorkout('empty-demo'), 'discard waited on notifications');
  expect(removed.ok && removed.value).toBe(true);
  const open = await readInProgressWorkout();
  expect(open.ok && open.value).toBeNull();
});
