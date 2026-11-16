import { BACKUP_TABLES, exportBackup, parseBackup, restoreBackup, type BackupData } from '../backup';
import { DB_SCHEMA_VERSION, deleteLocalDatabase, initializeDatabase } from '../../../services/database';
import { resetMemorySqlite, type MemoryDatabase } from './memorySqlite';
import { EVERY_TABLE_ROWS, dumpEveryTable, seedRows } from './everyTableFixture';

jest.mock('expo-sqlite', () => jest.requireActual('./memorySqlite').memoryExpoSqlite);

/* Synthetic fixtures only. A restore that cannot be applied in full must leave the
 * phone's existing data exactly as it was: never a partial or empty database. */
const openDatabase = async () => (await initializeDatabase()) as unknown as MemoryDatabase;

async function phoneWithData() {
  const db = await openDatabase();
  await seedRows(db, EVERY_TABLE_ROWS);
  return { db, before: await dumpEveryTable(db) };
}
async function validBackup(): Promise<BackupData> {
  const exported = await exportBackup();
  if (!exported.ok) throw new Error('export failed');
  return parseBackup(JSON.stringify(exported.value));
}

beforeEach(async () => {
  await deleteLocalDatabase();
  resetMemorySqlite();
});

test('truncated, empty, foreign or wrong-version files are refused before anything is touched', async () => {
  const { db, before } = await phoneWithData();
  const text = JSON.stringify((await exportBackup() as { ok: true; value: BackupData }).value);
  const bad = [
    '', text.slice(0, Math.floor(text.length / 2)), '{}', '[]', 'null', 'not json',
    JSON.stringify({ format: 'other-app', formatVersion: 1 }),
    text.replace('"formatVersion":1', '"formatVersion":2'),
    text.replace('"schemaVersion":' + DB_SCHEMA_VERSION, '"schemaVersion":' + (DB_SCHEMA_VERSION + 1)),
    text.replace('"schemaVersion":' + DB_SCHEMA_VERSION, '"schemaVersion":5'),
    text.replace('"exportedAt":"', '"exportedAt":"not a date'),
  ];
  for (const raw of bad) expect(() => parseBackup(raw)).toThrow();
  expect(await dumpEveryTable(db)).toEqual(before);
});

test('a file over the size limit is refused without parsing', () => {
  const huge = { length: 100 * 1024 * 1024 + 1 } as unknown as string;
  expect(() => parseBackup(huge)).toThrow('Backup is too large');
});

test('a row the schema rejects part way through rolls the whole restore back', async () => {
  const { db, before } = await phoneWithData();
  const backup = await validBackup();
  // Every table before water_logs restores fine; then a row its CHECK refuses.
  const broken: BackupData = { ...backup, tables: { ...backup.tables, water_logs: [
    ...(backup.tables.water_logs ?? []), { day: '2099-01-01', glasses: -5, glass_ml: 250, logged_at: '2099-01-01T00:00:00.000Z' },
  ] } };
  const result = await restoreBackup(broken, 'RESTORE');
  expect(result.ok).toBe(false);
  expect(await dumpEveryTable(db)).toEqual(before);
});

test('duplicate primary keys and unknown columns fail without wiping existing data', async () => {
  const { db, before } = await phoneWithData();
  const backup = await validBackup();
  const settings = backup.tables.app_settings ?? [];
  const duplicate: BackupData = { ...backup, tables: { ...backup.tables, app_settings: [...settings, ...settings] } };
  expect((await restoreBackup(duplicate, 'RESTORE')).ok).toBe(false);
  expect(await dumpEveryTable(db)).toEqual(before);
  const unknown: BackupData = { ...backup, tables: { ...backup.tables,
    weights: [{ ...(backup.tables.weights?.[0] ?? {}), not_a_column: 1 }] } };
  expect((await restoreBackup(unknown, 'RESTORE')).ok).toBe(false);
  expect(await dumpEveryTable(db)).toEqual(before);
});

test('restore never runs without the typed confirmation', async () => {
  const { db, before } = await phoneWithData();
  const backup = await validBackup();
  const empty: BackupData = { ...backup, tables: Object.fromEntries(BACKUP_TABLES.map(table => [table, []])) };
  for (const typed of ['', 'restore', 'RESTORE ', 'DELETE']) {
    expect((await restoreBackup(empty, typed)).ok).toBe(false);
  }
  expect(await dumpEveryTable(db)).toEqual(before);
});
