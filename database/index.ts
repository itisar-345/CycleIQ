import { differenceInDays } from "date-fns";
import * as SQLite from "expo-sqlite";
import type { AppMode, NotificationPrefs } from "../store";
import type { HealthImportPrefs } from "../utils/healthIntegrations";
import { getOrCreateDbKey } from "../utils/secureKey";

export const dbName = "cycleiq.sqlite";

let db: SQLite.SQLiteDatabase | null = null;
let dbKeyApplied = false;
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

const ensureDb = async () => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(dbName);
  if (!dbKeyApplied) {
    const key = await getOrCreateDbKey();
    try {
      await db.runAsync(`PRAGMA key = ${quoteSqlString(key)};`);
      await db.runAsync(`PRAGMA cipher_compatibility = 4;`).catch(() => {});
      const cipherRows = await db.getAllAsync(`PRAGMA cipher_version;`).catch(() => []);
      const cipherVersion =
        Array.isArray(cipherRows) && cipherRows.length > 0
          ? String(Object.values(cipherRows[0] as Record<string, unknown>)[0] ?? "")
          : "";
      dbEncryptionStatus = {
        keyApplied: true,
        sqlCipherAvailable: cipherVersion.length > 0,
        cipherVersion: cipherVersion || null,
      };
    } catch {
      dbEncryptionStatus = {
        keyApplied: false,
        sqlCipherAvailable: false,
        cipherVersion: null,
      };
    } finally {
      dbKeyApplied = true;
    }
  }
  return db;
};

export const getDatabaseEncryptionStatus = async () => {
  await ensureDb();
  return dbEncryptionStatus;
};

const execSql = async (sql: string, params: any[] = []): Promise<any> => {
  const database = await ensureDb();
  try {
    const trimmed = sql.trimStart().toUpperCase();
    if (trimmed.startsWith("SELECT")) {
      const rows = await database.getAllAsync(sql, params);
      return { rows: { length: rows.length, item: (i: number) => rows[i] } };
    }
    const result = await database.runAsync(sql, params);
    return { rows: { length: 0, item: () => null }, insertId: result.lastInsertRowId, rowsAffected: result.changes };
  } catch (error) {
    console.error("SQL Error", error, sql);
    throw error;
  }
};

const createLocalId = () => {
  const randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (randomUUID) return randomUUID();
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
  });
  return database;
};

export const getLatestCycle = async () => {
  const result = await execSql(
    `SELECT * FROM cycles ORDER BY start_date DESC LIMIT 1;`,
  );
  return result.rows.length > 0 ? (result.rows.item(0) as any) : null;
};

export const createCycle = async (startDate: string) => {
  const id = createLocalId();
  const prevCycle = await getLatestCycle();

  await execSql(
    `INSERT INTO cycles (id,start_date,is_confirmed) VALUES (?,?,1);`,
    [id, startDate],
  );

  if (prevCycle && prevCycle.start_date) {
    const cycleLength = differenceInDays(
      new Date(startDate),
      new Date(prevCycle.start_date),
    );
    await execSql(`UPDATE cycles SET cycle_length = ? WHERE id = ?;`, [
      cycleLength,
      prevCycle.id,
    ]);

    // Record prediction feedback: compare what was predicted vs what actually happened
    try {
      const existing = await execSql(
        `SELECT id FROM prediction_feedback WHERE cycle_id = ?;`,
        [prevCycle.id]
      );
      if (existing.rows.length === 0) {
        // Re-run engine on cycles BEFORE this new one to get what was predicted
        const { runPredictionEngine } = await import("../utils/predictions");
        const histResult = await execSql(
          `SELECT * FROM cycles WHERE id != ? ORDER BY start_date DESC;`, [id]
        );
        const historicCycles: any[] = [];
        for (let i = 0; i < histResult.rows.length; i++) historicCycles.push(histResult.rows.item(i));
        if (historicCycles.length >= 2) {
          const pred = runPredictionEngine({ cycles: historicCycles, currentMode: "standard" });
          if (pred.predictedStartISO) {
            const errorDays = differenceInDays(new Date(startDate), new Date(pred.predictedStartISO));
            await execSql(
              `INSERT INTO prediction_feedback (id, cycle_id, predicted_start, actual_start, error_days, recorded_at)
               VALUES (?,?,?,?,?,?);`,
              [createLocalId(), prevCycle.id, pred.predictedStartISO, startDate, errorDays, new Date().toISOString()]
            );
          }
        }
      }
    } catch (e) {
      // Non-fatal — feedback recording should never block cycle creation
      console.warn("Prediction feedback recording failed", e);
    }
  }

  await retrainAndStoreCyclePrediction();
  return id;
};

export const closeCycle = async (cycleId: string, endDate: string) => {
  const result = await execSql(`SELECT start_date FROM cycles WHERE id = ?;`, [
    cycleId,
  ]);
  if (result.rows.length === 0) return null;
  const startDate = result.rows.item(0).start_date;
  const periodLength =
    differenceInDays(new Date(endDate), new Date(startDate)) + 1;
  await execSql(
    `UPDATE cycles SET end_date = ?, period_length = ?, is_confirmed = 1 WHERE id = ?;`,
    [endDate, periodLength, cycleId],
  );
  await retrainAndStoreCyclePrediction();
  return periodLength;
};

export interface SymptomEntry {
  cycle_id?: string | null;
  logged_date: string;
  pain_score?: number;
  pain_locations?: string[];
  pain_type?: string[];
  mood_score?: number;
  mood_tags?: string[];
  brain_fog_score?: number;
  energy_score?: number;
  stress_score?: number;
  bloating?: string | null;
  nausea?: boolean;
  headache?: boolean;
  fatigue_score?: number;
  extended_symptoms?: any;
  flare_start?: string;
  flare_end?: string;
  flare_reflection_encrypted?: string;
  flow_intensity?: string | null;
  clots_present?: boolean;
  clots_size?: string | null;
  spotting?: boolean;
  sleep_hours?: number;
  sleep_quality?: number;
  exercise_type?: string;
  exercise_duration?: number;
  steps_count?: number;
  activity_minutes?: number;
  health_sleep_source?: string;
  health_activity_source?: string;
  diet_notes_encrypted?: string;
  medication_log_encrypted?: string;
}

export const createSymptomEntry = async (entry: SymptomEntry) => {
  const id = createLocalId();
  await execSql(
    `INSERT INTO symptom_entries (
        id, cycle_id, logged_date, pain_score, pain_locations, pain_type, mood_score, mood_tags,
        brain_fog_score, energy_score, stress_score, bloating, nausea, headache, fatigue_score,
        extended_symptoms, flare_start, flare_end, flare_reflection_encrypted, flow_intensity, clots_size,
        clots_present, spotting, sleep_hours, sleep_quality, exercise_type, exercise_duration,
        steps_count, activity_minutes, health_sleep_source, health_activity_source,
        diet_notes_encrypted, medication_log_encrypted, synced, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`,
    [
      id,
      entry.cycle_id ?? null,
      entry.logged_date,
      entry.pain_score ?? null,
      entry.pain_locations ? JSON.stringify(entry.pain_locations) : null,
      entry.pain_type ? JSON.stringify(entry.pain_type) : null,
      entry.mood_score ?? null,
      entry.mood_tags ? JSON.stringify(entry.mood_tags) : null,
      entry.brain_fog_score ?? null,
      entry.energy_score ?? null,
      entry.stress_score ?? 3,
      entry.bloating ?? null,
      entry.nausea ? 1 : 0,
      entry.headache ? 1 : 0,
      entry.fatigue_score ?? null,
      entry.extended_symptoms ? JSON.stringify(entry.extended_symptoms) : null,
      entry.flare_start ?? null,
      entry.flare_end ?? null,
      entry.flare_reflection_encrypted ?? null,
      entry.flow_intensity ?? null,
      entry.clots_size ?? null,
      entry.clots_present ? 1 : 0,
      entry.spotting ? 1 : 0,
      entry.sleep_hours ?? null,
      entry.sleep_quality ?? null,
      entry.exercise_type ?? null,
      entry.exercise_duration ?? null,
      entry.steps_count ?? null,
      entry.activity_minutes ?? null,
      entry.health_sleep_source ?? null,
      entry.health_activity_source ?? null,
      entry.diet_notes_encrypted ?? null,
      entry.medication_log_encrypted ?? null,
      0,
      new Date().toISOString(),
    ],
  );
  return id;
};

export const getAllCycles = async () => {
  const result = await execSql(
    `SELECT * FROM cycles ORDER BY start_date DESC;`,
  );
  const cycles: any[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    cycles.push(result.rows.item(i));
  }
  return cycles;
};

import { runPredictionEngine, PredictionResult } from "../utils/predictions";

/**
 * Returns the mean signed error (actual - predicted) over the last N feedback records.
 * Positive = predictions were too early (need to add days).
 * Negative = predictions were too late (need to subtract days).
 * Capped at ±7 days to avoid over-correction.
 */
export const getPredictionBias = async (limit = 6): Promise<number> => {
  const result = await execSql(
    `SELECT error_days FROM prediction_feedback ORDER BY recorded_at DESC LIMIT ?;`,
    [limit]
  );
  if (result.rows.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < result.rows.length; i++) sum += result.rows.item(i).error_days;
  const bias = sum / result.rows.length;
  return Math.max(-7, Math.min(7, Math.round(bias * 10) / 10));
};

export const getCyclePredictions = async (
  currentMode: string = "standard",
  postPillMode = false,
  postPillStartDate: string | null = null
): Promise<PredictionResult> => {
  return retrainAndStoreCyclePrediction(currentMode, postPillMode, postPillStartDate);
};

export const retrainAndStoreCyclePrediction = async (
  currentMode: string = "standard",
  postPillMode = false,
  postPillStartDate: string | null = null
): Promise<PredictionResult> => {
  const result = await execSql(`SELECT * FROM cycles ORDER BY start_date DESC;`);
  const cycles: any[] = [];
  for (let i = 0; i < result.rows.length; i++) cycles.push(result.rows.item(i));
  const burdenResult = await execSql(`
    SELECT
      cycle_id,
      AVG(
        COALESCE(pain_score, 0) +
        COALESCE(fatigue_score, 0) +
        COALESCE(brain_fog_score, 0) +
        COALESCE(stress_score, 0)
      ) / 4.0 AS burden
    FROM symptom_entries
    WHERE cycle_id IS NOT NULL
    GROUP BY cycle_id;
  `);
  const symptomBurdenByCycle: Record<string, number> = {};
  for (let i = 0; i < burdenResult.rows.length; i++) {
    const row = burdenResult.rows.item(i);
    symptomBurdenByCycle[row.cycle_id] = Number(row.burden) || 0;
  }
  const biasCorrection = await getPredictionBias();
  const prediction = runPredictionEngine({
    cycles,
    currentMode,
    postPillMode,
    postPillStartDate,
    biasCorrection,
    symptomBurdenByCycle,
  });
  await saveCyclePrediction(prediction, currentMode);
  return prediction;
};

export const saveCyclePrediction = async (
  prediction: PredictionResult,
  currentMode: string = "standard",
): Promise<void> => {
  await execSql(
    `INSERT INTO cycle_predictions (
      id, generated_at, model_version, current_mode, predicted_start, window_start, window_end,
      mean, std_dev, confidence, mae, model, label, payload_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?);`,
    [
      createLocalId(),
      new Date().toISOString(),
      "cycleiq-prediction-v3",
      currentMode,
      prediction.predictedStartISO,
      prediction.windowStartISO,
      prediction.windowEndISO,
      prediction.mean,
      prediction.stdDev,
      prediction.confidence,
      prediction.mae,
      prediction.model,
      prediction.label,
      JSON.stringify(prediction),
    ],
  );
};

export const getLatestStoredCyclePrediction = async (
  currentMode?: string,
): Promise<PredictionResult | null> => {
  const result = currentMode
    ? await execSql(
        `SELECT payload_json FROM cycle_predictions WHERE current_mode = ? ORDER BY generated_at DESC LIMIT 1;`,
        [currentMode],
      )
    : await execSql(
        `SELECT payload_json FROM cycle_predictions ORDER BY generated_at DESC LIMIT 1;`,
      );
  if (result.rows.length === 0) return null;
  try {
    return JSON.parse(result.rows.item(0).payload_json) as PredictionResult;
  } catch {
    return null;
  }
};

export const getCycleEntries = async (cycleId: string) => {
  const result = await execSql(
    `SELECT * FROM symptom_entries WHERE cycle_id = ? ORDER BY logged_date DESC;`,
    [cycleId],
  );
  const entries: any[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    entries.push(result.rows.item(i));
  }
  return entries;
};

export const getAllEntries = async () => {
  const result = await execSql(
    `SELECT * FROM symptom_entries ORDER BY logged_date DESC;`,
  );
  const entries: any[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    entries.push(result.rows.item(i));
  }
  return entries;
};

export const getUnsyncedEntries = async () => {
  const result = await execSql(
    `SELECT * FROM symptom_entries WHERE synced = 0 ORDER BY logged_date ASC;`,
  );
  const entries: any[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    entries.push(result.rows.item(i));
  }
  return entries;
};

export const markEntriesSynced = async () => {
  await execSql(`UPDATE symptom_entries SET synced = 1 WHERE synced = 0;`);
};

export const updateCycle = async (
  cycleId: string,
  data: Partial<{
    start_date: string;
    end_date: string | null;
    cycle_length: number;
    period_length: number | null;
    notes_encrypted: string;
  }>,
) => {
  const existing = await execSql(`SELECT * FROM cycles WHERE id = ?;`, [cycleId]);
  const current = existing.rows.length > 0 ? existing.rows.item(0) : null;
  const updates: string[] = [];
  const params: any[] = [];
  if (data.start_date) {
    updates.push("start_date = ?");
    params.push(data.start_date);
  }
  if (Object.prototype.hasOwnProperty.call(data, "end_date")) {
    updates.push("end_date = ?");
    params.push(data.end_date ?? null);
  }
  if (typeof data.cycle_length === "number") {
    updates.push("cycle_length = ?");
    params.push(data.cycle_length);
  }
  if (typeof data.period_length === "number" || data.period_length === null) {
    updates.push("period_length = ?");
    params.push(data.period_length ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(data, "notes_encrypted")) {
    updates.push("notes_encrypted = ?");
    params.push(data.notes_encrypted ?? null);
  }
  if (updates.length === 0) return;

  const endDateWasProvided = Object.prototype.hasOwnProperty.call(data, "end_date");
  const nextStart = data.start_date ?? current?.start_date;
  const nextEnd = endDateWasProvided ? data.end_date : current?.end_date;
  if (endDateWasProvided && data.end_date === null && data.period_length === undefined) {
    updates.push("period_length = ?");
    params.push(null);
  } else if (nextStart && nextEnd && data.period_length === undefined) {
    updates.push("period_length = ?");
    params.push(differenceInDays(new Date(nextEnd), new Date(nextStart)) + 1);
  }

  params.push(cycleId);
  await execSql(
    `UPDATE cycles SET ${updates.join(", ")} WHERE id = ?;`,
    params,
  );

  const allCycles = await getAllCycles();
  for (let i = 0; i < allCycles.length; i++) {
    const currentCycle = allCycles[i];
    const previousCycle = allCycles[i + 1];
    if (previousCycle?.start_date && currentCycle?.start_date) {
      const cycleLength = differenceInDays(
        new Date(currentCycle.start_date),
        new Date(previousCycle.start_date),
      );
      await execSql(`UPDATE cycles SET cycle_length = ? WHERE id = ?;`, [
        cycleLength,
        previousCycle.id,
      ]);
    }
  }
  await retrainAndStoreCyclePrediction();
};

export interface RedFlagPromptLogInput {
  trigger_type: "severe_pain_3_days" | "bowel_shoulder_heavy_flow" | string;
  logged_date: string;
  message: string;
  severity?: number | null;
  cycle_id?: string | null;
  entry_context?: Record<string, any>;
}

export const createRedFlagPromptLog = async (log: RedFlagPromptLogInput): Promise<string> => {
  const id = createLocalId();
  await execSql(
    `INSERT INTO red_flag_prompt_logs (
      id, trigger_type, triggered_at, logged_date, message, severity, cycle_id, entry_context_json
    ) VALUES (?,?,?,?,?,?,?,?);`,
    [
      id,
      log.trigger_type,
      new Date().toISOString(),
      log.logged_date,
      log.message,
      log.severity ?? null,
      log.cycle_id ?? null,
      log.entry_context ? JSON.stringify(log.entry_context) : null,
    ],
  );
  return id;
};

export const getRedFlagPromptLogs = async (): Promise<any[]> => {
  const result = await execSql(
    `SELECT * FROM red_flag_prompt_logs ORDER BY triggered_at DESC;`,
  );
  const logs: any[] = [];
  for (let i = 0; i < result.rows.length; i++) logs.push(result.rows.item(i));
  return logs;
};

export const saveAppSetting = async (key: string, value: any): Promise<void> => {
  await execSql(
    `INSERT INTO app_settings (key, value_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at;`,
    [key, JSON.stringify(value), new Date().toISOString()],
  );
};

export const getAppSettings = async (): Promise<Record<string, any>> => {
  const result = await execSql(`SELECT key, value_json FROM app_settings;`);
  const settings: Record<string, any> = {};
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    try {
      settings[row.key] = JSON.parse(row.value_json);
    } catch {
      settings[row.key] = row.value_json;
    }
  }
  return settings;
};

export const persistAppSettingsSnapshot = async (settings: {
  currentMode: AppMode;
  language: string;
  languagePreset: string;
  customTerms: Record<string, string>;
  notificationsEnabled: boolean;
  notificationPrefs: NotificationPrefs;
  healthImportPrefs: HealthImportPrefs;
  dismissedInsights: string[];
  tier?: string;
}): Promise<void> => {
  await saveAppSetting("current_mode", settings.currentMode);
  await saveAppSetting("language", settings.language);
  await saveAppSetting("language_preset", settings.languagePreset);
  await saveAppSetting("custom_terms", settings.customTerms);
  await saveAppSetting("notifications_enabled", settings.notificationsEnabled);
  await saveAppSetting("notification_prefs", settings.notificationPrefs);
  await saveAppSetting("health_import_prefs", settings.healthImportPrefs);
  await saveAppSetting("dismissed_insights", settings.dismissedInsights);
  await saveAppSetting("tier", settings.tier ?? "free");
};

export const saveFlareEnd = async (
  cycleId: string | null,
  loggedDate: string,
  endDate: string,
  reflection: string,
  durationDays: number
): Promise<void> => {
  // Update the symptom entry that started the flare (same logged_date)
  await execSql(
    `UPDATE symptom_entries
     SET flare_end = ?, flare_reflection_encrypted = ?
     WHERE cycle_id IS ? AND date(logged_date) = date(?)
     ORDER BY logged_date DESC LIMIT 1;`,
    [endDate, reflection || null, cycleId, loggedDate]
  );
  // Also insert a closing entry if none exists for today
  const today = new Date().toISOString().split("T")[0];
  const existing = await execSql(
    `SELECT id FROM symptom_entries WHERE date(logged_date) = ? LIMIT 1;`,
    [today]
  );
  if (existing.rows.length === 0) {
    await createSymptomEntry({
      cycle_id: cycleId,
      logged_date: endDate,
      flare_end: endDate,
      flare_reflection_encrypted: reflection || undefined,
    });
  }
};

export const deleteCycle = async (cycleId: string): Promise<void> => {
  await execSql(`DELETE FROM symptom_entries WHERE cycle_id = ?;`, [cycleId]);
  await execSql(`DELETE FROM cycles WHERE id = ?;`, [cycleId]);
};

// Phase utilities for Section 2 & 4 (calendar phases, insights overlays)

// Phase utilities for Section 2 & 4 (calendar phases, insights overlays)

export interface CyclePhase {
  name: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
  dayRange: [number, number];
  color: string;
}

export const getCyclePhases = (cycleLength: number = 28): CyclePhase[] => {
  return [
    { name: 'menstrual', dayRange: [1, 5], color: '#FF6B9D' },
    { name: 'follicular', dayRange: [6, 12], color: '#4ECDC4' },
    { name: 'ovulatory', dayRange: [13, 15], color: '#45B7D1' },
    { name: 'luteal', dayRange: [16, cycleLength], color: '#F7DC6F' }
  ];
};

export const getDayOfCycle = (loggedDate: string, cycleStart: string): number => {
  return differenceInDays(new Date(loggedDate), new Date(cycleStart)) + 1;
};

export const getPhaseForDay = (day: number, cycleLength = 28): CyclePhase['name'] => {
  const phases = getCyclePhases(cycleLength);
  for (const phase of phases) {
    if (day >= phase.dayRange[0] && day <= phase.dayRange[1]) return phase.name;
  }
  return 'luteal';
};

export interface PhaseAverage {
  phase: string;
  mood_avg: number | null;
  energy_avg: number | null;
  brain_fog_avg: number | null;
  count: number;
}

export const getPhaseAverages = async (cycleId: string): Promise<PhaseAverage[]> => {
  const result = await execSql(`
    SELECT 
      CASE 
        WHEN doc >= 1 AND doc <= 5 THEN 'menstrual'
        WHEN doc >= 6 AND doc <= 12 THEN 'follicular'
        WHEN doc >= 13 AND doc <= 15 THEN 'ovulatory'
        ELSE 'luteal'
      END as phase,
      ROUND(AVG(COALESCE(mood_score, 0)), 1) as mood_avg,
      ROUND(AVG(COALESCE(energy_score, 0)), 1) as energy_avg,
      ROUND(AVG(COALESCE(brain_fog_score, 0)), 1) as brain_fog_avg,
      COUNT(*) as count
    FROM (
      SELECT 
        symptom_entries.*,
        (julianday(symptom_entries.logged_date) - julianday(cycles.start_date)) + 1 as doc
      FROM symptom_entries 
      JOIN cycles ON symptom_entries.cycle_id = cycles.id 
      WHERE cycles.id = ?
    )
    WHERE mood_score IS NOT NULL OR energy_score IS NOT NULL OR brain_fog_score IS NOT NULL
    GROUP BY phase
    HAVING count >= 1
    ORDER BY 
      CASE phase 
        WHEN 'menstrual' THEN 1 WHEN 'follicular' THEN 2 
        WHEN 'ovulatory' THEN 3 ELSE 4 
      END
  `, [cycleId]);

  const avgs: PhaseAverage[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    avgs.push(result.rows.item(i) as PhaseAverage);
  }
  return avgs;
};

export const upsertSymptomEntry = async (entry: any) => {
  const existing = await execSql(
    `SELECT id FROM symptom_entries WHERE id = ?;`,
    [entry.id],
  );
  if (existing.rows.length > 0) {
    await execSql(
      `UPDATE symptom_entries SET
      cycle_id = ?,
      logged_date = ?,
      pain_score = ?,
      pain_locations = ?,
      pain_type = ?,
      mood_score = ?,
      mood_tags = ?,
      brain_fog_score = ?,
      energy_score = ?,
      bloating = ?,
      nausea = ?,
      headache = ?,
      fatigue_score = ?,
      stress_score = ?,
      extended_symptoms = ?,
      flow_intensity = ?,
      clots_present = ?,
      clots_size = ?,
      spotting = ?,
      sleep_hours = ?,
      sleep_quality = ?,
      exercise_type = ?,
      exercise_duration = ?,
      steps_count = ?,
      activity_minutes = ?,
      health_sleep_source = ?,
      health_activity_source = ?,
      updated_at = ?,
      synced = 0
      WHERE id = ?;`,
      [
        entry.cycle_id ?? null,
        entry.logged_date,
        entry.pain_score ?? null,
        entry.pain_locations ? JSON.stringify(entry.pain_locations) : null,
        entry.pain_type ? JSON.stringify(entry.pain_type) : null,
        entry.mood_score ?? null,
        entry.mood_tags ? JSON.stringify(entry.mood_tags) : null,
        entry.brain_fog_score ?? null,
        entry.energy_score ?? null,
        entry.bloating ?? null,
        entry.nausea ? 1 : 0,
        entry.headache ? 1 : 0,
        entry.fatigue_score ?? null,
        entry.stress_score ?? null,
        entry.extended_symptoms ? JSON.stringify(entry.extended_symptoms) : null,
        entry.flow_intensity ?? null,
        entry.clots_present ? 1 : 0,
        entry.clots_size ?? null,
        entry.spotting ? 1 : 0,
        entry.sleep_hours ?? null,
        entry.sleep_quality ?? null,
        entry.exercise_type ?? null,
        entry.exercise_duration ?? null,
        entry.steps_count ?? null,
        entry.activity_minutes ?? null,
        entry.health_sleep_source ?? null,
        entry.health_activity_source ?? null,
        new Date().toISOString(),
        entry.id,
      ],
    );
    return entry.id;
  }
  return createSymptomEntry(entry);
};

import { computeSpearman } from "../utils/statistics";

export interface CycleInsight {
  title: string;
  description: string;
  correlation?: number;
  n?: number;
  /** True for mood/stress insights — triggers mental health disclaimer on card */
  isMentalHealth?: boolean;
}

export const generateInsights = async (mode: string = "standard"): Promise<CycleInsight[]> => {
  const result = await execSql(
    `SELECT * FROM symptom_entries ORDER BY logged_date DESC LIMIT 90;`
  );
  const entries: any[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    entries.push(result.rows.item(i));
  }

  // Minimum required days to run correlation
  if (entries.length < 20) {
    return [
      {
        title: "Building your pattern \u2014 keep logging",
        description: "We run a Spearman correlation pipeline across 90 days of your logged data. You need at least 20 logged days to unlock insights."
      }
    ];
  }

  const insights: CycleInsight[] = [];
  
  // Helper to extract series
  const getSeries = (key: string, parser?: (val: any) => number) => {
    return entries.map(e => {
      let v = e[key];
      if (typeof v === "string" && v.startsWith("{")) {
        try { v = JSON.parse(v); } catch(e) {}
      }
      if (parser) return parser(v);
      return typeof v === "number" ? v : 0;
    }).reverse();
  };

  const cyclesResult = await execSql(`SELECT * FROM cycles ORDER BY start_date DESC;`);
  const cyclesDict: Record<string, any> = {};
  for (let i = 0; i < cyclesResult.rows.length; i++) {
      const item = cyclesResult.rows.item(i);
      cyclesDict[item.id] = item;
  }

  const docSeries = entries.map(e => {
      if (!e.cycle_id || !cyclesDict[e.cycle_id]) return 0;
      const diff = (new Date(e.logged_date).getTime() - new Date(cyclesDict[e.cycle_id].start_date).getTime()) / 86400000;
      return Math.floor(diff) + 1;
  }).reverse();

  const cycleLengthSeries = entries.map(e => {
      if (!e.cycle_id || !cyclesDict[e.cycle_id]) return 0;
      return cyclesDict[e.cycle_id].cycle_length || 0;
  }).reverse();

  const sleepScore = getSeries("sleep_hours", (v) => Number(v) || 0);
  const painScore = getSeries("pain_score", (v) => Number(v) || 0);
  const moodScore = getSeries("mood_score", (v) => Number(v) || 0);
  const stressScore = getSeries("stress_score", (v) => Number(v) || 0);
  const exerciseScore = getSeries("exercise_duration", (v) => Number(v) || 0);
  const energyScore = getSeries("energy_score", (v) => Number(v) || 0);
  const brainFogScore = getSeries("brain_fog_score", (v) => Number(v) || 0);
  const bloatingScore = getSeries("bloating", (v) => {
     if (v === 'Severe') return 3;
     if (v === 'Moderate') return 2;
     if (v === 'Mild') return 1;
     return 0;
  });

  const checkAndAdd = (x: number[], y: number[], title: string, descPos: string, descNeg: string, isMentalHealth = false) => {
     const cor = computeSpearman(x, y);
     if (cor.n >= 20 && Math.abs(cor.correlation) > 0.3 && cor.pValue < 0.05) {
         insights.push({
            title,
            description: cor.correlation > 0 ? descPos : descNeg,
            correlation: Math.round(cor.correlation * 100) / 100,
            n: cor.n,
            isMentalHealth,
         });
     }
  };

  // Standard Correlations (Section 8)
  checkAndAdd(sleepScore, painScore, "Sleep & Pain", "On nights with less sleep, pain scores tend to be higher.", "More sleep tends to link with lower pain scores for you.");
  checkAndAdd(stressScore, moodScore, "Stress & Mood", "Higher stress tends to track with lower mood scores.", "Lower stress tends to link with better mood scores.", true);
  checkAndAdd(sleepScore, moodScore, "Sleep & Mood", "Less sleep tends to link with lower mood scores.", "More sleep hours tend to align with better mood scores.", true);
  checkAndAdd(exerciseScore, moodScore, "Movement & Mood", "Days with more movement tend to align with better moods.", "Days with less movement tend to link with lower mood scores.", true);
  checkAndAdd(exerciseScore, energyScore, "Movement & Energy", "More exercise tends to link with higher energy levels.", "Less movement tends to align with lower energy scores.");
  checkAndAdd(stressScore, painScore, "Stress & Pain", "Higher stress days tend to link with higher pain scores.", "Lower stress tends to align with lower pain scores.");
  checkAndAdd(stressScore, bloatingScore, "Stress & Bloating", "Higher stress tends to link with stronger bloating reports.", "Lower stress periods tend to align with less bloating.");
  checkAndAdd(stressScore, cycleLengthSeries, "Stress & Cycle Length", "Higher stress during your cycle tends to link with longer cycles.", "Lower stress tends to align with shorter cycle lengths.");
  checkAndAdd(docSeries, brainFogScore, "Cycle Phase & Brain Fog", "Brain fog tends to be higher later in your cycle.", "Brain fog tends to be higher earlier in your cycle.");
  checkAndAdd(docSeries, energyScore, "Cycle Phase & Energy", "Energy tends to be higher later in your cycle.", "Energy tends to peak earlier in your cycle.");

  if (mode === "pcos") {
    const acneScore = getSeries("extended_symptoms", (v: any) => {
        if (!v) return 0;
        const acne = v.acne || v.pcos?.acne?.severity;
        return acne === 'Severe' || acne === 3 ? 3 : acne === 'Moderate' || acne === 2 ? 2 : acne === 'Mild' || acne === 1 ? 1 : 0;
    });

    const anxietyScore = getSeries("extended_symptoms", (v: any) => (v?.anxiety_spike || v?.pcos?.anxiety_spike) ? 1 : 0);
    const cravingScore = getSeries("extended_symptoms", (v: any) => typeof v?.cravings === 'number' ? v.cravings : (v?.cravings?.int || v?.pcos?.cravings?.int || 0));

    
    const saCor = computeSpearman(sleepScore, acneScore);
    if (saCor.n >= 20 && Math.abs(saCor.correlation) > 0.3 && saCor.pValue < 0.05) {
      insights.push({
        title: "Sleep & Skin",
        description: saCor.correlation < 0
          ? "Less sleep tends to link with higher acne severity."
          : "Changes in sleep tend to align with changes in skin condition.",
        correlation: Math.round(saCor.correlation * 100) / 100,
        n: saCor.n
      });
    }

    const stressAcne = computeSpearman(stressScore, acneScore);
    if (stressAcne.n >= 20 && Math.abs(stressAcne.correlation) > 0.3 && stressAcne.pValue < 0.05) {
      insights.push({
        title: "Stress & Skin",
        description: "Higher stress tends to link with more skin breakouts.",
        correlation: Math.round(stressAcne.correlation * 100) / 100,
        n: stressAcne.n
      });
    }

    const cravingDocCor = computeSpearman(docSeries, cravingScore);
    if (cravingDocCor.n >= 20 && Math.abs(cravingDocCor.correlation) > 0.3 && cravingDocCor.pValue < 0.05) {
      insights.push({
        title: "Cycle Phase & Cravings",
        description: cravingDocCor.correlation > 0
          ? "Cravings tend to be higher later in your cycle."
          : "Cravings tend to be higher earlier in your cycle.",
        correlation: Math.round(cravingDocCor.correlation * 100) / 100,
        n: cravingDocCor.n
      });
    }

    const sleepAnxCor = computeSpearman(sleepScore, anxietyScore);
    if (sleepAnxCor.n >= 20 && Math.abs(sleepAnxCor.correlation) > 0.3 && sleepAnxCor.pValue < 0.05) {
      insights.push({
        title: "Sleep & Anxiety",
        description: "Less sleep tends to link with more anxiety spikes.",
        correlation: Math.round(sleepAnxCor.correlation * 100) / 100,
        n: sleepAnxCor.n
      });
    }
  }

  if (mode === "endo") {
     const flareSeverity = getSeries("pain_score", (v) => Number(v) || 0);
     const isFlareDay = getSeries("flare_start", (v) => v ? 1 : 0);

     const flareCount = entries.filter(e => e.flare_start).length;

     if (flareCount >= 5) {
        // Find most common cycle day
        const onsetDays = entries.filter(e => e.flare_start && e.cycle_id && cyclesDict[e.cycle_id]).map(e => {
            const diff = (new Date(e.logged_date).getTime() - new Date(cyclesDict[e.cycle_id].start_date).getTime()) / 86400000;
            return Math.floor(diff) + 1;
        });
        if (onsetDays.length > 0) {
            const avgOnset = Math.round(onsetDays.reduce((a,b)=>a+b,0) / onsetDays.length);
            insights.push({
               title: "Flare Onset Pattern",
               description: `Your flares most frequently begin around Cycle Day ${avgOnset}. Keep triggers minimal during this window.`
            });
        }
     }

     const sfCor = computeSpearman(sleepScore, flareSeverity);
     if (sfCor.n >= 20 && Math.abs(sfCor.correlation) > 0.3 && sfCor.pValue < 0.05) {
         insights.push({
            title: "Sleep & Flare Severity",
            description: sfCor.correlation < 0
               ? "Less sleep tends to link with more severe flare pain."
               : "Flare pain tends to align with disrupted sleep patterns.",
            correlation: Math.round(sfCor.correlation * 100) / 100,
            n: sfCor.n,
            isMentalHealth: false,
         });
     }

     const stressFlareCor = computeSpearman(stressScore, flareSeverity);
     if (stressFlareCor.n >= 20 && Math.abs(stressFlareCor.correlation) > 0.3 && stressFlareCor.pValue < 0.05) {
         insights.push({
            title: "Stress & Flare Severity",
            description: stressFlareCor.correlation > 0
               ? "Higher stress tends to link with more severe flare pain."
               : "Lower stress tends to align with less severe flare pain.",
            correlation: Math.round(stressFlareCor.correlation * 100) / 100,
            n: stressFlareCor.n,
         });
     }
  }

  return insights;
};

// Persist computed insights and retire stale ones (older than 90 days or weakened below threshold)
export const persistAndRetireInsights = async (freshInsights: CycleInsight[]): Promise<void> => {
  const now = new Date().toISOString();
  // Upsert fresh insights
  for (const insight of freshInsights) {
    const existing = await execSql(
      `SELECT id FROM user_correlations WHERE title = ?;`, [insight.title]
    );
    if (existing.rows.length > 0) {
      await execSql(
        `UPDATE user_correlations SET correlation = ?, n = ?, generated_at = ? WHERE title = ?;`,
        [insight.correlation ?? null, insight.n ?? null, now, insight.title]
      );
    } else {
      await execSql(
        `INSERT INTO user_correlations (id, title, correlation, n, generated_at) VALUES (?,?,?,?,?);`,
        [createLocalId(), insight.title, insight.correlation ?? null, insight.n ?? null, now]
      );
    }
  }
  // Retire insights not present in fresh batch that are older than 90 days
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  await execSql(
    `DELETE FROM user_correlations WHERE generated_at < ?;`, [cutoff]
  );
};
