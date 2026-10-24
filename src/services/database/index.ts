import * as SQLite from 'expo-sqlite';
import type { HealthValue } from '../health/types';

export type DbResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: 'db-error'; message: string } };

// A Health Connect fallback calorie estimate without a contributing app must not be used offline.
// In particular, old Phase 0 builds cached 21 such estimates before provenance checks existed.
const ENERGY_OPERATIONS = new Set(['ACTIVE_CALORIES_TOTAL', 'ENERGY_TOTAL', 'BASAL_CALORIES_TOTAL']);
function isUnattributedEnergy(value: HealthValue): boolean {
  if (value.kind !== 'aggregate' || !ENERGY_OPERATIONS.has(value.operation)) return false;
  const sources = Array.isArray(value.dataOrigins)
    && value.dataOrigins.some(origin => typeof origin === 'string' && origin.trim().length > 0);
  const singleSource = typeof value.dataOrigin === 'string' && value.dataOrigin.trim().length > 0;
  return !sources && !singleSource;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
// New application id com.liftria.app gets a fresh on-device database. Do not rename
// databases after shipping to friends without an explicit migration/copy strategy.
export const DB_NAME = 'liftria.db';
export const DB_SCHEMA_VERSION = 3;

/** Only additive migrations. v1 SQL is retained byte-for-byte except for its version pragma. */
export const DB_MIGRATIONS = [
  { version: 1, sql: `

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
  ` },
  { version: 2, sql: `
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      name TEXT,
      sex_for_formula TEXT CHECK(sex_for_formula IN ('male','female','unspecified') OR sex_for_formula IS NULL),
      birth_year INTEGER,
      height_cm REAL,
      weight_kg REAL,
      activity TEXT CHECK(activity IN ('sitting','some','active') OR activity IS NULL),
      goal TEXT CHECK(goal IN ('lose','maintain','build') OR goal IS NULL),
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kcal REAL NOT NULL CHECK(kcal >= 1000),
      protein_g REAL NOT NULL CHECK(protein_g >= 0),
      fat_g REAL NOT NULL CHECK(fat_g >= 0),
      carbs_g REAL NOT NULL CHECK(carbs_g >= 0),
      source TEXT NOT NULL CHECK(source IN ('estimate','manual')),
      inputs_json TEXT,
      created_at TEXT NOT NULL,
      CHECK ((source = 'manual' AND inputs_json IS NULL) OR (source = 'estimate' AND inputs_json IS NOT NULL))
    );
  ` },
  { version: 3, sql: \`
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      aliases TEXT NOT NULL DEFAULT '[]',
      equipment TEXT,
      type TEXT NOT NULL CHECK(type IN ('weighted','dumbbell','assisted','bodyweight')),
      unilateral INTEGER NOT NULL DEFAULT 0 CHECK(unilateral IN (0,1)),
      primary_muscles TEXT NOT NULL DEFAULT '[]',
      secondary_muscles TEXT NOT NULL DEFAULT '[]',
      instructions TEXT NOT NULL DEFAULT '[]',
      source TEXT NOT NULL CHECK(source IN ('pack','custom','import')),
      retired INTEGER NOT NULL DEFAULT 0 CHECK(retired IN (0,1)),
      pack_category TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_exercises_source ON exercises(source,retired);
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, rest_sec INTEGER NOT NULL DEFAULT 90,
      notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS template_exercises (
      id TEXT PRIMARY KEY, template_id TEXT NOT NULL REFERENCES templates(id),
      exercise_id TEXT NOT NULL REFERENCES exercises(id), position INTEGER NOT NULL,
      target_sets INTEGER NOT NULL DEFAULT 3, rep_min INTEGER NOT NULL DEFAULT 8,
      rep_max INTEGER NOT NULL DEFAULT 12, rest_sec INTEGER,
      notes TEXT, UNIQUE(template_id,position)
    );
    CREATE INDEX IF NOT EXISTS idx_template_exercises_template ON template_exercises(template_id,position);
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('weekly','rotation')),
      schedule_json TEXT NOT NULL, next_index INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1))
    );
    CREATE TABLE IF NOT EXISTS import_batches (
      id TEXT PRIMARY KEY, file_hash TEXT NOT NULL UNIQUE, importer TEXT NOT NULL,
      session_count INTEGER NOT NULL DEFAULT 0, set_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0,
      created_exercises TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, template_id TEXT REFERENCES templates(id),
      source TEXT NOT NULL CHECK(source IN ('manual','imported-file')),
      importer TEXT, import_batch_id TEXT REFERENCES import_batches(id),
      started_at TEXT NOT NULL, ended_at TEXT, edited_at TEXT, notes TEXT,
      state TEXT NOT NULL DEFAULT 'in-progress' CHECK(state IN ('in-progress','finished')),
      CHECK(source = 'manual' OR (importer IS NOT NULL AND import_batch_id IS NOT NULL))
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_batch ON sessions(import_batch_id);
    CREATE TABLE IF NOT EXISTS session_exercises (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id),
      exercise_id TEXT NOT NULL REFERENCES exercises(id), position INTEGER NOT NULL,
      UNIQUE(session_id,position)
    );
    CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON session_exercises(session_id,position);
    CREATE TABLE IF NOT EXISTS sets (
      id TEXT PRIMARY KEY,
      session_exercise_id TEXT NOT NULL REFERENCES session_exercises(id),
      position INTEGER NOT NULL,
      kind TEXT NOT NULL DEFAULT 'working' CHECK(kind IN ('working','warm-up')),
      side TEXT CHECK(side IN ('L','R') OR side IS NULL),
      weight REAL NOT NULL CHECK(weight >= 0),
      reps INTEGER NOT NULL CHECK(reps >= 0),
      logged_at TEXT NOT NULL, rest_deadline TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sets_exercise ON sets(session_exercise_id,position);
  \` },
] as const;

/** Fresh install runs v1, v2, then v3; older installations run only missing migrations. One exclusive transaction per version. */
export async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const version = row?.user_version ?? 0;
  if (!Number.isSafeInteger(version) || version < 0 || version > DB_SCHEMA_VERSION) {
    throw new Error('Database schema is newer than app');
  }
  for (const migration of DB_MIGRATIONS) {
    if (migration.version <= version) continue;
    await db.withExclusiveTransactionAsync(async tx => {
      // Transactional version write: a partial migration must not be marked complete.
      await tx.execAsync(migration.sql);
      await tx.execAsync('PRAGMA user_version = ' + migration.version + ';');
    });
  }
}

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migrateDatabase(db);
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
      // Exclusive transactions open their own SQLite connection; FK enforcement is connection-local.
      await tx.runAsync('DELETE FROM test_workout_sets');
      await tx.runAsync('DELETE FROM test_workout_sessions');
      await tx.runAsync('DELETE FROM test_nutrition_entries');
      await tx.runAsync("DELETE FROM app_settings WHERE key='persistence_marker'");
    });
  });
}

export async function saveHealthValues(values: HealthValue[]): Promise<DbResult<number>> {
  return dbOperation(async (db) => {
    let stored = 0;
    await db.withExclusiveTransactionAsync(async (tx) => {
      for (const value of values) {
        // Guard the persistence boundary too, not just the diagnostics UI.
        if (isUnattributedEnergy(value)) continue;
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
        stored++;
      }
    });
    return stored;
  });
}
export async function listCachedHealth(limit = 100): Promise<DbResult<HealthValue[]>> {
  return dbOperation(async (db) => {
    const safeLimit = Math.max(1, Math.min(limit, 500));
    const samples = await db.getAllAsync<{ payload_json: string }>('SELECT payload_json FROM health_samples ORDER BY imported_at DESC LIMIT ?', [safeLimit]);
    // Read the legacy aggregate cache without a limit first: old source-less rows must not
    // use up the display limit and hide valid, source-backed values behind them.
    const aggregates = await db.getAllAsync<{
      adapter: string; operation: string; window_start: string; window_end: string; payload_json: string;
    }>('SELECT adapter,operation,window_start,window_end,payload_json FROM health_aggregates');
    const valid: HealthValue[] = [];
    const legacy: typeof aggregates = [];
    for (const row of aggregates) {
      const value = JSON.parse(row.payload_json) as HealthValue;
      if (isUnattributedEnergy(value)) legacy.push(row);
      else valid.push(value);
    }
    if (legacy.length) {
      try {
        await db.withExclusiveTransactionAsync(async tx => {
          for (const row of legacy) {
            await tx.runAsync('DELETE FROM health_aggregates WHERE adapter=? AND operation=? AND window_start=? AND window_end=?',
              [row.adapter, row.operation, row.window_start, row.window_end]);
          }
        });
      } catch {
        // Cleanup is best-effort; stale values were already excluded from the returned data.
      }
    }
    return [...samples.map(row => JSON.parse(row.payload_json) as HealthValue), ...valid.slice(0, safeLimit)];
  });
}
