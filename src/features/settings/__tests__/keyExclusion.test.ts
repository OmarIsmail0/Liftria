import { exportBackup } from '../backup';
import { csvRows, diaryCsv, measurementsCsv, workoutCsv } from '../csvExport';
import { deleteLocalDatabase, initializeDatabase } from '../../../services/database';
import { deleteKey, saveKey } from '../../../services/secure-storage';
import { resetMemorySqlite, type MemoryDatabase } from './memorySqlite';
import { EVERY_TABLE_ROWS, seedRows } from './everyTableFixture';

const SYNTHETIC_KEY = 'sk-ant-api03-SYNTHETIC-not-a-real-key-0000';
const mockSecureItems = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(async (key: string) => mockSecureItems.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { mockSecureItems.set(key, value); }),
  deleteItemAsync: jest.fn(async (key: string) => { mockSecureItems.delete(key); }),
}));
jest.mock('expo-sqlite', () => jest.requireActual('./memorySqlite').memoryExpoSqlite);

beforeEach(async () => {
  await deleteLocalDatabase();
  resetMemorySqlite();
  mockSecureItems.clear();
});

test('the Hiku key lives only in the secure store: the JSON backup and every CSV export never contain it', async () => {
  await seedRows((await initializeDatabase()) as unknown as MemoryDatabase, EVERY_TABLE_ROWS);
  expect(await saveKey(SYNTHETIC_KEY)).toMatchObject({ status: 'ready' });
  expect([...mockSecureItems.values()]).toEqual([SYNTHETIC_KEY]);

  const backup = await exportBackup();
  if (!backup.ok) throw new Error('export failed');
  const outputs = [JSON.stringify(backup.value)];
  for (const csv of [await workoutCsv(), await diaryCsv(), await measurementsCsv()]) {
    if (!csv.ok) throw new Error('csv export failed');
    outputs.push(csv.value);
  }
  for (const text of outputs) {
    expect(text).not.toContain(SYNTHETIC_KEY);
    expect(text).not.toContain('SYNTHETIC-not-a-real-key');
    expect(text).not.toContain('liftria.anthropic.api-key');
  }
  expect(await deleteKey()).toEqual({ status: 'missing' });
  expect(mockSecureItems.size).toBe(0);
});

test('csvRows neutralises spreadsheet formulas in exports', () => {
  expect(csvRows([['=1+1', '+SUM(A1)', '@x', '-5']])).toBe(`"'=1+1","'+SUM(A1)","'@x","'-5"\r\n`);
});
