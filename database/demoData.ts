/**
 * Sample data for the web preview and README screenshots (EXPO_PUBLIC_DEMO_DATA=1, web only).
 * Written through the real database API so cycle lengths, entry ownership, predictions and
 * insights are computed exactly as they would be on a phone. Deterministic, so screenshots
 * are reproducible. Never used on iOS or Android.
 */
import { closeCycle, createCycle } from "./cycles";
import { createSymptomEntry } from "./symptoms";

/** Small seeded PRNG (mulberry32) so every run produces the same data. */
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

/** Local noon `daysAgo` days before today, as an ISO timestamp. */
const atNoon = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
};

const CYCLE_LENGTHS = [29, 27, 30, 28, 31, 28];
const PERIOD_LENGTHS = [5, 4, 6, 5, 5, 4];
const CURRENT_CYCLE_DAY = 9;
const LOGGED_DAYS = 100;

export const seedDemoData = async (): Promise<void> => {
  const random = rng(42);

  // Completed cycles, oldest first, then the current one (started CURRENT_CYCLE_DAY - 1 days ago).
  const totalPast = CYCLE_LENGTHS.reduce((a, b) => a + b, 0);
  let daysAgo = totalPast + CURRENT_CYCLE_DAY - 1;
  const periodDays = new Set<number>();
  for (let i = 0; i <= CYCLE_LENGTHS.length; i++) {
    const periodLength = PERIOD_LENGTHS[i] ?? 5;
    const id = await createCycle(atNoon(daysAgo));
    await closeCycle(id, atNoon(daysAgo - (periodLength - 1)));
    for (let d = 0; d < periodLength; d++) periodDays.add(daysAgo - d);
    daysAgo -= CYCLE_LENGTHS[i] ?? 0;
  }

  const exercises = ["Walking", "Yoga", "Running", "Strength", "None"];
  for (let ago = LOGGED_DAYS; ago >= 1; ago--) {
    if (random() < 0.08) continue; // a few missed days, like real life
    const onPeriod = periodDays.has(ago);
    const sleep = 5 + Math.round(random() * 8) / 2; // 5–9 h
    const stress = clamp(random() * 9, 0, 10);
    // Built-in patterns for Insights to find: short sleep → more pain; stress → lower mood.
    const pain = clamp((onPeriod ? 5 : 1) + (7.5 - sleep) * 1.1 + random() * 1.5, 0, 10);
    const mood = clamp(5 - stress / 2.6 + random() * 0.9, 1, 5);
    const energy = clamp(sleep - 1 - pain / 3 + random() * 2, 0, 10);
    const exercise = exercises[Math.floor(random() * exercises.length)];

    await createSymptomEntry({
      logged_date: atNoon(ago),
      pain_score: pain,
      pain_locations: pain >= 4 ? ["Pelvic", "Lower back"] : [],
      pain_type: pain >= 4 ? ["Cramping"] : [],
      mood_score: mood,
      mood_tags: mood <= 2 ? ["Low"] : mood >= 4 ? ["Calm"] : ["Stable"],
      energy_score: energy,
      stress_score: stress,
      brain_fog_score: clamp(10 - energy - random() * 2, 0, 10),
      fatigue_score: clamp(9 - sleep + random() * 2, 0, 10),
      bloating: onPeriod ? "Moderate" : random() < 0.3 ? "Mild" : "None",
      headache: random() < 0.15,
      nausea: false,
      flow_intensity: onPeriod ? (periodDays.has(ago + 1) ? "Medium" : "Heavy") : "None",
      sleep_hours: sleep,
      sleep_quality: clamp(sleep - 4, 1, 5),
      exercise_type: exercise,
      exercise_duration: exercise === "None" ? 0 : 20 + Math.round(random() * 4) * 10,
    });
  }
};
