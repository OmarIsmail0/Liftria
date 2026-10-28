import { TEMPORARY_FILE_FOLDERS, deleteEverythingOnPhone, type DeletionOps } from '../storage';
import { BACKUP_TABLES } from '../backup';
import { DB_MIGRATIONS, DB_NAME, dbOperation, deleteLocalDatabase, initializeDatabase } from '../../../services/database';
import { deleteKey, saveKey } from '../../../services/secure-storage';
import { resetMemorySqlite, storedDatabaseNames, tablesCreatedBy, type MemoryDatabase } from './memorySqlite';
import { cacheFiles, resetMemoryFileSystem, writeCacheFile } from './memoryFileSystem';
import { EVERY_TABLE_ROWS, dumpEveryTable, seedRows } from './everyTableFixture';

type Entry = { name: string; isDirectory: () => boolean; isFile: () => boolean };
const { readdirSync, readFileSync } = jest.requireActual('fs') as {
  readdirSync: (dir: string, options: { withFileTypes: true }) => Entry[];
  readFileSync: (file: string, encoding: 'utf8') => string;
};
const { join, relative } = jest.requireActual('path') as {
  join: (...parts: string[]) => string;
  relative: (from: string, to: string) => string;
};

const mockSecureItems = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(async (key: string) => mockSecureItems.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { mockSecureItems.set(key, value); }),
  deleteItemAsync: jest.fn(async (key: string) => { mockSecureItems.delete(key); }),
}));
jest.mock('expo-sqlite', () => jest.requireActual('./memorySqlite').memoryExpoSqlite);
jest.mock('expo-file-system', () => jest.requireActual('./memoryFileSystem').memoryFileSystem);

const SCHEMA_TABLES = tablesCreatedBy(DB_MIGRATIONS.map(migration => migration.sql));
const openDatabase = async () => (await initializeDatabase()) as unknown as MemoryDatabase;

/** Cache folders the native modules write into, read from their Android and iOS sources:
 * expo-image-picker ImagePickerConstants.kt / MediaHandler.swift, expo-image-manipulator
 * FileUtils.kt / ImageManipulatorUtils.swift. */
const NATIVE_CACHE_FOLDERS: Record<string, string> = {
  'expo-image-picker': 'ImagePicker',
  'expo-image-manipulator': 'ImageManipulator',
};
/** Copies the Hiku photo flow leaves in the cache when the app closes before the photo
 * screen deletes them: the camera capture and its re-encoded JPEG. */
const LEFTOVER_FILES = [
  'ImagePicker/2b1f0c9e.jpg',
  'ImageManipulator/7d4e8a31.jpg',
];

/** Every table holds at least one row, the Anthropic key is saved, a Hiku photo is kept,
 * and the photo flow has left copies in the cache. */
async function fillThePhone(): Promise<void> {
  await seedRows(await openDatabase(), EVERY_TABLE_ROWS);
  expect(await saveKey('sk-ant-test-only-not-a-real-key')).toMatchObject({ status: 'ready' });
  const before = await dumpEveryTable(await openDatabase());
  expect(Object.keys(before)).toEqual(SCHEMA_TABLES);
  expect(SCHEMA_TABLES.filter(table => !before[table]?.length)).toEqual([]);
  expect(before.app_settings?.some(row => String(row.key).startsWith('hiku.photo.'))).toBe(true);
  for (const file of LEFTOVER_FILES) writeCacheFile(file);
}

/** What survives Delete all: another database file, any row in any table of the reopened
 * app database (the list comes from sqlite_master, not from a hand-kept list), any
 * SecureStore item and any of Liftria's files. Nothing is documented as kept, so the
 * expected result is []. */
async function leftAfterDeleteAll(): Promise<string[]> {
  const left = storedDatabaseNames().filter(name => name !== DB_NAME).map(name => 'database file ' + name);
  for (const [table, rows] of Object.entries(await dumpEveryTable(await openDatabase())))
    if (rows.length) left.push(`${table}: ${rows.length} row(s)`);
  for (const key of mockSecureItems.keys()) left.push('SecureStore ' + key);
  for (const file of cacheFiles()) left.push('file ' + file);
  return left;
}

beforeEach(async () => {
  await deleteLocalDatabase();
  resetMemorySqlite();
  resetMemoryFileSystem();
  mockSecureItems.clear();
});

test('Delete all leaves no row in any table, no kept Hiku photo, no SecureStore item and no file', async () => {
  await fillThePhone();
  expect(await deleteEverythingOnPhone('DELETE')).toEqual({ ok: true });
  expect(await leftAfterDeleteAll()).toEqual([]);
});

test('the guard notices a table, the key or a file that Delete all leaves behind', async () => {
  await fillThePhone();
  // A per-table delete that forgets one table, a key step that does nothing, and a
  // file step that forgets the image manipulator's folder.
  const leaky: DeletionOps = {
    removeDatabase: () => dbOperation(async db => {
      for (const table of [...BACKUP_TABLES].reverse()) if (table !== 'water_logs') await db.runAsync('DELETE FROM ' + table);
    }),
    removeKey: async () => ({ status: 'missing' }),
    removeTemporaryFiles: async () => {
      const kept = cacheFiles().filter(file => file.startsWith('ImageManipulator/'));
      resetMemoryFileSystem();
      for (const file of kept) writeCacheFile(file);
      return true;
    },
  };
  expect(await deleteEverythingOnPhone('DELETE', leaky)).toEqual({ ok: true });
  expect(await leftAfterDeleteAll()).toEqual([
    'water_logs: 1 row(s)', 'SecureStore liftria.anthropic.api-key', 'file ImageManipulator/7d4e8a31.jpg',
  ]);
  expect(await deleteKey()).toEqual({ status: 'missing' });
});

/** Every source file under app/ and src/, tests excluded. */
function appSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === '__tests__' || entry.name === 'node_modules') return [];
    const file = join(dir, entry.name);
    return entry.isDirectory() ? appSources(file) : /\.tsx?$/.test(entry.name) ? [file] : [];
  });
}
const SOURCES = ['app', 'src'].flatMap(root => appSources(join(process.cwd(), root)))
  .map(file => ({ name: relative(process.cwd(), file).replace(/\\/g, '/'), code: readFileSync(file, 'utf8') }));
const importsOf = (code: string) =>
  [...code.matchAll(/(?:from\s+|require\(\s*|import\(\s*)['"]([^'"]+)['"]/g)].map(match => match[1]!);
const allImports = () => new Set(SOURCES.flatMap(({ code }) => importsOf(code)).filter(name => !name.startsWith('.')));

test('app data is kept only in stores Delete all removes: one SQLite file and one SecureStore key', () => {
  const stores = [...allImports()]
    .filter(name => /sqlite|secure-?store|async-?storage|mmkv|kv-store|local-?storage|realm|watermelon/i.test(name));
  expect(stores.sort()).toEqual(['expo-secure-store', 'expo-sqlite']);

  const opens = SOURCES.flatMap(({ name, code }) =>
    [...code.matchAll(/openDatabase(?:Async|Sync)\(\s*([^),]+)/g)].map(match => name + ': ' + match[1]!.trim()));
  expect(opens).toEqual(['src/services/database/index.ts: DB_NAME']);

  const secureUsers = SOURCES.filter(({ code }) => importsOf(code).includes('expo-secure-store')).map(({ name }) => name);
  expect(secureUsers).toEqual(['src/services/secure-storage/index.ts']);
  const secureCode = SOURCES.find(({ name }) => name === secureUsers[0])!.code;
  const writes = [...secureCode.matchAll(/SecureStore\.setItemAsync\(\s*([^,]+)/g)].map(match => match[1]!.trim());
  expect(writes).toEqual(['KEY_NAME']);
});

test('every file Liftria writes is in a place Delete all clears', () => {
  // Modules that can create files; a new one must be reviewed and covered here.
  const fileModules = [...allImports()]
    .filter(name => /file|picker|camera|manipulator|print|audio|video|media|download|record/i.test(name));
  expect(fileModules.sort()).toEqual(['expo-document-picker', 'expo-file-system', 'expo-image-manipulator', 'expo-image-picker']);
  for (const module of fileModules.filter(name => name in NATIVE_CACHE_FOLDERS))
    expect(TEMPORARY_FILE_FOLDERS).toContain(NATIVE_CACHE_FOLDERS[module]);

  // No persistent document files: Liftria's own files live only in the cache.
  expect(SOURCES.filter(({ code }) => /Paths\.document|documentDirectory/.test(code)).map(({ name }) => name)).toEqual([]);
});
