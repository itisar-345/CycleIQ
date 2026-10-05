/**
 * SQLite connection: opens the (SQLCipher-encrypted when available) database once,
 * migrates a legacy plaintext file, and exposes the low-level query helpers.
 */
import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";
import { getOrCreateDbKey } from "../utils/secureKey";

/** Plaintext database used by builds without SQLCipher (and by all builds before v4). */
const LEGACY_DB_NAME = "cycleiq.sqlite";

/** SQLCipher-encrypted database (requires the expo-sqlite `useSQLCipher` build flag). */
const SECURE_DB_NAME = "cycleiq-secure.sqlite";

let activeDbName = LEGACY_DB_NAME;

/** File name of the database currently in use (encrypted when SQLCipher is available). */
export const getActiveDbName = async (): Promise<string> => {
  await ensureDb();
  return activeDbName;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

let dbEncryptionStatus: {
  keyApplied: boolean;
  sqlCipherAvailable: boolean;
  cipherVersion: string | null;
} = {
  keyApplied: false,
  sqlCipherAvailable: false,
  cipherVersion: null,
};

const quoteSqlString = (value: string) => `'${value.replace(/'/g, "''")}'`;

const readCipherVersion = async (database: SQLite.SQLiteDatabase): Promise<string | null> => {
  const row = await database.getFirstAsync<Record<string, unknown>>(`PRAGMA cipher_version;`).catch(() => null);
  const version = row ? String(Object.values(row)[0] ?? "") : "";
  return version || null;
};

const countTables = async (database: SQLite.SQLiteDatabase): Promise<number> => {
  const row = await database.getFirstAsync<{ n: number }>(
    `SELECT count(*) AS n FROM sqlite_master WHERE type = 'table';`,
  );
  return row?.n ?? 0;
};

const openKeyed = async (key: string): Promise<SQLite.SQLiteDatabase> => {
  const database = await SQLite.openDatabaseAsync(SECURE_DB_NAME);
  await database.execAsync(`PRAGMA key = ${quoteSqlString(key)};`);
  return database;
};

/**
 * One-time move of an existing plaintext database into the encrypted file using
 * sqlcipher_export. The plaintext file is deleted only after the export succeeds.
 */
const migrateLegacyPlaintextDb = async (key: string): Promise<boolean> => {
  const legacy = await SQLite.openDatabaseAsync(LEGACY_DB_NAME);
  const legacyTables = await countTables(legacy).catch(() => 0);
  if (legacyTables === 0) {
    await legacy.closeAsync();
    await SQLite.deleteDatabaseAsync(LEGACY_DB_NAME).catch(() => {});
    return false;
  }
  const securePath = `${String(SQLite.defaultDatabaseDirectory).replace(/^file:\/\//, "")}/${SECURE_DB_NAME}`;
  await legacy.execAsync(`PRAGMA wal_checkpoint(FULL);`).catch(() => {});
  await legacy.execAsync(`ATTACH DATABASE ${quoteSqlString(securePath)} AS secure KEY ${quoteSqlString(key)};`);
  await legacy.execAsync(`SELECT sqlcipher_export('secure');`);
  await legacy.execAsync(`DETACH DATABASE secure;`);
  await legacy.closeAsync();
  await SQLite.deleteDatabaseAsync(LEGACY_DB_NAME);
  return true;
};

const openDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  const key = await getOrCreateDbKey();
  let database = await openKeyed(key);
  const cipherVersion = await readCipherVersion(database);

  if (!cipherVersion) {
    // SQLCipher isn't compiled into this build (e.g. Expo Go). Keep using the plaintext
    // database and report it honestly in Settings instead of pretending it's encrypted.
    await database.closeAsync();
    await SQLite.deleteDatabaseAsync(SECURE_DB_NAME).catch(() => {});
    activeDbName = LEGACY_DB_NAME;
    dbEncryptionStatus = { keyApplied: false, sqlCipherAvailable: false, cipherVersion: null };
    return SQLite.openDatabaseAsync(LEGACY_DB_NAME);
  }

  // A wrong key surfaces here as "file is not a database" — fail loudly, never wipe.
  if ((await countTables(database)) === 0) {
    await database.closeAsync();
    await migrateLegacyPlaintextDb(key);
    database = await openKeyed(key);
  }

  activeDbName = SECURE_DB_NAME;
  dbEncryptionStatus = { keyApplied: true, sqlCipherAvailable: true, cipherVersion };
  return database;
};

/** Opens the database once; concurrent callers share the same open/migration. */
export const ensureDb = (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbPromise) {
    dbPromise = openDatabase().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
};

export const getDatabaseEncryptionStatus = async () => {
  await ensureDb();
  return dbEncryptionStatus;
};

export const checkpointDatabase = async (): Promise<void> => {
  const database = await ensureDb();
  await database.runAsync(`PRAGMA wal_checkpoint(FULL);`).catch(() => {});
};

export type SqlParams = SQLite.SQLiteBindValue[];

export interface SqlResult<T> {
  rows: { length: number; item: (i: number) => T };
  insertId?: number;
  rowsAffected?: number;
}

/** Runs a statement. SELECTs return rows typed as `T`; other statements return counts. */
export const execSql = async <T = Record<string, unknown>>(sql: string, params: SqlParams = []): Promise<SqlResult<T>> => {
  const database = await ensureDb();
  try {
    const trimmed = sql.trimStart().toUpperCase();
    if (trimmed.startsWith("SELECT")) {
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

/** All rows of a SELECT, typed. */
export const queryAll = async <T>(sql: string, params: SqlParams = []): Promise<T[]> => {
  const database = await ensureDb();
  return database.getAllAsync<T>(sql, params);
};

/** First row of a SELECT, or null. */
export const queryFirst = async <T>(sql: string, params: SqlParams = []): Promise<T | null> => {
  const database = await ensureDb();
  return database.getFirstAsync<T>(sql, params);
};

export const createLocalId = (): string => Crypto.randomUUID();
