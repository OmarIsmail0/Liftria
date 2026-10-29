/* The subset of Node's built-in SQLite module (same signatures as @types/node) that the
 * data coverage tests use. tsconfig loads only Jest's types: adding all of @types/node
 * would type-check app code against Node globals that React Native doesn't have. */
declare module 'node:sqlite' {
  export type SQLInputValue = null | number | bigint | string | Uint8Array;
  export type SQLOutputValue = null | number | bigint | string | Uint8Array;
  export interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }
  export class StatementSync {
    all(...anonymousParameters: SQLInputValue[]): Record<string, SQLOutputValue>[];
    get(...anonymousParameters: SQLInputValue[]): Record<string, SQLOutputValue> | undefined;
    run(...anonymousParameters: SQLInputValue[]): StatementResultingChanges;
  }
  export class DatabaseSync {
    constructor(path: string);
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}
