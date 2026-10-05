/**
 * Walk-forward backtest of the prediction engine against simple baselines on
 * synthetic users. Deterministic (seeded) so it can gate regressions in tests.
 *
 *   npx tsx tests/backtest.ts      → prints a report
 */
import { runPredictionEngine } from "../utils/predictions";

export interface ProfileMetrics {
  engineMae: number;
  baselineMae: Record<string, number>;
  /** Share of outcomes inside the predicted window. */
  coverage: number;
  avgWindowWidth: number;
  avgConfidence: number;
  /** Share of outcomes within ±2 days — what confidence is meant to estimate. */
  hitRate: number;
}

const DAY_MS = 86400000;

const makeRng = (seed: number) => {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const gauss = () => {
    const u = rnd() || 1e-9;
    const v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return gauss;
};

type Profile = { mode: string; gen: (i: number, gauss: () => number) => number };

export const PROFILES: Record<string, Profile> = {
  regular_sd2: { mode: "standard", gen: (_, g) => Math.round(28 + 2 * g()) },
  regular_32: { mode: "standard", gen: (_, g) => Math.round(32 + 2 * g()) },
  variable_sd4: { mode: "standard", gen: (_, g) => Math.round(30 + 4 * g()) },
  pcos_long: { mode: "pcos", gen: (_, g) => Math.round(Math.max(24, 42 + 10 * g())) },
  trend_27to33: { mode: "standard", gen: (i, g) => Math.round(27 + i * 0.4 + 1.5 * g()) },
  missed_log: { mode: "standard", gen: (i, g) => (i === 7 ? 56 : Math.round(28 + 2 * g())) },
};

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

export function evaluateProfile(profile: Profile, users = 150, cyclesPerUser = 16, seed = 42): ProfileMetrics {
  const gauss = makeRng(seed);
  const base = new Date("2024-01-01T12:00:00Z").getTime();
  const engineErr: number[] = [];
  const baselines: Record<string, number[]> = { last: [], median3: [], median6: [], mean6: [] };
  let covered = 0, hits = 0, widthSum = 0, confSum = 0, total = 0;

  for (let u = 0; u < users; u++) {
    const lengths = Array.from({ length: cyclesPerUser }, (_, i) => profile.gen(i, gauss));
    // Predict cycle k from cycles 0..k-1 (k ≥ 2 so every method has ≥ 2 data points).
    for (let k = 2; k < cyclesPerUser; k++) {
      let t = base;
      const cycles: any[] = [];
      for (let i = 0; i <= k; i++) {
        cycles.push({ id: `c${i}`, start_date: new Date(t).toISOString(), cycle_length: i < k ? lengths[i] : null, period_length: 5 });
        t += lengths[i] * DAY_MS;
      }
      const now = new Date(cycles[k].start_date).getTime() + 5 * DAY_MS;
      const r = runPredictionEngine({ cycles: cycles.reverse(), currentMode: profile.mode, now });
      if (r.model === "none") continue;
      const history = lengths.slice(0, k).reverse();
      const actual = lengths[k];
      const err = Math.abs(r.mean - actual);
      engineErr.push(err);
      baselines.last.push(Math.abs(history[0] - actual));
      baselines.median3.push(Math.abs(Math.round(median(history.slice(0, 3))) - actual));
      baselines.median6.push(Math.abs(Math.round(median(history.slice(0, 6))) - actual));
      baselines.mean6.push(Math.abs(Math.round(avg(history.slice(0, 6))) - actual));
      total++;
      if (err <= r.stdDev) covered++;
      if (err <= 2) hits++;
      widthSum += 2 * r.stdDev;
      confSum += r.confidence;
    }
  }

  return {
    engineMae: avg(engineErr),
    baselineMae: Object.fromEntries(Object.entries(baselines).map(([k, v]) => [k, avg(v)])),
    coverage: covered / total,
    avgWindowWidth: widthSum / total,
    avgConfidence: confSum / total,
    hitRate: hits / total,
  };
}

if (require.main === module) {
  for (const [name, profile] of Object.entries(PROFILES)) {
    const m = evaluateProfile(profile);
    const baselines = Object.entries(m.baselineMae).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(" · ");
    console.log(
      `${name.padEnd(14)} engine MAE ${m.engineMae.toFixed(2)} | ${baselines}\n` +
      `${"".padEnd(14)} coverage ${(m.coverage * 100).toFixed(0)}% · width ${m.avgWindowWidth.toFixed(1)}d · ` +
      `confidence ${(m.avgConfidence * 100).toFixed(0)}% vs ±2d hit rate ${(m.hitRate * 100).toFixed(0)}%`,
    );
  }
}
