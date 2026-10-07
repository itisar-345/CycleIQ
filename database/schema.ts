/**
 * Table definitions and the forward-only migration ledger.
 */
import * as SQLite from "expo-sqlite";

import { ensureDb } from "./connection";
import { reassignEntryCycles, recomputeCycleLengths } from "./cycles";

export const dbSchemaVersion = 5;

type DatabaseMigration = {
  id: number;
  name: string;
  up: (database: SQLite.SQLiteDatabase) => Promise<void>;
};

const databaseMigrations: DatabaseMigration[] = [
  {
    id: 1,
    name: "symptom-health-and-clot-fields",
    up: async (database) => {
      await database.runAsync(`ALTER TABLE symptom_entries ADD COLUMN steps_count INTEGER;`).catch(() => {});
      await database.runAsync(`ALTER TABLE symptom_entries ADD COLUMN activity_minutes INTEGER;`).catch(() => {});
      await database.runAsync(`ALTER TABLE symptom_entries ADD COLUMN health_sleep_source TEXT;`).catch(() => {});
      await database.runAsync(`ALTER TABLE symptom_entries ADD COLUMN health_activity_source TEXT;`).catch(() => {});
      await database.runAsync(`ALTER TABLE symptom_entries ADD COLUMN clots_present INTEGER DEFAULT 0;`).catch(() => {});
    },
  },
  {
    id: 2,
    name: "prediction-and-prompt-indexes",
    up: async (database) => {
      await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_symptom_date ON symptom_entries(logged_date DESC)`);
      await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_flare_start ON symptom_entries(flare_start)`);
      await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_cycle_predictions_generated ON cycle_predictions(generated_at DESC)`);
      await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_red_flag_prompt_logs_date ON red_flag_prompt_logs(triggered_at DESC)`);
    },
  },
  {
    id: 3,
    name: "local-architecture-migration-ledger",
    up: async (database) => {
      await database.runAsync(`CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      )`);
    },
  },
  {
    id: 4,
    name: "recompute-cycle-lengths-open-latest-cycle",
    // Onboarding used to give the in-progress cycle a fabricated length, and deleteCycle
    // never recomputed neighbours. Rebuild every length from start dates.
    up: async (database) => {
      await recomputeCycleLengths(database);
    },
  },
  {
    id: 5,
    name: "entries-belong-to-whole-cycles",
    // Logs used to get a cycle_id only during an active period, so phase analysis only ever
    // saw period days. Attach every log to the cycle its local day falls in.
    up: async (database) => {
      await reassignEntryCycles(database);
    },
  },
];

export const runDatabaseMigrations = async (database: SQLite.SQLiteDatabase) => {
  await database.runAsync(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`);
  const appliedRows = await database.getAllAsync<{ id: number }>(`SELECT id FROM schema_migrations;`);
  const applied = new Set(appliedRows.map((row) => row.id));
  for (const migration of databaseMigrations) {
    if (applied.has(migration.id)) continue;
    await migration.up(database);
    await database.runAsync(
      `INSERT OR IGNORE INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?);`,
      [migration.id, migration.name, new Date().toISOString()],
    );
  }
  await database.runAsync(
    `INSERT INTO app_settings (key, value_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at;`,
    ["db_schema_version", JSON.stringify(dbSchemaVersion), new Date().toISOString()],
  );
};

export const initDb = async () => {
  const database = await ensureDb();
  await database.withTransactionAsync(async () => {
    await database.runAsync("PRAGMA journal_mode = WAL;");
    await database.runAsync(`CREATE TABLE IF NOT EXISTS cycles (
      id TEXT PRIMARY KEY,
      start_date TEXT NOT NULL,
      end_date TEXT,
      cycle_length INTEGER,
      period_length INTEGER,
      is_confirmed INTEGER DEFAULT 0,
      notes_encrypted TEXT
    )`);
    await database.runAsync(`CREATE TABLE IF NOT EXISTS symptom_entries (
      id TEXT PRIMARY KEY,
      cycle_id TEXT,
      logged_date TEXT NOT NULL,
      pain_score INTEGER,
      pain_locations TEXT,
      pain_type TEXT,
      mood_score INTEGER,
      mood_tags TEXT,
      brain_fog_score INTEGER,
      energy_score INTEGER,
      stress_score INTEGER,
      bloating TEXT,
      nausea INTEGER,
      headache INTEGER,
      fatigue_score INTEGER,
      extended_symptoms TEXT,
      flare_start TEXT,
      flare_end TEXT,
      flare_reflection_encrypted TEXT,
      flow_intensity TEXT,
      clots_present INTEGER DEFAULT 0,
      clots_size TEXT,
      spotting INTEGER,
      sleep_hours REAL,
      sleep_quality INTEGER,
      exercise_type TEXT,
      exercise_duration INTEGER,
      steps_count INTEGER,
      activity_minutes INTEGER,
      health_sleep_source TEXT,
      health_activity_source TEXT,
      diet_notes_encrypted TEXT,
      medication_log_encrypted TEXT,
      synced INTEGER DEFAULT 0,
      updated_at TEXT,
      FOREIGN KEY(cycle_id) REFERENCES cycles(id)
    )`);
    await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_symptom_date ON symptom_entries(logged_date DESC)`);
    await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_flare_start ON symptom_entries(flare_start)`);
    await database.runAsync(`ALTER TABLE symptom_entries ADD COLUMN steps_count INTEGER;`).catch(() => {});
    await database.runAsync(`ALTER TABLE symptom_entries ADD COLUMN activity_minutes INTEGER;`).catch(() => {});
    await database.runAsync(`ALTER TABLE symptom_entries ADD COLUMN health_sleep_source TEXT;`).catch(() => {});
    await database.runAsync(`ALTER TABLE symptom_entries ADD COLUMN health_activity_source TEXT;`).catch(() => {});
    await database.runAsync(`ALTER TABLE symptom_entries ADD COLUMN clots_present INTEGER DEFAULT 0;`).catch(() => {});
    await database.runAsync(`CREATE TABLE IF NOT EXISTS user_correlations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      correlation REAL,
      n INTEGER,
      generated_at TEXT NOT NULL
    )`);
    await database.runAsync(`CREATE TABLE IF NOT EXISTS prediction_feedback (
      id TEXT PRIMARY KEY,
      cycle_id TEXT NOT NULL,
      predicted_start TEXT NOT NULL,
      actual_start TEXT NOT NULL,
      error_days REAL NOT NULL,
      recorded_at TEXT NOT NULL
    )`);
    await database.runAsync(`CREATE TABLE IF NOT EXISTS cycle_predictions (
      id TEXT PRIMARY KEY,
      generated_at TEXT NOT NULL,
      model_version TEXT NOT NULL,
      current_mode TEXT NOT NULL,
      predicted_start TEXT,
      window_start TEXT,
      window_end TEXT,
      mean REAL,
      std_dev REAL,
      confidence REAL,
      mae REAL,
      model TEXT,
      label TEXT,
      payload_json TEXT NOT NULL
    )`);
    await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_cycle_predictions_generated ON cycle_predictions(generated_at DESC)`);
    await database.runAsync(`CREATE TABLE IF NOT EXISTS red_flag_prompt_logs (
      id TEXT PRIMARY KEY,
      trigger_type TEXT NOT NULL,
      triggered_at TEXT NOT NULL,
      logged_date TEXT NOT NULL,
      message TEXT NOT NULL,
      severity INTEGER,
      cycle_id TEXT,
      entry_context_json TEXT
    )`);
    await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_red_flag_prompt_logs_date ON red_flag_prompt_logs(triggered_at DESC)`);
    await database.runAsync(`CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
    await runDatabaseMigrations(database);
  });
  return database;
};
