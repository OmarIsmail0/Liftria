import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { armedRestAlert, restAlertId, scheduleRestOver } from '../restAlerts';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async () => 'liftria-rest:workout-1'),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getPresentedNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  dismissNotificationAsync: jest.fn(async () => undefined),
}));
jest.mock('../../../services/database', () => ({
  dbOperation: jest.fn(async (fn: (db: {
    getAllAsync: () => Promise<{ key: string; value: string }[]>;
    runAsync: () => Promise<{ changes: number }>;
  }) => Promise<unknown>) => ({
    ok: true,
    value: await fn({
      getAllAsync: async () => [],
      runAsync: async () => ({ changes: 1 }),
    }),
  })),
}));

const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
const cancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;
const original = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
});
afterAll(() => Object.defineProperty(Platform, 'OS', { configurable: true, value: original }));

test('adjusting rest replaces the one alert instead of scheduling a second', async () => {
  const first = new Date(Date.now() + 60_000).toISOString();
  const second = new Date(Date.now() + 90_000).toISOString();
  (Notifications.getAllScheduledNotificationsAsync as jest.Mock)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{
      identifier: 'old-random',
      content: { data: { kind: 'liftria-rest', sessionId: 'workout-1', setId: 'set-1' } },
    }]);
  await scheduleRestOver(first, 'workout-1', 'Bench', 'set-1');
  await scheduleRestOver(second, 'workout-1', 'Bench', 'set-1');
  expect(schedule).toHaveBeenCalledTimes(2);
  for (const call of schedule.mock.calls) {
    expect(call[0].identifier).toBe(restAlertId('workout-1'));
  }
  expect(cancel).toHaveBeenCalledWith('old-random');
  expect(cancel).toHaveBeenCalledWith(restAlertId('workout-1'));
  const last = schedule.mock.calls[1][0] as { trigger: { date: Date } };
  expect(last.trigger.date.toISOString()).toBe(second);
  expect(armedRestAlert()).toEqual({ sessionId: 'workout-1', deadline: second });
});

test('a deadline that is already over is not scheduled', async () => {
  const past = new Date(Date.now() - 1000).toISOString();
  expect(await scheduleRestOver(past, 'workout-1', 'Bench', 'set-1')).toBeNull();
  expect(schedule).not.toHaveBeenCalled();
});
