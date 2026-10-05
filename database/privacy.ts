/**
 * Local data export, restore and wipe.
 */
import * as SQLite from "expo-sqlite";

import { queryAll } from "./connection";
import { dbSchemaVersion, runDatabaseMigrations, initDb } from "./schema";

const localDataTables = [
  "cycles",
  "symptom_entries",
  "cycle_predictions",
  "prediction_feedback",
  "user_correlations",
  "red_flag_prompt_logs",
  "app_settings",
  "schema_migrations",
] as const;

export const exportLocalDataSnapshot = async () => {
  await initDb();
  return {
    exported_at: new Date().toISOString(),
    app: "CycleIQ",
    schema: "cycleiq-local-export-v2",
    schema_version: dbSchemaVersion,
    cycles: await queryAll<Record<string, unknown>>(`SELECT * FROM cycles ORDER BY start_date DESC;`),
    symptom_entries: await queryAll<Record<string, unknown>>(`SELECT * FROM symptom_entries ORDER BY logged_date DESC;`),
    cycle_predictions: await queryAll<Record<string, unknown>>(`SELECT * FROM cycle_predictions ORDER BY generated_at DESC;`),
    prediction_feedback: await queryAll<Record<string, unknown>>(`SELECT * FROM prediction_feedback ORDER BY recorded_at DESC;`),
    user_correlations: await queryAll<Record<string, unknown>>(`SELECT * FROM user_correlations ORDER BY generated_at DESC;`),
    red_flag_prompt_logs: await queryAll<Record<string, unknown>>(`SELECT * FROM red_flag_prompt_logs ORDER BY triggered_at DESC;`),
    app_settings: await queryAll<Record<string, unknown>>(`SELECT * FROM app_settings ORDER BY key ASC;`),
    schema_migrations: await queryAll<Record<string, unknown>>(`SELECT * FROM schema_migrations ORDER BY id ASC;`),
  };
};

/** Backups are user-chosen files: bind primitives as-is and store anything else as JSON text. */
const toBindValue = (value: unknown): SQLite.SQLiteBindValue => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return JSON.stringify(value);
};

const insertRestoredRows = async (
  database: SQLite.SQLiteDatabase,
  tableName: string,
  rows: unknown,
) => {
  if (!Array.isArray(rows)) return;
  for (const row of rows as Record<string, unknown>[]) {
    const columns = Object.keys(row);
    if (columns.length === 0) continue;
    const placeholders = columns.map(() => "?").join(", ");
    const columnList = columns.map((column) => `"${column.replace(/"/g, '""')}"`).join(", ");
    await database.runAsync(
      `INSERT OR REPLACE INTO ${tableName} (${columnList}) VALUES (${placeholders});`,
      columns.map((column) => toBindValue(row[column])),
    );
  }
};

export const restoreLocalDataSnapshot = async (snapshot: Record<string, unknown>): Promise<void> => {
  if (snapshot?.app !== "CycleIQ" || typeof snapshot?.schema !== "string") {
    throw new Error("Invalid CycleIQ local data backup.");
  }
  const database = await initDb();
  await database.withTransactionAsync(async () => {
    await database.runAsync(`DELETE FROM symptom_entries;`);
    await database.runAsync(`DELETE FROM cycle_predictions;`);
    await database.runAsync(`DELETE FROM prediction_feedback;`);
    await database.runAsync(`DELETE FROM user_correlations;`);
    await database.runAsync(`DELETE FROM red_flag_prompt_logs;`);
    await database.runAsync(`DELETE FROM app_settings;`);
    await database.runAsync(`DELETE FROM schema_migrations;`);
    await database.runAsync(`DELETE FROM cycles;`);

    for (const tableName of localDataTables) {
      await insertRestoredRows(database, tableName, snapshot[tableName]);
    }
    await runDatabaseMigrations(database);
  });
};

export const wipeLocalDatabase = async (): Promise<void> => {
  const database = await initDb();
  await database.withTransactionAsync(async () => {
    await database.runAsync(`DELETE FROM symptom_entries;`);
    await database.runAsync(`DELETE FROM cycles;`);
    await database.runAsync(`DELETE FROM cycle_predictions;`);
    await database.runAsync(`DELETE FROM prediction_feedback;`);
    await database.runAsync(`DELETE FROM user_correlations;`);
    await database.runAsync(`DELETE FROM red_flag_prompt_logs;`);
    await database.runAsync(`DELETE FROM app_settings;`);
    await database.runAsync(`DELETE FROM schema_migrations;`);
    await runDatabaseMigrations(database);
  });
};
