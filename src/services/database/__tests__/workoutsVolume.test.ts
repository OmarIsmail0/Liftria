import * as SQLite from 'expo-sqlite';
import { DB_MIGRATIONS, DB_NAME } from '../index';
import { historyNumbers, readHistoryDetail, readLatestStrengthObservation, readStrengthObservations, readWorkoutsVolume } from '../historyRepository';
import { resetMemorySqlite } from '../../../features/settings/__tests__/memorySqlite';

jest.mock('expo-sqlite', () => jest.requireActual('../../../features/settings/__tests__/memorySqlite').memoryExpoSqlite);

// One seeded database for the file: dbOperation keeps its connection between tests.
beforeAll(async () => { await seed(); });
afterAll(() => { resetMemorySqlite(); });

async function seed() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  for (const migration of DB_MIGRATIONS) {
    await db.execAsync(migration.sql);
    await db.execAsync('PRAGMA user_version = ' + migration.version + ';');
  }
  await db.runAsync("INSERT INTO exercises (id,name,type,source,unilateral) VALUES ('bench','Bench','weighted','custom',0)");
  await db.runAsync("INSERT INTO exercises (id,name,type,source,unilateral) VALUES ('curl','One arm curl','dumbbell','custom',1)");
  const session = async (id: string, startedAt: string, state: string) => db.runAsync(
    'INSERT INTO sessions (id,title,source,started_at,ended_at,state) VALUES (?,?,?,?,?,?)',
    [id, id, 'manual', startedAt, startedAt, state]);
  await session('a', '2026-11-01T10:00:00.000Z', 'finished');
  await session('b', '2026-11-03T10:00:00.000Z', 'finished');
  await session('live', '2026-11-04T10:00:00.000Z', 'in-progress');
  const exercise = async (id: string, sessionId: string, exerciseId: string, position: number) => db.runAsync(
    'INSERT INTO session_exercises (id,session_id,exercise_id,position) VALUES (?,?,?,?)', [id, sessionId, exerciseId, position]);
  await exercise('a1', 'a', 'bench', 0);
  await exercise('a2', 'a', 'curl', 1);
  await exercise('b1', 'b', 'bench', 0);
  await exercise('l1', 'live', 'bench', 0);
  const set = async (id: string, se: string, position: number, kind: string, side: string | null, weight: number, reps: number, at: string) =>
    db.runAsync('INSERT INTO sets (id,session_exercise_id,position,kind,side,weight,reps,logged_at) VALUES (?,?,?,?,?,?,?,?)',
      [id, se, position, kind, side, weight, reps, at]);
  await set('s1', 'a1', 0, 'working', null, 80, 5, '2026-11-01T10:01:00.000Z');
  await set('s2', 'a1', 1, 'working', null, 80, 5, '2026-11-01T10:05:00.000Z');
  await set('s3', 'a1', 2, 'warm-up', null, 40, 10, '2026-11-01T10:08:00.000Z');
  await set('s4', 'a2', 0, 'working', 'L', 20, 10, '2026-11-01T10:10:00.000Z');
  await set('s5', 'a2', 0, 'working', 'R', 20, 10, '2026-11-01T10:11:00.000Z');
  await set('s6', 'b1', 0, 'working', null, 100, 3, '2026-11-03T10:01:00.000Z');
  await set('s7', 'l1', 0, 'working', null, 999, 9, '2026-11-04T10:01:00.000Z');
}

test('workouts volume in two queries equals the sum of each workout detail', async () => {
  const expected = async (id: string) => {
    const detail = await readHistoryDetail(id);
    return detail.ok && detail.value ? historyNumbers(detail.value).volume : 0;
  };
  const total = (await expected('a')) + (await expected('b'));
  expect(total).toBeGreaterThan(0);
  expect(await readWorkoutsVolume(['a', 'b'])).toEqual({ ok: true, value: total });
  expect(await readWorkoutsVolume(['a', 'a', 'b'])).toEqual({ ok: true, value: total });
  // An unfinished workout never counts, and an empty list reads nothing.
  expect(await readWorkoutsVolume(['live'])).toEqual({ ok: true, value: 0 });
  expect(await readWorkoutsVolume([])).toEqual({ ok: true, value: 0 });
});

test('the Progress tab reads one newest loaded working set of a finished workout', async () => {
  const all = await readStrengthObservations();
  const latest = await readLatestStrengthObservation();
  if (!all.ok || !latest.ok) throw new Error('read failed');
  const wanted = all.value.filter(row => row.weight > 0 && row.reps > 0)
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))[0];
  expect(latest.value).toHaveLength(1);
  expect(latest.value[0]).toEqual(wanted);
  expect(latest.value[0]?.weight).not.toBe(999);
});
