/**
 * Daily symptom log entries.
 */
import { localDateKey } from "../utils/dates";
import { encryptField } from "../utils/fieldEncryption";

import { createLocalId, execSql, queryAll, queryFirst } from "./connection";
import { cycleIdForDate } from "./cycles";
import type { ExtendedSymptoms, SymptomEntryRow } from "./types";

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
  extended_symptoms?: ExtendedSymptoms;
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

/** Saves a log. `cycle_id` defaults to the cycle the log's local day falls in. */
export const createSymptomEntry = async (entry: SymptomEntry) => {
  const id = createLocalId();
  const cycleId = entry.cycle_id !== undefined ? entry.cycle_id : await cycleIdForDate(entry.logged_date);
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
      cycleId ?? null,
      entry.logged_date,
      entry.pain_score ?? null,
      entry.pain_locations ? JSON.stringify(entry.pain_locations) : null,
      entry.pain_type ? JSON.stringify(entry.pain_type) : null,
      entry.mood_score ?? null,
      entry.mood_tags ? JSON.stringify(entry.mood_tags) : null,
      entry.brain_fog_score ?? null,
      entry.energy_score ?? null,
      entry.stress_score ?? null,
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

export const getCycleEntries = (cycleId: string): Promise<SymptomEntryRow[]> =>
  queryAll<SymptomEntryRow>(
    `SELECT * FROM symptom_entries WHERE cycle_id = ? ORDER BY logged_date DESC;`,
    [cycleId],
  );

export const getAllEntries = (): Promise<SymptomEntryRow[]> =>
  queryAll<SymptomEntryRow>(`SELECT * FROM symptom_entries ORDER BY logged_date DESC;`);

export const saveFlareEnd = async (
  loggedDate: string,
  endDate: string,
  reflection: string,
  durationDays: number
): Promise<void> => {
  const encryptedReflection = reflection ? await encryptField(reflection) : null;
  // Update the entry that started the flare (its flare_start is the flare's start time).
  // UPDATE … ORDER BY/LIMIT needs a non-default SQLite build flag, so pick the row in a subquery.
  await execSql(
    `UPDATE symptom_entries
     SET flare_end = ?, flare_reflection_encrypted = ?
     WHERE id = (
       SELECT id FROM symptom_entries
       WHERE flare_start = ? OR date(logged_date) = date(?)
       ORDER BY (flare_start = ?) DESC, logged_date DESC LIMIT 1
     );`,
    [endDate, encryptedReflection, loggedDate, loggedDate, loggedDate]
  );
  // Also insert a closing entry if none exists for today
  const today = localDateKey(new Date());
  const todays = await queryAll<{ logged_date: string }>(
    `SELECT logged_date FROM symptom_entries WHERE logged_date >= ?;`,
    [new Date(Date.now() - 2 * 86400000).toISOString()]
  );
  if (!todays.some((e) => localDateKey(e.logged_date) === today)) {
    await createSymptomEntry({
      logged_date: endDate,
      flare_end: endDate,
      flare_reflection_encrypted: encryptedReflection ?? undefined,
    });
  }
};
