/**
 * Cycle phase boundaries and per-phase symptom averages.
 */
import { differenceInCalendarDays } from "date-fns";
import { LUTEAL_PHASE_DAYS } from "../utils/predictions";

import { execSql } from "./connection";

export interface CyclePhase {
  name: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
  dayRange: [number, number];
  color: string;
}

/** Estimated ovulation cycle-day, anchored to a fixed luteal phase (same rule as the prediction engine). */
export const getOvulationDay = (cycleLength: number = 28): number =>
  Math.max(8, Math.round(cycleLength) - LUTEAL_PHASE_DAYS);

export const getCyclePhases = (cycleLength: number = 28): CyclePhase[] => {
  const ovulationDay = getOvulationDay(cycleLength);
  return [
    { name: 'menstrual', dayRange: [1, 5], color: '#FF6B9D' },
    { name: 'follicular', dayRange: [6, ovulationDay - 2], color: '#4ECDC4' },
    { name: 'ovulatory', dayRange: [ovulationDay - 1, ovulationDay + 1], color: '#45B7D1' },
    { name: 'luteal', dayRange: [ovulationDay + 2, Math.max(cycleLength, ovulationDay + 2)], color: '#F7DC6F' }
  ];
};

export const getDayOfCycle = (loggedDate: string, cycleStart: string): number => {
  return differenceInCalendarDays(new Date(loggedDate), new Date(cycleStart)) + 1;
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
