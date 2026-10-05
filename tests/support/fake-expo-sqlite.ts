/**
 * The subset of the expo-sqlite async API the app uses, backed by better-sqlite3.
 * Each database name maps to one in-memory database for the life of the process
 * (reset with __resetDatabases between test groups).
 */
import Database from "better-sqlite3";

export type SQLiteBindValue = string | number | null | boolean | Uint8Array;

const databases = new Map<string, Database.Database>();

const toBindable = (params: SQLiteBindValue[]) =>
  params.map((p) => (typeof p === "boolean" ? (p ? 1 : 0) : p));

/**
 * better-sqlite3 is built with SQLITE_ENABLE_UPDATE_DELETE_LIMIT; expo-sqlite (iOS and
 * Android) is not, so `UPDATE … ORDER BY/LIMIT` is a syntax error on devices. Mirror that.
 */
const assertPortable = (sql: string) => {
  if (!/^\s*(UPDATE|DELETE)\b/i.test(sql)) return;
  let topLevel = sql;
  while (/\([^()]*\)/.test(topLevel)) topLevel = topLevel.replace(/\([^()]*\)/g, "");
  if (/\b(ORDER\s+BY|LIMIT)\b/i.test(topLevel)) {
    throw new Error(`near "ORDER"/"LIMIT": syntax error (not supported by expo-sqlite builds): ${sql.trim()}`);
  }
};

const guarded = new WeakSet<Database.Database>();

export class SQLiteDatabase {
  constructor(private readonly db: Database.Database) {
    if (guarded.has(db)) return;
    guarded.add(db);
    const prepare = db.prepare.bind(db);
    db.prepare = ((sql: string) => {
      assertPortable(sql);
      return prepare(sql);
    }) as typeof db.prepare;
  }

  async getAllAsync<T>(sql: string, params: SQLiteBindValue[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    if (!stmt.reader) {
      stmt.run(...toBindable(params));
      return [];
    }
    return stmt.all(...toBindable(params)) as T[];
  }

  async getFirstAsync<T>(sql: string, params: SQLiteBindValue[] = []): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    if (!stmt.reader) {
      stmt.run(...toBindable(params));
      return null;
    }
    return (stmt.get(...toBindable(params)) as T | undefined) ?? null;
  }

  async runAsync(sql: string, params: SQLiteBindValue[] = []): Promise<{ lastInsertRowId: number; changes: number }> {
    const stmt = this.db.prepare(sql);
    if (stmt.reader) {
      stmt.all(...toBindable(params));
      return { lastInsertRowId: 0, changes: 0 };
    }
    const result = stmt.run(...toBindable(params));
    return { lastInsertRowId: Number(result.lastInsertRowid), changes: result.changes };
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

export const defaultDatabaseDirectory = "memory";

export const openDatabaseAsync = async (name: string): Promise<SQLiteDatabase> => {
  let db = databases.get(name);
  if (!db) {
    db = new Database(":memory:");
    databases.set(name, db);
  }
  return new SQLiteDatabase(db);
};

export const deleteDatabaseAsync = async (name: string): Promise<void> => {
  databases.get(name)?.close();
  databases.delete(name);
};

export const __resetDatabases = () => {
  for (const db of databases.values()) db.close();
  databases.clear();
};
