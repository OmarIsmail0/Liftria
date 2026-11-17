import { bundledExercises, createCustomExercise, ensureExercisePack, EXERCISE_INSERT_CHUNK, listExercises } from '../exerciseLibrary';
import { initializeDatabase } from '../index';
import { resetMemorySqlite, type MemoryDatabase } from '../../../features/settings/__tests__/memorySqlite';

jest.mock('expo-sqlite', () => jest.requireActual('../../../features/settings/__tests__/memorySqlite').memoryExpoSqlite);

afterAll(() => { resetMemorySqlite(); });

test('chunks stay under the bound-parameter limit', () => {
  expect(EXERCISE_INSERT_CHUNK * 12).toBeLessThanOrEqual(900);
  expect(EXERCISE_INSERT_CHUNK).toBeGreaterThan(1);
});

test('batched seeding yields exactly the rows the one-by-one path produced', async () => {
  const seeded = await ensureExercisePack();
  expect(seeded).toEqual({ ok: true, value: bundledExercises().length });
  const listed = await listExercises(true);
  if (!listed.ok) throw new Error('list failed');
  const expected = bundledExercises();
  expect(listed.value).toHaveLength(expected.length);
  const byId = new Map(listed.value.map(item => [item.id, item]));
  expect([...byId.keys()].sort()).toEqual(expected.map(item => item.id).sort());
  // Full-row comparison for every row, including the first and last of each chunk.
  for (const item of expected) expect(byId.get(item.id)).toEqual(item);
});

test('a second run is a no-op and keeps custom exercises untouched', async () => {
  const custom = await createCustomExercise({ name: 'My lift', equipment: null, type: 'weighted',
    unilateral: false, primaryMuscles: [], secondaryMuscles: [], instructions: [] });
  if (!custom.ok) throw new Error('create failed');
  const db = (await initializeDatabase()) as unknown as MemoryDatabase;
  const count = async () => (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM exercises'))?.n;
  const before = await count();
  expect(await ensureExercisePack()).toEqual({ ok: true, value: 0 });
  expect(await count()).toBe(before);
  // Even a forced re-run cannot overwrite a user's custom row.
  await db.runAsync("DELETE FROM app_settings WHERE key='exercise_pack_version'");
  await ensureExercisePack();
  expect(await count()).toBe(before);
  const again = await listExercises(true);
  if (!again.ok) throw new Error('list failed');
  expect(again.value.find(item => item.id === custom.value.id)).toEqual(custom.value);
});
