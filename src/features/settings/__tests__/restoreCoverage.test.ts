import { exportBackup, parseBackup, restoreBackup } from '../backup';
import { DB_MIGRATIONS, deleteLocalDatabase, initializeDatabase } from '../../../services/database';
import { resetMemorySqlite, tablesCreatedBy, type MemoryDatabase } from './memorySqlite';
import { EVERY_TABLE_ROWS, dumpEveryTable, seedRows } from './everyTableFixture';

jest.mock('expo-sqlite', () => jest.requireActual('./memorySqlite').memoryExpoSqlite);

type Dump = Awaited<ReturnType<typeof dumpEveryTable>>;
type Extra = { sql: string; rows: typeof EVERY_TABLE_ROWS };
const SCHEMA_TABLES = tablesCreatedBy(DB_MIGRATIONS.map(migration => migration.sql));
const openDatabase = async () => (await initializeDatabase()) as unknown as MemoryDatabase;

/** Tables whose rows differ, or are missing, after the round trip. */
function lostInRoundTrip(before: Dump, after: Dump): string[] {
  const tables = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...tables].filter(table => JSON.stringify(before[table] ?? []) !== JSON.stringify(after[table] ?? [])).sort();
}

/** Export a phone that has a row in every table, then restore the file on another phone
 * that already holds different data. `extra` adds a table (as a new migration would). */
async function roundTrip(extra?: Extra): Promise<{ before: Dump; after: Dump }> {
  const phone = await openDatabase();
  if (extra) await phone.execAsync(extra.sql);
  await seedRows(phone, { ...EVERY_TABLE_ROWS, ...extra?.rows });
  const before = await dumpEveryTable(phone);
  expect(Object.keys(before).filter(table => !before[table]?.length)).toEqual([]);

  const exported = await exportBackup();
  if (!exported.ok) throw new Error('Export refused the database: ' + exported.error.message);
  const file = parseBackup(JSON.stringify(exported.value));

  expect(await deleteLocalDatabase()).toEqual({ ok: true, value: undefined });
  const newPhone = await openDatabase();
  if (extra) await newPhone.execAsync(extra.sql);
  await seedRows(newPhone, {
    app_settings: [{ key: 'language', value: '"en"' }],
    water_logs: [{ day: '2026-10-01', glasses: 2, glass_ml: 300, logged_at: '2026-10-01T09:00:00.000Z' }],
  });
  const restored = await restoreBackup(file, 'RESTORE');
  if (!restored.ok) throw new Error('Restore failed: ' + restored.error.message);
  return { before, after: await dumpEveryTable(newPhone) };
}

beforeEach(async () => {
  await deleteLocalDatabase();
  resetMemorySqlite();
});

test('export, then restore on another phone, keeps every row of every table', async () => {
  const { before, after } = await roundTrip();
  expect(Object.keys(before)).toEqual(SCHEMA_TABLES);
  expect(lostInRoundTrip(before, after)).toEqual([]);
  expect(after).toEqual(before);
});

test('a table added to the schema and the fixture is noticed, not silently dropped', async () => {
  const extra: Extra = {
    sql: 'CREATE TABLE IF NOT EXISTS fake_new_table (id TEXT PRIMARY KEY, note TEXT);',
    rows: { fake_new_table: [{ id: 'fake-1', note: 'must survive a restore' }] },
  };
  await expect(roundTrip(extra)).rejects.toThrow('Export refused the database');
});

test('the comparison reports a table whose rows are missing or changed after restore', async () => {
  const { before } = await roundTrip();
  expect(lostInRoundTrip(before, { ...before, water_logs: [] })).toEqual(['water_logs']);
  expect(lostInRoundTrip({ ...before, fake_new_table: [{ id: 'fake-1', note: null }] }, before))
    .toEqual(['fake_new_table']);
  expect(lostInRoundTrip(before, { ...before, profile: [{ ...before.profile![0]!, name: null }] })).toEqual(['profile']);
});
