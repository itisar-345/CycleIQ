import { differenceInDays } from "date-fns";
import * as SQLite from "expo-sqlite";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

export const dbName = "cycleiq.db";

let db: SQLite.WebSQLDatabase | null = null;

const ensureDb = async () => {
  if (db) return db;
  db = SQLite.openDatabase(dbName);
  return db;
};

const execSql = async (sql: string, params: any[] = []) => {
  const database = await ensureDb();
  return new Promise<SQLite.SQLResultSet>((resolve, reject) => {
    database.transaction(
      (tx) => {
        tx.executeSql(
          sql,
          params,
          (_, result) => resolve(result),
          (_, error) => {
            reject(error);
            return false;
          },
        );
      },
      (txError) => reject(txError),
      () => {},
    );
  });
};

export const initDb = async () => {
  const database = await ensureDb();
  await new Promise<void>((resolve, reject) => {
    database.transaction(
      (tx) => {
        tx.executeSql("PRAGMA journal_mode = WAL;");
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS cycles (
            id TEXT PRIMARY KEY,
            start_date TEXT NOT NULL,
            end_date TEXT,
            cycle_length INTEGER,
            period_length INTEGER,
            is_confirmed INTEGER DEFAULT 0,
            notes_encrypted TEXT
          );`,
        );
        tx.executeSql(
`CREATE TABLE IF NOT EXISTS symptom_entries (
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
            extended_symptoms TEXT,  // JSON for Sec5/6 PCOS/Endo extended + flare
            flare_start TEXT,
            flare_end TEXT,
            flare_reflection_encrypted TEXT,
            flow_intensity TEXT,
            clots_size TEXT,  // JSON or string for Sec6 clots+size
            spotting INTEGER,
            sleep_hours REAL,
            sleep_quality INTEGER,
            exercise_type TEXT,
            exercise_duration INTEGER,
            diet_notes_encrypted TEXT,
            medication_log_encrypted TEXT,
            synced INTEGER DEFAULT 0,
            updated_at TEXT,
            FOREIGN KEY(cycle_id) REFERENCES cycles(id)
          );
          CREATE INDEX IF NOT EXISTS idx_symptom_date ON symptom_entries(logged_date DESC);
          CREATE INDEX IF NOT EXISTS idx_flare_start ON symptom_entries(flare_start);`,
        );
      },
      reject,
      resolve,
    );
  });
  return database;
};

export const closeDb = () => {
  if (!db) return;
  try {
    db.close();
  } catch {
    // ignore
  }
  db = null;
};

export const getLatestCycle = async () => {
  const result = await execSql(
    `SELECT * FROM cycles ORDER BY start_date DESC LIMIT 1;`,
  );
  return result.rows.length > 0 ? (result.rows.item(0) as any) : null;
};

export const createCycle = async (startDate: string) => {
  const id = uuidv4();
  const prevCycle = await getLatestCycle();
  let period_length = null;

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
  }

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
  clots_size?: string | null;
  spotting?: boolean;
  sleep_hours?: number;
  sleep_quality?: number;
  exercise_type?: string;
  exercise_duration?: number;
  diet_notes_encrypted?: string;
  medication_log_encrypted?: string;
}

export const createSymptomEntry = async (entry: SymptomEntry) => {
  const id = uuidv4();
  await execSql(
    `INSERT INTO symptom_entries (
        id, cycle_id, logged_date, pain_score, pain_locations, pain_type, mood_score, mood_tags,
        brain_fog_score, energy_score, stress_score, bloating, nausea, headache, fatigue_score,
        extended_symptoms, flare_start, flare_end, flare_reflection_encrypted, flow_intensity, clots_size,
        spotting, sleep_hours, sleep_quality, exercise_type, exercise_duration,
        diet_notes_encrypted, medication_log_encrypted, synced, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`,
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
      entry.stress_score ?? null ?? 3,
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
      entry.spotting ? 1 : 0,
      entry.sleep_hours ?? null,
      entry.sleep_quality ?? null,
      entry.exercise_type ?? null,
      entry.exercise_duration ?? null,
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
    end_date: string;
    cycle_length: number;
    period_length: number;
    notes_encrypted: string;
  }>,
) => {
  const updates: string[] = [];
  const params: any[] = [];
  if (data.start_date) {
    updates.push("start_date = ?");
    params.push(data.start_date);
  }
  if (data.end_date) {
    updates.push("end_date = ?");
    params.push(data.end_date);
  }
  if (typeof data.cycle_length === "number") {
    updates.push("cycle_length = ?");
    params.push(data.cycle_length);
  }
  if (typeof data.period_length === "number") {
    updates.push("period_length = ?");
    params.push(data.period_length);
  }
  if (data.notes_encrypted) {
    updates.push("notes_encrypted = ?");
    params.push(data.notes_encrypted);
  }
  if (updates.length === 0) return;
  params.push(cycleId);
  await execSql(
    `UPDATE cycles SET ${updates.join(", ")} WHERE id = ?;`,
    params,
  );
};

export const deleteCycle = async (cycleId: string) => {
  await execSql(`DELETE FROM symptom_entries WHERE cycle_id = ?;`, [cycleId]);
  await execSql(`DELETE FROM cycles WHERE id = ?;`, [cycleId]);
};

// Phase utilities for Section 2 & 4 (calendar phases, insights overlays)

import { differenceInDays } from "date-fns"; // Ensure imported

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

export const upsertSymptomEntry = async (entry: {
  id: string;
  cycle_id?: string | null;

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
      flow_intensity = ?,
      clots = ?,
      spotting = ?,
      sleep_hours = ?,
      sleep_quality = ?,
      exercise_type = ?,
      exercise_duration = ?,
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
        entry.clots ? 1 : 0,
        entry.spotting ? 1 : 0,
        entry.sleep_hours ?? null,
        entry.sleep_quality ?? null,
        entry.exercise_type ?? null,
        entry.exercise_duration ?? null,
        new Date().toISOString(),
        entry.id,
      ],
    );
    return entry.id;
  }
  return createSymptomEntry(entry);
};
