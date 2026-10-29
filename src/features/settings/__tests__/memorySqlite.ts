import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

/* A stand-in for expo-sqlite backed by Node's real SQLite engine, so the app's own
 * migration SQL, CHECK and FOREIGN KEY constraints run unchanged. Each database name
 * is one "file": it survives closeAsync and is only removed by deleteDatabaseAsync. */
type Params = SQLInputValue[];
const files = new Map<string, DatabaseSync>();
const open = new Set<string>();

function params(args: unknown[]): Params {
  const list = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  return list as Params;
}
function plain<T>(row: unknown): T {
  return { ...(row as object) } as T;
}

export type MemoryDatabase = {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...args: unknown[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getFirstAsync<T>(sql: string, ...args: unknown[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...args: unknown[]): Promise<T[]>;
  withExclusiveTransactionAsync(task: (tx: MemoryDatabase) => Promise<void>): Promise<void>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
  closeAsync(): Promise<void>;
};

function connect(name: string): MemoryDatabase {
  const file = files.get(name) ?? new DatabaseSync(':memory:');
  files.set(name, file);
  open.add(name);
  const transaction = async (task: () => Promise<void>) => {
    file.exec('BEGIN EXCLUSIVE');
    try { await task(); file.exec('COMMIT'); }
    catch (error) { file.exec('ROLLBACK'); throw error; }
  };
  const db: MemoryDatabase = {
    execAsync: async sql => { file.exec(sql); },
    runAsync: async (sql, ...args) => {
      const result = file.prepare(sql).run(...params(args));
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getFirstAsync: async <T>(sql: string, ...args: unknown[]) => {
      const row = file.prepare(sql).get(...params(args));
      return row === undefined ? null : plain<T>(row);
    },
    getAllAsync: async <T>(sql: string, ...args: unknown[]) =>
      file.prepare(sql).all(...params(args)).map(row => plain<T>(row)),
    withExclusiveTransactionAsync: task => transaction(() => task(db)),
    withTransactionAsync: task => transaction(task),
    closeAsync: async () => { open.delete(name); },
  };
  return db;
}

export const memoryExpoSqlite = {
  openDatabaseAsync: async (name: string) => connect(name),
  deleteDatabaseAsync: async (name: string) => {
    // Same failure modes as expo-sqlite's native deleteDatabase.
    if (open.has(name)) {
      throw new Error(`Unable to delete database '${name}' that is currently open. Close it prior to deletion.`);
    }
    const file = files.get(name);
    if (!file) throw new Error(`Database '${name}' not found`);
    file.close();
    files.delete(name);
  },
};

/** Database "files" that currently exist, open or closed. */
export function storedDatabaseNames(): string[] {
  return [...files.keys()].sort();
}
export function resetMemorySqlite(): void {
  for (const file of files.values()) file.close();
  files.clear();
  open.clear();
}

/** Opens a scratch database, applies the given migration SQL in order and lists the
 * application tables SQLite actually created (sqlite_* internals excluded). */
export function tablesCreatedBy(migrations: readonly string[]): string[] {
  const db = new DatabaseSync(':memory:');
  try {
    for (const sql of migrations) db.exec(sql);
    return db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all().map(row => String((row as { name: unknown }).name));
  } finally {
    db.close();
  }
}
