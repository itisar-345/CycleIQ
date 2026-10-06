/**
 * Pure cycle-phase maths (no database access) — safe to use anywhere, including tests.
 */
import { differenceInCalendarDays } from "date-fns";
import { LUTEAL_PHASE_DAYS } from "../utils/predictions";

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
