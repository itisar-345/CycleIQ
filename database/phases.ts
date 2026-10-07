/**
 * Cycle phase boundaries and per-phase symptom averages.
 */
import { queryAll, queryFirst } from "./connection";
import { getDayOfCycle, getPhaseForDay } from "./phaseMath";

export { getCyclePhases, getDayOfCycle, getOvulationDay, getPhaseForDay } from "./phaseMath";
export type { CyclePhase } from "./phaseMath";

export interface PhaseAverage {
  phase: string;
  mood_avg: number | null;
  energy_avg: number | null;
  brain_fog_avg: number | null;
  count: number;
}

const PHASE_ORDER = ["menstrual", "follicular", "ovulatory", "luteal"] as const;

/** Mood / energy / brain-fog averages per phase for one cycle, using the same phase maths as the calendar. */
export const getPhaseAverages = async (cycleId: string, fallbackCycleLength = 28): Promise<PhaseAverage[]> => {
  const cycle = await queryFirst<{ start_date: string; cycle_length: number | null }>(
    `SELECT start_date, cycle_length FROM cycles WHERE id = ?;`,
    [cycleId],
  );
  if (!cycle) return [];
  const entries = await queryAll<{ logged_date: string; mood_score: number | null; energy_score: number | null; brain_fog_score: number | null }>(
    `SELECT logged_date, mood_score, energy_score, brain_fog_score FROM symptom_entries
     WHERE cycle_id = ? AND (mood_score IS NOT NULL OR energy_score IS NOT NULL OR brain_fog_score IS NOT NULL);`,
    [cycleId],
  );

  const length = cycle.cycle_length ?? fallbackCycleLength;
  const buckets = new Map<string, { mood: number[]; energy: number[]; fog: number[]; count: number }>();
  for (const e of entries) {
    const day = getDayOfCycle(e.logged_date, cycle.start_date);
    if (day < 1) continue;
    const phase = getPhaseForDay(day, length);
    const b = buckets.get(phase) ?? { mood: [], energy: [], fog: [], count: 0 };
    if (e.mood_score !== null) b.mood.push(e.mood_score);
    if (e.energy_score !== null) b.energy.push(e.energy_score);
    if (e.brain_fog_score !== null) b.fog.push(e.brain_fog_score);
    b.count++;
    buckets.set(phase, b);
  }

  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, v) => a + v, 0) / xs.length) * 10) / 10 : null);
  return PHASE_ORDER.filter((p) => buckets.has(p)).map((phase) => {
    const b = buckets.get(phase)!;
    return { phase, mood_avg: avg(b.mood), energy_avg: avg(b.energy), brain_fog_avg: avg(b.fog), count: b.count };
  });
};
