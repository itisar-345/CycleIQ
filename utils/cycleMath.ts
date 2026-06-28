import { differenceInDays } from "date-fns";

export const computeCycleLength = (currentStartDate: string | Date, previousStartDate: string | Date): number => {
  return differenceInDays(new Date(currentStartDate), new Date(previousStartDate));
};

export const computePeriodLength = (periodStartDate: string | Date, periodEndDate: string | Date): number => {
  return differenceInDays(new Date(periodEndDate), new Date(periodStartDate)) + 1;
};
