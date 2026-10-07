/**
 * Web preview connection. expo-sqlite has no stable web build, so the browser preview runs
 * the same database code as the apps on sql.js (SQLite compiled to WebAssembly), loaded from
 * jsDelivr on first use. The database lives in memory only: nothing is written to browser
 * storage and everything is gone when the tab closes. iOS and Android use connection.ts
 * (SQLCipher-encrypted, on device).
 */

const SQL_JS_VERSION = "1.14.2";
const SQL_JS_BASE = `https://cdn.jsdelivr.net/npm/sql.js@${SQL_JS_VERSION}/dist/`;

export type SqlBindValue = string | number | null | boolean | Uint8Array;
export type SqlParams = SqlBindValue[];

export interface SqlResult<T> {
  rows: { length: number; item: (i: number) => T };
  insertId?: number;
  rowsAffected?: number;
}

interface SqlJsStatement {
  bind(values: unknown[]): boolean;
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  free(): void;
}
interface SqlJsDatabase {
  prepare(sql: string): SqlJsStatement;
  run(sql: string, params?: unknown[]): void;
  exec(sql: string): { values: unknown[][] }[];
  getRowsModified(): number;
}
type InitSqlJs = (config: { locateFile: (file: string) => string }) => Promise<{ Database: new () => SqlJsDatabase }>;

const toBindable = (params: SqlParams) =>
  params.map((p) => (typeof p === "boolean" ? (p ? 1 : 0) : p === undefined ? null : p));

const loadSqlJs = (): Promise<InitSqlJs> =>
  new Promise((resolve, reject) => {
    const existing = (globalThis as { initSqlJs?: InitSqlJs }).initSqlJs;
    if (existing) return resolve(existing);
    const script = document.createElement("script");
    script.src = `${SQL_JS_BASE}sql-wasm.js`;
    script.onload = () => {
      const init = (globalThis as { initSqlJs?: InitSqlJs }).initSqlJs;
      if (init) resolve(init);
      else reject(new Error("sql.js loaded but initSqlJs is missing"));
    };
    script.onerror = () => reject(new Error("Couldn't load sql.js (the web preview needs an internet connection)"));
    document.head.appendChild(script);
  });

/** The subset of the expo-sqlite async API that the database modules use. */
class WebDatabase {
  constructor(private readonly db: SqlJsDatabase) {}

  private all<T>(sql: string, params: SqlParams): T[] {
    const stmt = this.db.prepare(sql);
    try {
      if (params.length) stmt.bind(toBindable(params));
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  }

  async getAllAsync<T>(sql: string, params: SqlParams = []): Promise<T[]> {
    return this.all<T>(sql, params);
  }

  async getFirstAsync<T>(sql: string, params: SqlParams = []): Promise<T | null> {
    return this.all<T>(sql, params)[0] ?? null;
  }

  async runAsync(sql: string, params: SqlParams = []): Promise<{ lastInsertRowId: number; changes: number }> {
    this.db.run(sql, toBindable(params));
    const changes = this.db.getRowsModified();
    const lastId = Number(this.db.exec("SELECT last_insert_rowid();")[0]?.values[0]?.[0] ?? 0);
    return { lastInsertRowId: lastId, changes };
  }

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    this.db.exec("BEGIN");
    try {
      await task();
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async closeAsync(): Promise<void> {}
}

let dbPromise: Promise<WebDatabase> | null = null;

export const ensureDb = (): Promise<WebDatabase> => {
  if (!dbPromise) {
    dbPromise = loadSqlJs()
      .then((init) => init({ locateFile: (file) => `${SQL_JS_BASE}${file}` }))
      .then((SQL) => new WebDatabase(new SQL.Database()))
      .catch((error) => {
        dbPromise = null;
        throw error;
      });
  }
  return dbPromise;
};

export const getActiveDbName = async (): Promise<string> => "web-preview (in memory)";

export const getDatabaseEncryptionStatus = async () => ({
  keyApplied: false,
  sqlCipherAvailable: false,
  cipherVersion: null as string | null,
});

export const checkpointDatabase = async (): Promise<void> => {};

export const execSql = async <T = Record<string, unknown>>(sql: string, params: SqlParams = []): Promise<SqlResult<T>> => {
  const database = await ensureDb();
  try {
    if (sql.trimStart().toUpperCase().startsWith("SELECT")) {
      const rows = await database.getAllAsync<T>(sql, params);
      return { rows: { length: rows.length, item: (i: number) => rows[i] } };
    }
    const result = await database.runAsync(sql, params);
    return {
      rows: { length: 0, item: () => { throw new Error("Statement returned no rows"); } },
      insertId: result.lastInsertRowId,
      rowsAffected: result.changes,
    };
  } catch (error) {
    console.error("SQL Error", error, sql);
    throw error;
  }
};

export const queryAll = async <T>(sql: string, params: SqlParams = []): Promise<T[]> =>
  (await ensureDb()).getAllAsync<T>(sql, params);

export const queryFirst = async <T>(sql: string, params: SqlParams = []): Promise<T | null> =>
  (await ensureDb()).getFirstAsync<T>(sql, params);

export const createLocalId = (): string => globalThis.crypto.randomUUID();
