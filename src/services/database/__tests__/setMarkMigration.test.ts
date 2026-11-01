import * as SQLite from 'expo-sqlite';
import { DB_MIGRATIONS, migrateDatabase } from '../index';
import { resetMemorySqlite } from '../../../features/settings/__tests__/memorySqlite';

jest.mock('expo-sqlite', () => jest.requireActual('../../../features/settings/__tests__/memorySqlite').memoryExpoSqlite);

afterEach(() => {
  resetMemorySqlite();
});

test('v10 on a v9 database keeps logged sets and adds a nullable drop or failure mark', async () => {
  const db = await SQLite.openDatabaseAsync('set-mark-migration.db');
  for (const migration of DB_MIGRATIONS) {
    if (migration.version > 9) break;
    await db.execAsync(migration.sql);
    await db.execAsync('PRAGMA user_version = ' + migration.version + ';');
  }
  await db.runAsync(
    "INSERT INTO exercises (id,name,type,source) VALUES ('ex','Bench','weighted','custom')");
  await db.runAsync(
    "INSERT INTO sessions (id,title,source,started_at,state) VALUES ('s','Push','manual','2026-11-01T10:00:00.000Z','finished')");
  await db.runAsync(
    "INSERT INTO session_exercises (id,session_id,exercise_id,position,rest_sec) VALUES ('se','s','ex',0,90)");
  await db.runAsync(
    "INSERT INTO sets (id,session_exercise_id,position,kind,weight,reps,logged_at) VALUES ('set','se',0,'working',80,8,'2026-11-01T10:01:00.000Z')");

  await migrateDatabase(db);

  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  expect(version?.user_version).toBe(10);
  expect(await db.getFirstAsync<{ weight: number; reps: number; kind: string; mark: string | null; rest_sec: number }>(
    'SELECT st.weight, st.reps, st.kind, st.mark, se.rest_sec FROM sets st JOIN session_exercises se ON se.id=st.session_exercise_id WHERE st.id=?',
    ['set'])).toEqual({ weight: 80, reps: 8, kind: 'working', mark: null, rest_sec: 90 });
  await db.runAsync('UPDATE sets SET mark=? WHERE id=?', ['drop', 'set']);
  expect((await db.getFirstAsync<{ mark: string }>('SELECT mark FROM sets WHERE id=?', ['set']))?.mark).toBe('drop');
  await db.runAsync('UPDATE sets SET mark=? WHERE id=?', ['failure', 'set']);
  expect((await db.getFirstAsync<{ mark: string }>('SELECT mark FROM sets WHERE id=?', ['set']))?.mark).toBe('failure');
  await db.runAsync('UPDATE sets SET mark=NULL WHERE id=?', ['set']);
  await expect(db.runAsync('UPDATE sets SET mark=? WHERE id=?', ['working', 'set'])).rejects.toThrow();
  await expect(db.runAsync('UPDATE sets SET mark=? WHERE id=?', ['warm-up', 'set'])).rejects.toThrow();
  expect((await db.getFirstAsync<{ reps: number; mark: string | null }>(
    'SELECT reps, mark FROM sets WHERE id=?', ['set']))).toEqual({ reps: 8, mark: null });
  const sql = DB_MIGRATIONS.find(migration => migration.version === 10)?.sql ?? '';
  expect(sql).toContain('ALTER TABLE sets ADD COLUMN mark');
  expect(sql).toContain("CHECK(mark IN ('drop','failure') OR mark IS NULL)");
  expect(sql).not.toMatch(/DROP TABLE|DELETE FROM/i);
});
