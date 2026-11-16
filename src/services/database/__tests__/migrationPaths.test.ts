import * as SQLite from 'expo-sqlite';
import { DB_MIGRATIONS, DB_NAME, DB_SCHEMA_VERSION, checkDatabaseAtStartup, deleteLocalDatabase,
  migrateDatabase } from '../index';
import { resetMemorySqlite, type MemoryDatabase } from '../../../features/settings/__tests__/memorySqlite';

jest.mock('expo-sqlite', () => jest.requireActual('../../../features/settings/__tests__/memorySqlite').memoryExpoSqlite);

type Db = MemoryDatabase & SQLite.SQLiteDatabase;
const open = async (name: string) => (await SQLite.openDatabaseAsync(name)) as unknown as Db;

/** Applies migrations up to `version` exactly the way an older app build did. */
async function databaseAt(name: string, version: number): Promise<Db> {
  const db = await open(name);
  for (const migration of DB_MIGRATIONS) {
    if (migration.version > version) break;
    await db.execAsync(migration.sql);
    await db.execAsync('PRAGMA user_version = ' + migration.version + ';');
  }
  return db;
}
async function schemaOf(db: Db): Promise<Record<string, string[]>> {
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const schema: Record<string, string[]> = {};
  for (const { name } of tables) {
    const columns = await db.getAllAsync<{ name: string; type: string; notnull: number; dflt_value: string | null }>(
      'PRAGMA table_info(' + name + ')');
    schema[name] = columns.map(c => [c.name, c.type, c.notnull, c.dflt_value].join(':'));
  }
  return schema;
}
const versionOf = async (db: Db) =>
  (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version;

afterEach(async () => {
  await deleteLocalDatabase();
  resetMemorySqlite();
});

test('migrations are numbered 1..current without gaps', () => {
  expect(DB_MIGRATIONS.map(m => m.version)).toEqual(
    Array.from({ length: DB_SCHEMA_VERSION }, (_, i) => i + 1));
  // Additive only: no statement in any migration may drop or wipe user data.
  for (const migration of DB_MIGRATIONS) {
    expect(migration.sql).not.toMatch(/\bDROP\s+(TABLE|INDEX|COLUMN)\b|\bDELETE\s+FROM\b|\bRENAME\s+TO\b/i);
  }
});

test.each(Array.from({ length: DB_SCHEMA_VERSION }, (_, version) => version))(
  'a phone on schema v%i upgrades to the same schema as a fresh install and keeps its settings',
  async version => {
    const fresh = await databaseAt('fresh.db', 0);
    await migrateDatabase(fresh);
    const old = await databaseAt('old-v' + version + '.db', version);
    if (version >= 1) await old.runAsync("INSERT INTO app_settings (key,value) VALUES ('language','\"ar\"')");
    await migrateDatabase(old);
    expect(await versionOf(old)).toBe(DB_SCHEMA_VERSION);
    expect(await schemaOf(old)).toEqual(await schemaOf(fresh));
    if (version >= 1) {
      expect(await old.getFirstAsync('SELECT value FROM app_settings WHERE key=?', ['language']))
        .toEqual({ value: '"ar"' });
    }
    // Running again is a no-op.
    await migrateDatabase(old);
    expect(await schemaOf(old)).toEqual(await schemaOf(fresh));
  });

test('a migration that fails part way leaves the old version and every existing row in place', async () => {
  const db = await databaseAt('broken.db', DB_SCHEMA_VERSION - 1);
  await db.runAsync("INSERT INTO app_settings (key,value) VALUES ('keep','yes')");
  // Simulate a failure inside the last migration: its column already exists, so ALTER throws.
  await db.execAsync("ALTER TABLE sets ADD COLUMN mark TEXT;");
  await expect(migrateDatabase(db)).rejects.toThrow();
  expect(await versionOf(db)).toBe(DB_SCHEMA_VERSION - 1);
  expect(await db.getFirstAsync('SELECT value FROM app_settings WHERE key=?', ['keep'])).toEqual({ value: 'yes' });
});

test('the launch check reports a newer database instead of opening or changing it', async () => {
  const db = await open(DB_NAME);
  await db.execAsync('CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);');
  await db.runAsync("INSERT INTO app_settings (key,value) VALUES ('keep','yes')");
  await db.execAsync('PRAGMA user_version = ' + (DB_SCHEMA_VERSION + 1) + ';');
  await db.closeAsync();
  expect(await checkDatabaseAtStartup()).toEqual({ ok: false, reason: 'newer' });
  const again = await open(DB_NAME);
  expect(await versionOf(again)).toBe(DB_SCHEMA_VERSION + 1);
  expect(await again.getFirstAsync('SELECT value FROM app_settings WHERE key=?', ['keep'])).toEqual({ value: 'yes' });
  await again.closeAsync();
});

test('the launch check opens and migrates a healthy database', async () => {
  expect(await checkDatabaseAtStartup()).toEqual({ ok: true });
});
