import * as SQLite from 'expo-sqlite';
import { DB_MIGRATIONS, DB_SCHEMA_VERSION, migrateDatabase } from '../index';

const schema = DB_MIGRATIONS[2].sql;
const expected = ['exercises','templates','template_exercises','plans','sessions',
  'session_exercises','sets','import_batches'];

test('v3 adds all gym tables, indexes and foreign keys without destructive migrations', () => {
  expect(DB_SCHEMA_VERSION).toBe(4);
  expect(DB_MIGRATIONS.map(m => m.version)).toEqual([1,2,3,4]);
  for (const table of expected) expect(schema).toContain('CREATE TABLE IF NOT EXISTS ' + table);
  expect(schema).toContain("CHECK(kind IN (\'working\',\'warm-up\'))");
  expect(schema).toContain("CHECK(source IN ('manual','imported-file'))");
  expect(schema).toContain('file_name TEXT');
  expect(schema).toContain('import_batch_id TEXT REFERENCES import_batches(id)');
  expect(schema).not.toMatch(/DROP TABLE|DELETE FROM|ALTER TABLE/i);
});

test('v2 upgrades v3 and v4, atomically marking user_version last', async () => {
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
  expect(transactions).toBe(2);
  expect(sql).toEqual(['PRAGMA foreign_keys = ON;', schema, 'PRAGMA user_version = 3;',DB_MIGRATIONS[3].sql,'PRAGMA user_version = 4;']);
  await migrateDatabase(db);
  expect(transactions).toBe(2);
});


test('v4 is additive and covers the diary, replay, weights and hiku fields', () => {
  const sql=DB_MIGRATIONS[3].sql;
  for(const table of ['foods','food_portions','diary_entries','favorite_foods',
    'saved_meals','saved_meal_items','weights','hiku_requests']){
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS '+table);
  }
  expect(sql).toContain('name_snapshot TEXT NOT NULL');
  expect(sql).toContain('protein REAL');
  expect(sql).not.toMatch(/DROP TABLE|ALTER TABLE|DELETE FROM/i);
});
test('v3 to v4 runs exactly one transaction, and marks v4 last',async()=>{
  let version=3;
  const statements:string[]=[];
  const db={
    execAsync:jest.fn(async (sql:string)=>{
      statements.push(sql);const match=/PRAGMA user_version = (\d+)/.exec(sql);
      if(match) version=Number(match[1]);
    }),
    getFirstAsync:jest.fn(async()=>({user_version:version})),
    withExclusiveTransactionAsync:jest.fn(async(fn:(tx:object)=>Promise<void>)=>{await fn(db);}),
  } as unknown as SQLite.SQLiteDatabase;
  await migrateDatabase(db);
  expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
  expect(statements).toEqual(['PRAGMA foreign_keys = ON;',DB_MIGRATIONS[3].sql,
    'PRAGMA user_version = 4;']);
});
