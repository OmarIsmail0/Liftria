import { BACKUP_GROUPS, BACKUP_MANIFEST, BACKUP_TABLES, exportBackup } from '../backup';
import { DB_MIGRATIONS, dbOperation, deleteLocalDatabase } from '../../../services/database';
import { resetMemorySqlite, tablesCreatedBy } from './memorySqlite';

jest.mock('expo-sqlite', () => jest.requireActual('./memorySqlite').memoryExpoSqlite);

const MIGRATION_SQL = DB_MIGRATIONS.map(migration => migration.sql);
const FAKE_TABLE_SQL = 'CREATE TABLE IF NOT EXISTS fake_new_table (id TEXT PRIMARY KEY, note TEXT);';

/** Table names as written in the migrations' CREATE TABLE statements. */
function declaredTables(migrations: readonly string[]): string[] {
  const names = new Set<string>();
  const pattern = /CREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`[]?([A-Za-z_][A-Za-z0-9_]*)/gi;
  for (const sql of migrations) for (const match of sql.matchAll(pattern)) names.add(match[1]!);
  return [...names].sort();
}
function backupCoverageGaps(schemaTables: readonly string[], backupTables: readonly string[]) {
  return {
    notBackedUp: schemaTables.filter(table => !backupTables.includes(table)).sort(),
    notInSchema: backupTables.filter(table => !schemaTables.includes(table)).sort(),
  };
}

beforeEach(async () => {
  await deleteLocalDatabase();
  resetMemorySqlite();
});

test('every table the migrations create is in BACKUP_TABLES, and every BACKUP_TABLES entry exists', () => {
  const declared = declaredTables(MIGRATION_SQL);
  const created = tablesCreatedBy(MIGRATION_SQL);
  // Reading the SQL text and running it in SQLite must agree on the table list.
  expect(created).toEqual(declared);
  expect(created.length).toBeGreaterThan(0);
  expect(backupCoverageGaps(created, BACKUP_TABLES)).toEqual({ notBackedUp: [], notInSchema: [] });
  expect(new Set(BACKUP_TABLES).size).toBe(BACKUP_TABLES.length);
  expect(BACKUP_MANIFEST.tables).toEqual(BACKUP_TABLES);
  for (const table of BACKUP_TABLES) expect(BACKUP_MANIFEST.introducedIn[table]).toEqual(expect.any(Number));
});

test('the restore preview counts every backed-up table in exactly one group', () => {
  const grouped = Object.values(BACKUP_GROUPS).flat();
  expect([...grouped].sort()).toEqual([...BACKUP_TABLES].sort());
});

test('a migration that adds a table missing from BACKUP_TABLES fails the guard', () => {
  const withFakeTable = [...MIGRATION_SQL, FAKE_TABLE_SQL];
  expect(declaredTables(withFakeTable)).toContain('fake_new_table');
  expect(backupCoverageGaps(tablesCreatedBy(withFakeTable), BACKUP_TABLES))
    .toEqual({ notBackedUp: ['fake_new_table'], notInSchema: [] });
});

test('a BACKUP_TABLES entry with no table in the schema fails the guard', () => {
  expect(backupCoverageGaps(tablesCreatedBy(MIGRATION_SQL), [...BACKUP_TABLES, 'dropped_table']))
    .toEqual({ notBackedUp: [], notInSchema: ['dropped_table'] });
});

test('the real export writes every schema table, and refuses a schema with an unlisted table', async () => {
  const exported = await exportBackup();
  if (!exported.ok) throw new Error('export failed: ' + exported.error.message);
  expect(Object.keys(exported.value.tables).sort()).toEqual(tablesCreatedBy(MIGRATION_SQL));

  expect((await dbOperation(db => db.execAsync(FAKE_TABLE_SQL))).ok).toBe(true);
  expect(await exportBackup()).toMatchObject({ ok: false });
  expect((await dbOperation(db => db.execAsync('DROP TABLE fake_new_table;'))).ok).toBe(true);
  expect(await exportBackup()).toMatchObject({ ok: true });
});
