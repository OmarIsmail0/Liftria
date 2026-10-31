import * as SQLite from 'expo-sqlite';
import { DB_MIGRATIONS, migrateDatabase } from '../index';
import { resetMemorySqlite } from '../../../features/settings/__tests__/memorySqlite';

jest.mock('expo-sqlite', () => jest.requireActual('../../../features/settings/__tests__/memorySqlite').memoryExpoSqlite);

const SITES = [
  'waist', 'hips', 'chest', 'neck', 'shoulders',
  'arm_left', 'arm_right', 'thigh_left', 'thigh_right', 'calf_left', 'calf_right',
];

afterEach(() => {
  resetMemorySqlite();
});

test('v7 checks the eleven tape sites and stores centimeters', () => {
  const sql = DB_MIGRATIONS.find(migration => migration.version === 7)?.sql ?? '';
  const list = /CHECK\(site IN \(([^)]+)\)\)/.exec(sql)?.[1] ?? '';
  const sites = list.split(',').map(part => part.trim().replace(/'/g, ''));
  expect(sites).toEqual(SITES);
  expect(sql).toContain('cm REAL NOT NULL CHECK(cm>0 AND cm<400)');
  expect(sql).toContain("CHECK(source='liftria')");
  expect(sql).not.toMatch(/DROP TABLE|DELETE FROM/i);
});

test('v7 on a v6 database keeps existing rows and adds body_measurements', async () => {
  const db = await SQLite.openDatabaseAsync('body-measurements-migration.db');
  for (const migration of DB_MIGRATIONS) {
    if (migration.version > 6) break;
    await db.execAsync(migration.sql);
    await db.execAsync('PRAGMA user_version = ' + migration.version + ';');
  }
  await db.runAsync(
    'INSERT INTO weights (id,measured_at,kg,note,source) VALUES (?,?,?,?,?)',
    ['w1', '2026-10-01T12:00:00.000Z', 80.5, 'keep me', 'liftria'],
  );
  await db.runAsync(
    'INSERT INTO water_logs (day,glasses,glass_ml,logged_at) VALUES (?,?,?,?)',
    ['2026-10-01', 3, 250, '2026-10-01T12:00:00.000Z'],
  );
  await db.runAsync('INSERT INTO app_settings (key,value) VALUES (?,?)', ['language', '"ar"']);

  await migrateDatabase(db);

  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  expect(version?.user_version).toBe(8);
  expect((await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM progress_photos'))?.n).toBe(0);
  expect(await db.getFirstAsync<{ kg: number; note: string }>(
    'SELECT kg,note FROM weights WHERE id=?', ['w1'])).toEqual({ kg: 80.5, note: 'keep me' });
  expect((await db.getFirstAsync<{ glasses: number }>(
    'SELECT glasses FROM water_logs WHERE day=?', ['2026-10-01']))?.glasses).toBe(3);
  expect((await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key=?', ['language']))?.value).toBe('"ar"');
  expect((await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM body_measurements'))?.n).toBe(0);

  const insert = (id: string, site: string, cm: number, source = 'liftria') => db.runAsync(
    'INSERT INTO body_measurements (id,measured_at,site,cm,note,source) VALUES (?,?,?,?,?,?)',
    [id, '2026-10-02T12:00:00.000Z', site, cm, null, source],
  );
  await expect(insert('bad-zero', 'waist', 0)).rejects.toThrow();
  await expect(insert('bad-high', 'waist', 400)).rejects.toThrow();
  await expect(insert('bad-site', 'forehead', 40)).rejects.toThrow();
  await expect(insert('bad-source', 'chest', 100, 'import')).rejects.toThrow();
  await insert('ok', 'arm_left', 35.2);
  expect(await db.getFirstAsync<{ cm: number; site: string }>(
    'SELECT cm,site FROM body_measurements WHERE id=?', ['ok'])).toEqual({ cm: 35.2, site: 'arm_left' });
  expect((await db.getFirstAsync<{ kg: number }>('SELECT kg FROM weights WHERE id=?', ['w1']))?.kg).toBe(80.5);
});
