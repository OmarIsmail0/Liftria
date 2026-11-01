import { deleteLocalDatabase, dbOperation } from '../../../services/database';
import { resetMemorySqlite } from '../../settings/__tests__/memorySqlite';
import { editLoggedSet, logWorkoutSet, readWorkout, removeLoggedSet } from '../workoutData';
import { selectCurrentRest } from '../restClock';

jest.mock('expo-sqlite', () => jest.requireActual('../../settings/__tests__/memorySqlite').memoryExpoSqlite);
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6, LOW: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ granted: false })),
  scheduleNotificationAsync: jest.fn(async () => 'scheduled-1'),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getPresentedNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  dismissNotificationAsync: jest.fn(async () => undefined),
}));

const START = '2026-10-25T10:00:00.000Z';

beforeEach(async () => {
  await deleteLocalDatabase();
  resetMemorySqlite();
  const seeded = await dbOperation(async db => {
    await db.runAsync(
      "INSERT INTO exercises (id,name,type,source) VALUES ('ex1','Bench Press','weighted','custom')");
    await db.runAsync(
      "INSERT INTO exercises (id,name,type,source) VALUES ('ex2','Squat','weighted','custom')");
    await db.runAsync(
      "INSERT INTO sessions (id,title,source,started_at,state) VALUES ('s1','Push','manual',?,'in-progress')",
      [START]);
    await db.runAsync(
      "INSERT INTO session_exercises (id,session_id,exercise_id,position) VALUES ('se1','s1','ex1',0)");
    await db.runAsync(
      "INSERT INTO session_exercises (id,session_id,exercise_id,position) VALUES ('se2','s1','ex2',1)");
  });
  if (!seeded.ok) throw new Error(seeded.error.message);
});

async function deadlines(): Promise<(string | null)[]> {
  const loaded = await readWorkout('s1');
  if (!loaded.ok || !loaded.value) throw new Error('workout missing');
  return loaded.value.sets
    .slice()
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
    .map(set => set.restDeadline);
}

test('a later set replaces the earlier rest, and a superset step with no rest leaves none', async () => {
  const first = await logWorkoutSet({
    sessionId: 's1', sessionExerciseId: 'se1', position: 0, side: null,
    kind: 'working', weight: 60, reps: 8, restSec: 90,
  });
  if (!first.ok) throw new Error(first.error.message);
  expect(first.value.restDeadline).not.toBeNull();
  const step = await logWorkoutSet({
    sessionId: 's1', sessionExerciseId: 'se2', position: 0, side: null,
    kind: 'working', weight: 80, reps: 5, restSec: 0,
  });
  if (!step.ok) throw new Error(step.error.message);
  expect(await deadlines()).toEqual([null, null]);
  const loaded = await readWorkout('s1');
  if (!loaded.ok || !loaded.value) throw new Error('workout missing');
  expect(selectCurrentRest(loaded.value.sets, loaded.value.state, Date.now()).status).toBe('idle');
});

test('undo and edit do not leave a running rest behind', async () => {
  const first = await logWorkoutSet({
    sessionId: 's1', sessionExerciseId: 'se1', position: 0, side: null,
    kind: 'working', weight: 60, reps: 8, restSec: 90,
  });
  const second = await logWorkoutSet({
    sessionId: 's1', sessionExerciseId: 'se1', position: 1, side: null,
    kind: 'working', weight: 60, reps: 8, restSec: 90,
  });
  if (!first.ok || !second.ok) throw new Error('log failed');
  const edited = await editLoggedSet(second.value.id, 's1', 62, 6);
  expect(edited.ok && edited.value).toBe(true);
  expect(await deadlines()).toEqual([null, null]);
  const again = await logWorkoutSet({
    sessionId: 's1', sessionExerciseId: 'se1', position: 2, side: null,
    kind: 'working', weight: 60, reps: 8, restSec: 60,
  });
  if (!again.ok) throw new Error(again.error.message);
  const removed = await removeLoggedSet(again.value.id, 's1');
  expect(removed.ok && removed.value).toBe(true);
  expect(await deadlines()).toEqual([null, null]);
  const loaded = await readWorkout('s1');
  if (!loaded.ok || !loaded.value) throw new Error('workout missing');
  expect(selectCurrentRest(loaded.value.sets, 'in-progress', Date.now()).status).toBe('idle');
});
