import { countExercises, ensureExercisePack, listExercises } from '../exerciseLibrary';
import { resetMemorySqlite } from '../../../features/settings/__tests__/memorySqlite';

jest.mock('expo-sqlite', () => jest.requireActual('../../../features/settings/__tests__/memorySqlite').memoryExpoSqlite);

afterAll(() => { resetMemorySqlite(); });

test('the list summary matches the full list except that it leaves out instruction steps', async () => {
  expect((await ensureExercisePack()).ok).toBe(true);
  const full = await listExercises();
  const summary = await listExercises(false, true);
  if (!full.ok || !summary.ok) throw new Error('list failed');
  expect(full.value.length).toBeGreaterThan(800);
  expect(summary.value).toHaveLength(full.value.length);
  expect(full.value.some(item => item.instructions.length > 0)).toBe(true);
  expect(summary.value.every(item => item.instructions.length === 0)).toBe(true);
  expect(summary.value.map(item => ({ ...item, instructions: [] }))).toEqual(
    full.value.map(item => ({ ...item, instructions: [] })));
});

test('the Train tab counts the library without reading it', async () => {
  const full = await listExercises();
  if (!full.ok) throw new Error('list failed');
  expect(await countExercises()).toEqual({ ok: true, value: full.value.length });
});
