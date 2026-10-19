/* Mock-backed contract tests. NOT proof of Android SQLite integration. */
type DbRow = Record<string, unknown>;
const state = {
  schema: 0,
  nextId: 1,
  settings: new Map<string, string>(),
  sessions: new Map<number, DbRow>(),
  sets: new Map<number, DbRow>(),
  meals: new Map<number, DbRow>(),
  health: new Map<string, DbRow>(),
  aggregates: new Map<string, DbRow>(),
};
const fakeDb = {
  execAsync: jest.fn(async (sql: string) => {
    if (sql.includes('PRAGMA user_version = 1')) state.schema = 1;
  }),
  getFirstAsync: jest.fn(async (sql: string, args: unknown[] = []) => {
    if (sql.includes('PRAGMA user_version')) return { user_version: state.schema };
    if (sql.includes('COUNT(*)')) {
      const table = sql.match(/FROM (\w+)/)?.[1];
      const size = table === 'test_workout_sessions' ? state.sessions.size
        : table === 'test_workout_sets' ? state.sets.size
        : table === 'test_nutrition_entries' ? state.meals.size
        : table === 'health_samples' ? state.health.size : state.aggregates.size;
      return { total: size };
    }
    if (sql.includes('FROM app_settings')) {
      const key = (sql.includes('persistence_marker') ? 'persistence_marker' : args[0]) as string;
      return state.settings.has(key) ? { value: state.settings.get(key) } : null;
    }
    if (sql.includes('FROM test_workout_sessions')) return state.sessions.get(args[0] as number) ?? null;
    if (sql.includes('FROM test_nutrition_entries')) return state.meals.get(args[0] as number) ?? null;
    return null;
  }),
  getAllAsync: jest.fn(async () => []),
  runAsync: jest.fn(async (sql: string, args: unknown[] = []) => {
    const id = state.nextId++;
    let changes = 1;
    if (sql.includes('INSERT INTO app_settings')) state.settings.set(args[0] as string, args[1] as string);
    else if (sql.includes('DELETE FROM app_settings')) state.settings.delete(sql.includes('persistence_marker') ? 'persistence_marker' : args[0] as string);
    else if (sql.includes('INSERT INTO test_workout_sessions')) state.sessions.set(id, { id, title: args[0], started_at: args[1] });
    else if (sql.includes('INSERT INTO test_workout_sets')) state.sets.set(id, { id, session_id: args[0], exercise: args[1] });
    else if (sql.includes('INSERT INTO test_nutrition_entries')) state.meals.set(id, {
      id, description: args[0], quantity: args[1], unit: args[2], consumed_at: args[3],
    });
    else if (sql.includes('UPDATE test_workout_sessions')) {
      const found = state.sessions.get(args[1] as number);
      if (found) found.title = args[0]; else changes = 0;
    } else if (sql.includes('UPDATE test_nutrition_entries')) {
      const found = state.meals.get(args[2] as number);
      if (found) { found.description = args[0]; found.quantity = args[1]; } else changes = 0;
    } else if (sql.includes('DELETE FROM test_workout_sessions WHERE id')) {
      state.sessions.delete(args[0] as number);
      for (const [setId, set] of state.sets) if (set.session_id === args[0]) state.sets.delete(setId);
    } else if (sql.includes('DELETE FROM test_nutrition_entries WHERE id')) state.meals.delete(args[0] as number);
    else if (sql.includes('DELETE FROM test_workout_sessions')) { state.sessions.clear(); state.sets.clear(); }
    else if (sql.includes('DELETE FROM test_nutrition_entries')) state.meals.clear();
    else if (sql.includes('INSERT INTO health_samples')) {
      state.health.set(`${args[0]}:${args[1]}`, { payload_json: args[5] });
    } else if (sql.includes('INSERT INTO health_aggregates')) {
      state.aggregates.set(`${args[0]}:${args[1]}:${args[2]}:${args[3]}`, { payload_json: args[4] });
    }
    return { lastInsertRowId: id, changes };
  }),
  withExclusiveTransactionAsync: jest.fn(async (f: (tx: unknown) => Promise<unknown>) => f(fakeDb)),
};
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(async () => fakeDb) }));
import {
  initializeDatabase, schemaVersion, addTestData, readTestData, clearTestData,
  setSetting, getSetting, deleteSetting, saveHealthValues,
} from '../index';
import { createWorkout, getWorkout, updateWorkout, deleteWorkout,
  createNutrition, getNutrition, updateNutrition, deleteNutrition } from '../repositories';

test('versioned migration, marker persistence and multirow insert', async () => {
  await initializeDatabase();
  expect(await schemaVersion()).toEqual({ ok: true, value: 1 });
  expect(fakeDb.withExclusiveTransactionAsync).toHaveBeenCalled();
  expect((await addTestData()).ok).toBe(true);
  const read = await readTestData();
  expect(read.ok).toBe(true);
  if (read.ok) expect(read.value).toMatchObject({ workouts: 1, sets: 1, meals: 1 });
});
test('settings CRUD and updates', async () => {
  expect((await setSetting('unit', 'kg')).ok).toBe(true);
  expect(await getSetting('unit')).toEqual({ ok: true, value: 'kg' });
  expect((await setSetting('unit', 'lb')).ok).toBe(true);
  expect(await getSetting('unit')).toEqual({ ok: true, value: 'lb' });
  await deleteSetting('unit');
  expect(await getSetting('unit')).toEqual({ ok: true, value: null });
});
test('workout and nutrition CRUD', async () => {
  const w = await createWorkout('Gym', 'Squat', 8, 40);
  const n = await createNutrition('Egg', 2, 'piece');
  expect(w.ok && n.ok).toBe(true);
  if (!w.ok || !n.ok) return;
  expect(await getWorkout(w.value)).toMatchObject({ ok: true, value: { title: 'Gym' } });
  expect(await updateWorkout(w.value, 'Gym revised')).toEqual({ ok: true, value: 1 });
  expect(await getNutrition(n.value)).toMatchObject({ ok: true, value: { quantity: 2 } });
  expect(await updateNutrition(n.value, 'Eggs', 3)).toEqual({ ok: true, value: 1 });
  expect(await deleteWorkout(w.value)).toEqual({ ok: true, value: 1 });
  expect(await deleteNutrition(n.value)).toEqual({ ok: true, value: 1 });
  expect(await getWorkout(w.value)).toEqual({ ok: true, value: null });
});
test('import uses adapter/source ID upsert key and never deduplicates by synthetic key', async () => {
  const sample = { kind: 'interval' as const, metric: 'steps' as const,
    adapter: 'health-connect' as const, recordId: 's-1', dataOrigin: 'com.sec.android.app.shealth',
    start: '2026-10-18T00:00:00Z', end: '2026-10-18T01:00:00Z', value: 20, unit: 'count' as const };
  expect((await saveHealthValues([sample, sample])).ok).toBe(true);
  expect(state.health.size).toBe(1);
});
test('clear removes diagnostic data but keeps imported health records', async () => {
  await clearTestData();
  const result = await readTestData();
  if (result.ok) expect(result.value).toMatchObject({ workouts: 0, meals: 0, healthSamples: 1 });
});
