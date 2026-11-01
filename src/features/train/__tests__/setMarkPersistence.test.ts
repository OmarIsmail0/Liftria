import { deleteLocalDatabase, dbOperation } from '../../../services/database';
import { setVolume, calculateRecords } from '../../../services/database/gymMath';
import { readHistoryDetail, saveFinishedWorkout } from '../../../services/database/historyRepository';
import { exerciseSessionSets } from '../../../services/database/gymRepositories';
import { resetMemorySqlite } from '../../settings/__tests__/memorySqlite';
import { buildSetRows } from '../setTable';
import { logWorkoutSet, readWorkout, updateLoggedSetKind, workoutNumbers } from '../workoutData';

jest.mock('expo-sqlite', () => jest.requireActual('../../settings/__tests__/memorySqlite').memoryExpoSqlite);

const START = '2026-11-01T10:00:00.000Z';

beforeEach(async () => {
  await deleteLocalDatabase();
  resetMemorySqlite();
  const seeded = await dbOperation(async db => {
    await db.runAsync(
      "INSERT INTO exercises (id,name,type,source) VALUES ('ex1','Bench Press','weighted','custom')");
    await db.runAsync(
      "INSERT INTO sessions (id,title,source,started_at,state) VALUES ('s1','Push','manual',?,'in-progress')",
      [START]);
    await db.runAsync(
      "INSERT INTO session_exercises (id,session_id,exercise_id,position) VALUES ('se1','s1','ex1',0)");
  });
  if (!seeded.ok) throw new Error(seeded.error.message);
});

test('a drop set and a failure set survive reload and still count as working volume', async () => {
  const drop = await logWorkoutSet({
    sessionId: 's1', sessionExerciseId: 'se1', position: 0, side: null,
    kind: 'working', mark: 'drop', weight: 40, reps: 10, restSec: 0,
  });
  const failure = await logWorkoutSet({
    sessionId: 's1', sessionExerciseId: 'se1', position: 1, side: null,
    kind: 'working', mark: 'failure', weight: 55, reps: 6, restSec: 0,
  });
  if (!drop.ok || !failure.ok) throw new Error('log failed');
  expect(drop.value.kind).toBe('working');
  expect(drop.value.mark).toBe('drop');
  expect(failure.value.mark).toBe('failure');

  const loaded = await readWorkout('s1');
  if (!loaded.ok || !loaded.value) throw new Error('workout missing');
  expect(loaded.value.sets.map(set => [set.kind, set.mark])).toEqual([
    ['working', 'drop'],
    ['working', 'failure'],
  ]);
  const rows = buildSetRows({
    sessionExerciseId: 'se1', targetSets: 3, unilateral: false, extraRows: 0,
    sets: loaded.value.sets, marks: {},
  });
  expect(rows.map(row => row.mark)).toEqual(['drop', 'failure', 'working']);
  expect(workoutNumbers(loaded.value).volume).toBe(40 * 10 + 55 * 6);
  expect(setVolume('weighted', loaded.value.sets[0]!)).toBe(400);
  expect(calculateRecords([{
    exerciseId: 'ex1', type: 'weighted', sessionId: 's1', endedAt: START,
    kind: loaded.value.sets[1]!.kind, side: null, weight: 55, reps: 6,
  }])[0]?.heaviest).toBe(55);

  const changed = await updateLoggedSetKind(failure.value.id, 's1', 'working', 'drop');
  expect(changed.ok && changed.value).toBe(true);
  const again = await readWorkout('s1');
  if (!again.ok || !again.value) throw new Error('workout missing');
  expect(again.value.sets.map(set => set.mark)).toEqual(['drop', 'drop']);

  const finished = await dbOperation(async db => {
    await db.runAsync("UPDATE sessions SET state='finished', ended_at=? WHERE id=?", [START, 's1']);
  });
  if (!finished.ok) throw new Error(finished.error.message);
  const detail = await readHistoryDetail('s1');
  if (!detail.ok || !detail.value) throw new Error('history missing');
  const edits = detail.value.exercises.flatMap(exercise => exercise.sets.map(set => ({
    id: set.id, sessionExerciseId: set.sessionExerciseId, position: set.position,
    kind: set.kind, mark: set.mark, side: set.side, weight: set.weight + 1, reps: set.reps,
    rpe: set.rpe ?? null, rir: set.rir ?? null,
  })));
  const saved = await saveFinishedWorkout('s1', 'Push', null, edits);
  expect(saved.ok && saved.value).toBe(true);
  const kept = await readHistoryDetail('s1');
  if (!kept.ok || !kept.value) throw new Error('history missing');
  expect(kept.value.exercises[0]?.sets.map(set => [set.mark, set.weight])).toEqual([
    ['drop', 41],
    ['drop', 56],
  ]);
  const onExercise = await exerciseSessionSets('ex1');
  if (!onExercise.ok) throw new Error(onExercise.error.message);
  expect(onExercise.value.map(set => set.mark)).toEqual(['drop', 'drop']);
});
