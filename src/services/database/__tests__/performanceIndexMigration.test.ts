import * as SQLite from 'expo-sqlite';
import { DB_MIGRATIONS, migrateDatabase } from '../index';
import { resetMemorySqlite } from '../../../features/settings/__tests__/memorySqlite';

jest.mock('expo-sqlite', () => jest.requireActual('../../../features/settings/__tests__/memorySqlite').memoryExpoSqlite);

afterEach(() => {
  resetMemorySqlite();
});

test('v11 only adds indexes and keeps every row of a v10 database', async () => {
  const db = await SQLite.openDatabaseAsync('perf-index-migration.db');
  for (const migration of DB_MIGRATIONS) {
    if (migration.version > 10) break;
    await db.execAsync(migration.sql);
    await db.execAsync('PRAGMA user_version = ' + migration.version + ';');
  }
  await db.runAsync("INSERT INTO exercises (id,name,type,source) VALUES ('ex','Bench','weighted','custom')");
  await db.runAsync(
    "INSERT INTO sessions (id,title,source,started_at,state) VALUES ('s','Push','manual','2026-11-01T10:00:00.000Z','finished')");
  await db.runAsync("INSERT INTO session_exercises (id,session_id,exercise_id,position) VALUES ('se','s','ex',0)");
  await db.runAsync(
    "INSERT INTO sets (id,session_exercise_id,position,kind,weight,reps,logged_at) VALUES ('set','se',0,'working',80,8,'2026-11-01T10:01:00.000Z')");
  await db.runAsync("INSERT INTO weights (id,measured_at,kg,source) VALUES ('w','2026-11-01T07:00:00.000Z',80,'liftria')");

  await migrateDatabase(db);

  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  expect(version?.user_version).toBe(11);
  const names = (await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")).map(row => row.name);
  for (const name of ['idx_sessions_state_started', 'idx_session_exercises_exercise',
    'idx_template_exercises_exercise', 'idx_weights_measured', 'idx_hiku_requests_created']) {
    expect(names).toContain(name);
  }
  expect(await db.getFirstAsync<{ weight: number }>('SELECT weight FROM sets WHERE id=?', ['set'])).toEqual({ weight: 80 });
  expect(await db.getFirstAsync<{ kg: number }>('SELECT kg FROM weights WHERE id=?', ['w'])).toEqual({ kg: 80 });
  const sql = DB_MIGRATIONS.find(migration => migration.version === 11)?.sql ?? '';
  expect(sql).not.toMatch(/DROP|DELETE|ALTER|CREATE TABLE/i);
  expect((sql.match(/CREATE INDEX IF NOT EXISTS/g) ?? []).length).toBe(5);
});

test('the history and per-exercise queries use the new indexes', async () => {
  const db = await SQLite.openDatabaseAsync('perf-index-plan.db');
  for (const migration of DB_MIGRATIONS) {
    await db.execAsync(migration.sql);
    await db.execAsync('PRAGMA user_version = ' + migration.version + ';');
  }
  const plan = async (sql: string) => (await db.getAllAsync<{ detail: string }>('EXPLAIN QUERY PLAN ' + sql))
    .map(row => row.detail).join(' | ');
  expect(await plan("SELECT id FROM sessions WHERE state='finished' ORDER BY started_at DESC LIMIT 250"))
    .toContain('idx_sessions_state_started');
  expect(await plan("SELECT id FROM session_exercises WHERE exercise_id='ex'"))
    .toContain('idx_session_exercises_exercise');
  expect(await plan('SELECT id FROM weights ORDER BY measured_at DESC LIMIT 30'))
    .toContain('idx_weights_measured');
});
