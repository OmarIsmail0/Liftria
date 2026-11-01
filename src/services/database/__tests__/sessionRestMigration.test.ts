import * as SQLite from 'expo-sqlite';
import { DB_MIGRATIONS, migrateDatabase } from '../index';
import { resetMemorySqlite } from '../../../features/settings/__tests__/memorySqlite';

jest.mock('expo-sqlite', () => jest.requireActual('../../../features/settings/__tests__/memorySqlite').memoryExpoSqlite);

afterEach(() => {
  resetMemorySqlite();
});

test('v9 remembers per-exercise rest without touching sets already logged', async () => {
  const db = await SQLite.openDatabaseAsync('session-rest-migration.db');
  for (const migration of DB_MIGRATIONS) {
    if (migration.version > 8) break;
    await db.execAsync(migration.sql);
    await db.execAsync('PRAGMA user_version = ' + migration.version + ';');
  }
  await db.runAsync(
    "INSERT INTO exercises (id,name,type,source) VALUES ('ex','Bench','weighted','custom')");
  await db.runAsync(
    "INSERT INTO sessions (id,title,source,started_at,state) VALUES ('s','Push','manual','2026-11-01T10:00:00.000Z','in-progress')");
  await db.runAsync(
    "INSERT INTO session_exercises (id,session_id,exercise_id,position) VALUES ('se','s','ex',0)");
  await db.runAsync(
    "INSERT INTO sets (id,session_exercise_id,position,kind,weight,reps,logged_at) VALUES ('set','se',0,'working',80,8,'2026-11-01T10:01:00.000Z')");

  await migrateDatabase(db);

  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  expect(version?.user_version).toBe(9);
  expect(await db.getFirstAsync<{ rest_sec: number | null; reps: number }>(
    'SELECT se.rest_sec, st.reps FROM session_exercises se JOIN sets st ON st.session_exercise_id=se.id WHERE se.id=?',
    ['se'])).toEqual({ rest_sec: null, reps: 8 });
  await db.runAsync('UPDATE session_exercises SET rest_sec=? WHERE id=?', [90, 'se']);
  expect((await db.getFirstAsync<{ rest_sec: number }>('SELECT rest_sec FROM session_exercises WHERE id=?', ['se']))?.rest_sec).toBe(90);
  await expect(db.runAsync('UPDATE session_exercises SET rest_sec=? WHERE id=?', [4000, 'se'])).rejects.toThrow();
  const sql = DB_MIGRATIONS.find(migration => migration.version === 9)?.sql ?? '';
  expect(sql).toContain('ALTER TABLE session_exercises ADD COLUMN rest_sec');
  expect(sql).not.toMatch(/DROP TABLE|DELETE FROM/i);
});
