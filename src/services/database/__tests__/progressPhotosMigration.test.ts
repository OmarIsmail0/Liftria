import * as SQLite from 'expo-sqlite';
import { DB_MIGRATIONS, DB_SCHEMA_VERSION, migrateDatabase } from '../index';
import { resetMemorySqlite } from '../../../features/settings/__tests__/memorySqlite';

jest.mock('expo-sqlite', () => jest.requireActual('../../../features/settings/__tests__/memorySqlite').memoryExpoSqlite);

afterEach(() => {
  resetMemorySqlite();
});

test('v8 stores a private JPEG with a front, side or back pose', () => {
  const sql = DB_MIGRATIONS.find(migration => migration.version === 8)?.sql ?? '';
  expect(DB_SCHEMA_VERSION).toBe(8);
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS progress_photos');
  expect(sql).toContain("CHECK(pose IN ('front','side','back'))");
  expect(sql).toContain('jpeg_base64 TEXT NOT NULL');
  expect(sql).toContain('width INTEGER NOT NULL CHECK(width>0 AND width<=1080)');
  expect(sql).toContain('height INTEGER NOT NULL CHECK(height>0 AND height<=1080)');
  expect(sql).toContain("CHECK(source='liftria')");
  expect(sql).not.toMatch(/DROP TABLE|DELETE FROM/i);
});

test('v8 on a v7 database keeps existing rows and starts with no photos', async () => {
  const db = await SQLite.openDatabaseAsync('progress-photos-migration.db');
  for (const migration of DB_MIGRATIONS) {
    if (migration.version > 7) break;
    await db.execAsync(migration.sql);
    await db.execAsync('PRAGMA user_version = ' + migration.version + ';');
  }
  await db.runAsync(
    'INSERT INTO weights (id,measured_at,kg,note,source) VALUES (?,?,?,?,?)',
    ['w1', '2026-10-01T12:00:00.000Z', 80.5, 'keep me', 'liftria'],
  );
  await db.runAsync(
    'INSERT INTO body_measurements (id,measured_at,site,cm,note,source) VALUES (?,?,?,?,?,?)',
    ['m1', '2026-10-02T12:00:00.000Z', 'waist', 82.5, 'بعد التمرين', 'liftria'],
  );

  await migrateDatabase(db);

  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  expect(version?.user_version).toBe(8);
  expect(await db.getFirstAsync<{ kg: number; note: string }>(
    'SELECT kg,note FROM weights WHERE id=?', ['w1'])).toEqual({ kg: 80.5, note: 'keep me' });
  expect(await db.getFirstAsync<{ cm: number; note: string }>(
    'SELECT cm,note FROM body_measurements WHERE id=?', ['m1'])).toEqual({ cm: 82.5, note: 'بعد التمرين' });
  expect((await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM progress_photos'))?.n).toBe(0);

  const insert = (id: string, pose: string, jpeg: string, width: number, height: number, source = 'liftria') =>
    db.runAsync(
      'INSERT INTO progress_photos (id,taken_at,pose,jpeg_base64,width,height,note,source) VALUES (?,?,?,?,?,?,?,?)',
      [id, '2026-10-03T12:00:00.000Z', pose, jpeg, width, height, null, source],
    );
  await expect(insert('bad-pose', 'overhead', 'AQID', 10, 10)).rejects.toThrow();
  await expect(insert('bad-empty', 'front', '', 10, 10)).rejects.toThrow();
  await expect(insert('bad-wide', 'side', 'AQID', 1081, 10)).rejects.toThrow();
  await expect(insert('bad-tall', 'back', 'AQID', 10, 0)).rejects.toThrow();
  await expect(insert('bad-source', 'front', 'AQID', 10, 10, 'import')).rejects.toThrow();
  await insert('ok', 'side', 'AQID', 1080, 720);
  expect(await db.getFirstAsync<{ pose: string; width: number }>(
    'SELECT pose,width FROM progress_photos WHERE id=?', ['ok'])).toEqual({ pose: 'side', width: 1080 });
  expect((await db.getFirstAsync<{ kg: number }>('SELECT kg FROM weights WHERE id=?', ['w1']))?.kg).toBe(80.5);
});
