/**
 * Row shapes as SQLite returns them (see schema.ts). JSON columns are TEXT and
 * booleans are INTEGER 0/1 — parse at the edge, not here.
 */

export interface CycleRow {
  id: string;
  start_date: string;
  end_date: string | null;
  /** Gap to the next cycle's start; null for the in-progress (latest) cycle. */
  cycle_length: number | null;
  period_length: number | null;
  is_confirmed: number | null;
  notes_encrypted: string | null;
}

export interface SymptomEntryRow {
  id: string;
  cycle_id: string | null;
  logged_date: string;
  pain_score: number | null;
  /** JSON string[] */
  pain_locations: string | null;
  /** JSON string[] */
  pain_type: string | null;
  mood_score: number | null;
  /** JSON string[] */
  mood_tags: string | null;
  brain_fog_score: number | null;
  energy_score: number | null;
  stress_score: number | null;
  bloating: string | null;
  nausea: number | null;
  headache: number | null;
  fatigue_score: number | null;
  /** JSON ExtendedSymptoms */
  extended_symptoms: string | null;
  flare_start: string | null;
  flare_end: string | null;
  flare_reflection_encrypted: string | null;
  flow_intensity: string | null;
  clots_present: number | null;
  clots_size: string | null;
  spotting: number | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  exercise_type: string | null;
  exercise_duration: number | null;
  steps_count: number | null;
  activity_minutes: number | null;
  health_sleep_source: string | null;
  health_activity_source: string | null;
  diet_notes_encrypted: string | null;
  medication_log_encrypted: string | null;
  synced: number | null;
  updated_at: string | null;
}

export interface RedFlagPromptLogRow {
  id: string;
  trigger_type: string;
  triggered_at: string;
  logged_date: string;
  message: string;
  severity: number | null;
  cycle_id: string | null;
  entry_context_json: string | null;
}

// ── symptom_entries.extended_symptoms (JSON) ────────────────────────────────

export interface PcosExtended {
  acne: { severity: number; locations: string[] };
  hair_thinning: string;
  hirsutism: boolean;
  weight: { dir: string | null; note: string };
  cravings: { int: number; types: string[] };
  pelvic_pressure: number | null;
  sleep_disruption: string[];
  anxiety_spike: boolean;
}

export interface EndoExtended {
  clots: string | null;
  bowel: string[];
  bladder: string[];
  shoulder: string | null;
  dyspareunia: boolean;
  nausea: number;
}

export interface PeriExtended {
  hotFlashes: boolean;
  hotFlashFrequency: number;
  hotFlashSeverity: number;
  hotFlashTimeOfDay: string | null;
  nightSweats: boolean;
  vaginalChanges: boolean;
  memoryIssues: boolean;
}

export interface FlareExtended {
  start: string;
  mode: { pain: number | null; nausea: boolean; movement: string | null };
}

/** Condition-specific fields written by the Daily Log. Every reader goes through readExtendedSymptoms. */
export interface ExtendedSymptoms {
  pcos?: PcosExtended;
  endo?: EndoExtended;
  peri?: PeriExtended;
  flare?: FlareExtended;
}

/** Parses an entry's extended_symptoms; malformed or missing JSON reads as {}. */
export const readExtendedSymptoms = (entry: Pick<SymptomEntryRow, "extended_symptoms">): ExtendedSymptoms =>
  parseJsonColumn<ExtendedSymptoms>(entry.extended_symptoms) ?? {};

/** Parses a JSON column, returning null for empty or malformed values. */
export const parseJsonColumn = <T>(value: string | null | undefined): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};
