import * as SQLite from 'expo-sqlite';
import type { HealthValue } from '../health/types';

export type DbResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: 'db-error'; message: string } };

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
const DB_NAME = 'liftria-phase0.db';
export const DB_SCHEMA_VERSION = 1;

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync('PRAGMA foreign_keys = ON;');
      const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
      if ((version?.user_version ?? 0) > DB_SCHEMA_VERSION) throw new Error('Database schema is newer than app');
      if ((version?.user_version ?? 0) < 1) {
        await db.withExclusiveTransactionAsync(async (tx) => {
          await tx.execAsync(`
            CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS test_workout_sessions (
              id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
              started_at TEXT NOT NULL, finished_at TEXT
            );
            CREATE TABLE IF NOT EXISTS test_workout_sets (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              session_id INTEGER NOT NULL REFERENCES test_workout_sessions(id) ON DELETE CASCADE,
              exercise TEXT NOT NULL, reps INTEGER NOT NULL, weight_kg REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS test_nutrition_entries (
              id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT NOT NULL,
              quantity REAL NOT NULL, unit TEXT NOT NULL, consumed_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS health_samples (
              adapter TEXT NOT NULL, record_id TEXT NOT NULL,
              metric TEXT NOT NULL, kind TEXT NOT NULL, source_origin TEXT NOT NULL,
              payload_json TEXT NOT NULL, imported_at TEXT NOT NULL,
              PRIMARY KEY (adapter, record_id)
            );
            CREATE TABLE IF NOT EXISTS health_aggregates (
              adapter TEXT NOT NULL, operation TEXT NOT NULL,
              window_start TEXT NOT NULL, window_end TEXT NOT NULL,
              payload_json TEXT NOT NULL,
              PRIMARY KEY (adapter, operation, window_start, window_end)
            );
            PRAGMA user_version = 1;
          `);
        });
      }
      return db;
    })().catch((err: unknown) => { dbPromise = null; throw err; });
  }
  return dbPromise;
}

export async function dbOperation<T>(fn: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<DbResult<T>> {
  try { return { ok: true, value: await fn(await initializeDatabase()) }; }
  catch { return { ok: false, error: { code: 'db-error', message: 'Local database operation failed.' } }; }
}

export async function schemaVersion(): Promise<DbResult<number>> {
  return dbOperation(async (db) =>
    (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version ?? 0);
}

export async function setSetting(key: string, value: string): Promise<DbResult<void>> {
  return dbOperation(async (db) => {
    await db.runAsync('INSERT INTO app_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, value]);
  });
}
export async function getSetting(key: string): Promise<DbResult<string | null>> {
  return dbOperation(async (db) =>
    (await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key=?', [key]))?.value ?? null);
}
export async function deleteSetting(key: string): Promise<DbResult<void>> {
  return dbOperation(async (db) => { await db.runAsync('DELETE FROM app_settings WHERE key=?', [key]); });
}

export type TestCounts = {
  workouts: number; sets: number; meals: number; healthSamples: number; healthAggregates: number; marker: string | null;
};
export async function addTestData(): Promise<DbResult<void>> {
  return dbOperation(async (db) => {
    await db.withExclusiveTransactionAsync(async (tx) => {
      const started = new Date().toISOString();
      const session = await tx.runAsync(
        'INSERT INTO test_workout_sessions (title,started_at) VALUES (?,?)', ['Phase 0 test', started]);
      await tx.runAsync('INSERT INTO test_workout_sets (session_id,exercise,reps,weight_kg) VALUES (?,?,?,?)',
        [session.lastInsertRowId, 'Test squat', 8, 40]);
      await tx.runAsync('INSERT INTO test_nutrition_entries (description,quantity,unit,consumed_at) VALUES (?,?,?,?)',
        ['Test eggs', 2, 'piece', started]);
      await tx.runAsync('INSERT INTO app_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        ['persistence_marker', started]);
    });
  });
}
export async function readTestData(): Promise<DbResult<TestCounts>> {
  return dbOperation(async (db) => {
    const count = async (table: string): Promise<number> => {
      const allowed = {
        workouts: 'test_workout_sessions', sets: 'test_workout_sets',
        meals: 'test_nutrition_entries', healthSamples: 'health_samples', healthAggregates: 'health_aggregates',
      } as const;
      const name = allowed[table as keyof typeof allowed];
      if (!name) throw new Error('Invalid table');
      return (await db.getFirstAsync<{ total: number }>(`SELECT COUNT(*) AS total FROM ${name}`))?.total ?? 0;
    };
    const marker = (await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_settings WHERE key='persistence_marker'"))?.value ?? null;
    return {
      workouts: await count('workouts'), sets: await count('sets'), meals: await count('meals'),
      healthSamples: await count('healthSamples'), healthAggregates: await count('healthAggregates'), marker,
    };
  });
}
export async function clearTestData(): Promise<DbResult<void>> {
  return dbOperation(async (db) => {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync('DELETE FROM test_workout_sessions');
      await tx.runAsync('DELETE FROM test_nutrition_entries');
      await tx.runAsync("DELETE FROM app_settings WHERE key='persistence_marker'");
    });
  });
}

export async function saveHealthValues(values: HealthValue[]): Promise<DbResult<number>> {
  return dbOperation(async (db) => {
    await db.withExclusiveTransactionAsync(async (tx) => {
      for (const value of values) {
        if (value.kind === 'aggregate') {
          await tx.runAsync(`
            INSERT INTO health_aggregates (adapter,operation,window_start,window_end,payload_json)
            VALUES (?,?,?,?,?) ON CONFLICT(adapter,operation,window_start,window_end)
            DO UPDATE SET payload_json=excluded.payload_json`,
            [value.adapter, value.operation, value.windowStart, value.windowEnd, JSON.stringify(value)]);
        } else {
          await tx.runAsync(`
            INSERT INTO health_samples (adapter,record_id,metric,kind,source_origin,payload_json,imported_at)
            VALUES (?,?,?,?,?,?,?) ON CONFLICT(adapter,record_id) DO UPDATE SET
            metric=excluded.metric,kind=excluded.kind,source_origin=excluded.source_origin,
            payload_json=excluded.payload_json,imported_at=excluded.imported_at`,
            [value.adapter, value.recordId, value.kind === 'session' ? 'exercise-session' : value.kind === 'sleep' ? 'sleep-session' : value.metric,
              value.kind, value.dataOrigin, JSON.stringify(value), new Date().toISOString()]);
        }
      }
    });
    return values.length;
  });
}
export async function listCachedHealth(limit = 100): Promise<DbResult<HealthValue[]>> {
  return dbOperation(async (db) => {
    const safeLimit = Math.max(1, Math.min(limit, 500));
    const samples = await db.getAllAsync<{ payload_json: string }>('SELECT payload_json FROM health_samples ORDER BY imported_at DESC LIMIT ?', [safeLimit]);
    const aggregates = await db.getAllAsync<{ payload_json: string }>('SELECT payload_json FROM health_aggregates LIMIT ?', [safeLimit]);
    return [...samples, ...aggregates].map(row => JSON.parse(row.payload_json) as HealthValue);
  });
}
