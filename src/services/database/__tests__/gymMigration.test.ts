import * as SQLite from 'expo-sqlite';
import { DB_MIGRATIONS, DB_SCHEMA_VERSION, migrateDatabase } from '../index';

const schema = DB_MIGRATIONS[2].sql;
const expected = ['exercises','templates','template_exercises','plans','sessions',
  'session_exercises','sets','import_batches'];

test('v3 adds all gym tables, indexes and foreign keys without destructive migrations', () => {
  expect(DB_SCHEMA_VERSION).toBe(3);
  expect(DB_MIGRATIONS.map(m => m.version)).toEqual([1,2,3]);
  for (const table of expected) expect(schema).toContain('CREATE TABLE IF NOT EXISTS ' + table);
  expect(schema).toContain("CHECK(kind IN (\'working\',\'warm-up\'))");
  expect(schema).toContain("CHECK(source IN ('manual','imported-file'))");
  expect(schema).not.toMatch(/DROP TABLE|DELETE FROM|ALTER TABLE/i);
});

test('v2 upgrades only v3, atomically marking user_version last', async () => {
  let version = 2;
  const sql: string[] = [];
  let transactions = 0;
  const db = {
    execAsync: jest.fn(async (statement: string) => {
      sql.push(statement);
      const m = /PRAGMA user_version = (\d+)/.exec(statement);
      if (m) version = Number(m[1]);
    }),
    getFirstAsync: jest.fn(async () => ({ user_version: version })),
    withExclusiveTransactionAsync: jest.fn(async (fn: (tx: object) => Promise<void>) => {
      transactions += 1;
      await fn(db);
    }),
  } as unknown as SQLite.SQLiteDatabase;
  await migrateDatabase(db);
  expect(transactions).toBe(1);
  expect(sql).toEqual(['PRAGMA foreign_keys = ON;', schema, 'PRAGMA user_version = 3;']);
  await migrateDatabase(db);
  expect(transactions).toBe(1);
});
