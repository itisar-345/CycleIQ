import { differenceInCalendarDays } from "date-fns";

// Calendar-day differences, so a period logged at 23:00 vs 08:00 doesn't lose a day.
export const computeCycleLength = (currentStartDate: string | Date, previousStartDate: string | Date): number => {
  return differenceInCalendarDays(new Date(currentStartDate), new Date(previousStartDate));
};

export const computePeriodLength = (periodStartDate: string | Date, periodEndDate: string | Date): number => {
  return differenceInCalendarDays(new Date(periodEndDate), new Date(periodStartDate)) + 1;
};
