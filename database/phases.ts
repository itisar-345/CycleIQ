/**
 * Cycle phase boundaries and per-phase symptom averages.
 */
import { LUTEAL_PHASE_DAYS } from "../utils/predictions";

import { execSql } from "./connection";

export { getCyclePhases, getDayOfCycle, getOvulationDay, getPhaseForDay } from "./phaseMath";
export type { CyclePhase } from "./phaseMath";

export interface PhaseAverage {
  phase: string;
  mood_avg: number | null;
  energy_avg: number | null;
  brain_fog_avg: number | null;
  count: number;
}

export const getPhaseAverages = async (cycleId: string, fallbackCycleLength = 28): Promise<PhaseAverage[]> => {
  const result = await execSql<PhaseAverage>(`
    SELECT 
      CASE 
        WHEN doc >= 1 AND doc <= 5 THEN 'menstrual'
        WHEN doc < ovulation_day - 1 THEN 'follicular'
        WHEN doc <= ovulation_day + 1 THEN 'ovulatory'
        ELSE 'luteal'
      END as phase,
      ROUND(AVG(mood_score), 1) as mood_avg,
      ROUND(AVG(energy_score), 1) as energy_avg,
      ROUND(AVG(brain_fog_score), 1) as brain_fog_avg,
      COUNT(*) as count
    FROM (
      SELECT 
        symptom_entries.*,
        (julianday(symptom_entries.logged_date) - julianday(cycles.start_date)) + 1 as doc,
        MAX(8, COALESCE(cycles.cycle_length, ?) - ?) as ovulation_day
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
  `, [fallbackCycleLength, LUTEAL_PHASE_DAYS, cycleId]);

  const avgs: PhaseAverage[] = [];
  for (let i = 0; i < result.rows.length; i++) avgs.push(result.rows.item(i));
  return avgs;
};
