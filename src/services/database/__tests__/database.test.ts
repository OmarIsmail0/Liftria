import {
  initializeDatabase, schemaVersion, addTestData, readTestData, clearTestData,
  setSetting, getSetting, deleteSetting, saveHealthValues, listCachedHealth,
} from '../index';
import { createWorkout, getWorkout, updateWorkout, deleteWorkout,
  createNutrition, getNutrition, updateNutrition, deleteNutrition,
  getLastWorkout, getLastNutrition } from '../repositories';

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
type MockDatabase = {
  execAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
  runAsync: jest.Mock;
  withExclusiveTransactionAsync: jest.Mock;
};
const mockDb: MockDatabase = {
  execAsync: jest.fn(async (sql: string) => {
    const match = sql.match(/PRAGMA user_version = (\d+)/);
    if (match) state.schema = Number(match[1]);
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
    if (sql.includes('FROM test_workout_sessions')) {
      if (sql.includes('ORDER BY id DESC')) return [...state.sessions.values()].at(-1) ?? null;
      return state.sessions.get(args[0] as number) ?? null;
    }
    if (sql.includes('FROM test_nutrition_entries')) {
      if (sql.includes('ORDER BY id DESC')) return [...state.meals.values()].at(-1) ?? null;
      return state.meals.get(args[0] as number) ?? null;
    }
    return null;
  }),
  getAllAsync: jest.fn(async (sql: string, args: unknown[] = []) => {
    if (sql.includes('FROM health_samples')) return [...state.health.values()].slice(0, args[0] as number);
    if (sql.includes('FROM health_aggregates')) return [...state.aggregates.values()];
    return [];
  }),
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
    } else if (sql.includes('DELETE FROM test_workout_sets WHERE session_id')) {
      for (const [setId, set] of state.sets) if (set.session_id === args[0]) state.sets.delete(setId);
    } else if (sql.includes('DELETE FROM test_workout_sets')) state.sets.clear();
    else if (sql.includes('DELETE FROM test_workout_sessions WHERE id')) state.sessions.delete(args[0] as number); else if (sql.includes('DELETE FROM test_nutrition_entries WHERE id')) state.meals.delete(args[0] as number);
    else if (sql.includes('DELETE FROM test_workout_sessions')) state.sessions.clear();
    else if (sql.includes('DELETE FROM test_nutrition_entries')) state.meals.clear();
    else if (sql.includes('INSERT INTO health_samples')) {
      state.health.set(`${args[0]}:${args[1]}`, { payload_json: args[5] });
    } else if (sql.includes('INSERT INTO health_aggregates')) {
      state.aggregates.set(`${args[0]}:${args[1]}:${args[2]}:${args[3]}`, {
        adapter: args[0], operation: args[1], window_start: args[2], window_end: args[3], payload_json: args[4],
      });
    } else if (sql.includes('DELETE FROM health_aggregates')) {
      state.aggregates.delete(`${args[0]}:${args[1]}:${args[2]}:${args[3]}`);
    }
    return { lastInsertRowId: id, changes };
  }),
  withExclusiveTransactionAsync: jest.fn(async (f: (tx: MockDatabase) => Promise<unknown>): Promise<void> => { await f(mockDb); }),
};
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(async () => mockDb) }));

test('versioned migration, marker persistence and multirow insert', async () => {
  await initializeDatabase();
  expect(await schemaVersion()).toEqual({ ok: true, value: 8 });
  expect(mockDb.withExclusiveTransactionAsync).toHaveBeenCalled();
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
  expect(typeof w.value).toBe('number'); // Real API transaction returns void; ID must be captured outside.
  expect(await getWorkout(w.value)).toMatchObject({ ok: true, value: { title: 'Gym' } });
  expect(await getLastWorkout()).toMatchObject({ ok: true, value: { id: w.value } });
  expect(await getLastNutrition()).toMatchObject({ ok: true, value: { id: n.value } });
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
test('source-less energy estimates never enter the cache, even via direct persistence', async () => {
  const estimate = {
    kind: 'aggregate' as const, metric: 'total-calories' as const,
    adapter: 'health-connect' as const, operation: 'ENERGY_TOTAL',
    windowStart: '2026-10-18T00:00:00Z', windowEnd: '2026-10-19T00:00:00Z',
    value: 1564.5, unit: 'kcal' as const, dataOrigins: [],
  };
  const watchBacked = {
    ...estimate, windowStart: '2026-10-19T00:00:00Z', windowEnd: '2026-10-20T00:00:00Z',
    value: 260, dataOrigins: ['com.sec.android.app.shealth'],
  };
  expect(await saveHealthValues([estimate, watchBacked])).toEqual({ ok: true, value: 1 });
  const cached = await listCachedHealth();
  expect(cached.ok).toBe(true);
  if (cached.ok) {
    expect(cached.value).not.toEqual(expect.arrayContaining([expect.objectContaining({
      kind: 'aggregate', value: 1564.5,
    })]));
    expect(cached.value).toEqual(expect.arrayContaining([expect.objectContaining({
      kind: 'aggregate', value: 260,
    })]));
  }
});

test('legacy source-less energy entries are filtered and purged without removing sourced data', async () => {
  const legacy = {
    kind: 'aggregate' as const, metric: 'basal-metabolic-rate' as const,
    adapter: 'health-connect' as const, operation: 'BASAL_CALORIES_TOTAL',
    windowStart: '2026-10-20T00:00:00Z', windowEnd: '2026-10-21T00:00:00Z',
    value: 1564.5, unit: 'kcal' as const, dataOrigins: [],
  };
  // A source-backed aggregate seeded here, so this test doesn't depend on rows left by earlier tests.
  const sourced = { ...legacy, operation: 'ACTIVE_CALORIES_TOTAL', value: 260, dataOrigins: ['com.sec.android.app.shealth'] };
  const seed = (v: Omit<typeof legacy, 'dataOrigins'> & { dataOrigins: string[] }) => {
    const k = `${v.adapter}:${v.operation}:${v.windowStart}:${v.windowEnd}`;
    state.aggregates.set(k, {
      adapter: v.adapter, operation: v.operation,
      window_start: v.windowStart, window_end: v.windowEnd, payload_json: JSON.stringify(v),
    });
    return k;
  };
  const key = seed(legacy);
  const sourcedKey = seed(sourced);
  expect(state.aggregates.has(key)).toBe(true);
  const cached = await listCachedHealth();
  expect(cached.ok).toBe(true);
  if (cached.ok) {
    expect(cached.value.some(value => value.kind === 'aggregate' && value.value === 1564.5)).toBe(false);
    expect(cached.value.some(value => value.kind === 'aggregate' && value.value === 260)).toBe(true);
  }
  expect(state.aggregates.has(key)).toBe(false);
  expect(state.aggregates.has(sourcedKey)).toBe(true);
});

test('clear removes diagnostic data but keeps imported health records', async () => {
  await clearTestData();
  const result = await readTestData();
  if (result.ok) expect(result.value).toMatchObject({ workouts: 0, sets: 0, meals: 0, healthSamples: 1 });
});
