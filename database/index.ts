import { differenceInDays } from "date-fns";
import { open, DB } from "@op-engineering/op-sqlite";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { getOrCreateDbKey } from "../utils/secureKey";

export const dbName = "cycleiq.sqlite";

let db: DB | null = null;

const ensureDb = async () => {
  if (db) return db;
  const encryptionKey = await getOrCreateDbKey();
  db = open({ name: dbName, encryptionKey });
  return db;
};

const execSql = async (sql: string, params: any[] = []): Promise<any> => {
  const database = await ensureDb();
  try {
    const res = await database.executeAsync(sql, params);
    const rowsArr = res.rows?._array || res.rows || [];
    // Shim for old expo-sqlite WebSQL ResultSet
    return {
      rows: {
        length: rowsArr.length,
        item: (i: number) => rowsArr[i]
      },
      insertId: res.insertId,
      rowsAffected: res.rowsAffected
    };
  } catch (error) {
    console.error("SQL Error", error, sql);
    throw error;
  }
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
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS user_correlations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            correlation REAL,
            n INTEGER,
            generated_at TEXT NOT NULL
          );`
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

import { computeCyclePrediction, runPredictionEngine, PredictionResult } from "../utils/predictions";

export const getCyclePredictions = async (
  currentMode: string = "standard",
  postPillMode = false,
  postPillStartDate: string | null = null
): Promise<PredictionResult> => {
  const result = await execSql(`SELECT * FROM cycles ORDER BY start_date DESC;`);
  const cycles: any[] = [];
  for (let i = 0; i < result.rows.length; i++) cycles.push(result.rows.item(i));
  return runPredictionEngine({ cycles, currentMode, postPillMode, postPillStartDate });
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
        [uuidv4(), insight.title, insight.correlation ?? null, insight.n ?? null, now]
      );
    }
  }
  // Retire insights not present in fresh batch that are older than 90 days
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  await execSql(
    `DELETE FROM user_correlations WHERE generated_at < ?;`, [cutoff]
  );
};
