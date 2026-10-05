export interface HealthReadPermissions {
  sleep: boolean;
  activity: boolean;
}

export interface RawDailyMetrics {
  sleepHours: number | null;
  steps: number | null;
  activityMinutes: number | null;
}

/** Platform implementation (bridge.ios.ts / bridge.android.ts / bridge.ts fallback). */
export interface HealthBridge {
  /** True when the native module is linked in this build (false in Expo Go / web). */
  isLinked: () => boolean;
  requestPermissions: (permissions: HealthReadPermissions) => Promise<boolean>;
  readDailyMetrics: (isoDate: string, permissions: HealthReadPermissions) => Promise<RawDailyMetrics>;
}

/**
 * Time windows for a logged day, in local time:
 * - sleep: 18:00 the evening before → 12:00 on the day ("last night")
 * - activity: 00:00 on the day → end of day (or now, if the day is today)
 */
export const getDailyWindows = (isoDate: string, now: Date = new Date()) => {
  const day = new Date(isoDate);
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
  return {
    sleep: {
      start: new Date(dayStart.getTime() - 6 * 3600 * 1000),
      end: new Date(dayStart.getTime() + 12 * 3600 * 1000),
    },
    activity: {
      start: dayStart,
      end: now < dayEnd ? now : dayEnd,
    },
  };
};

/**
 * Total length of the union of intervals, in ms. Sleep is often recorded by both a
 * watch and the phone; summing raw samples would double-count overlapping time.
 */
export const unionDurationMs = (intervals: { start: number; end: number }[]): number => {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  let total = 0;
  let curStart = -Infinity;
  let curEnd = -Infinity;
  for (const { start, end } of sorted) {
    if (start > curEnd) {
      if (curEnd > curStart) total += curEnd - curStart;
      curStart = start;
      curEnd = end;
    } else if (end > curEnd) {
      curEnd = end;
    }
  }
  if (curEnd > curStart) total += curEnd - curStart;
  return total;
};

export const roundTo = (value: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};
