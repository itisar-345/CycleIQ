import assert from "node:assert/strict";
import { computeCycleLength, computePeriodLength } from "../utils/cycleMath";
import { LUTEAL_PHASE_DAYS, runPredictionEngine } from "../utils/predictions";
import { arePredictionsDirty, clearPredictionsDirty, invalidatePredictions } from "../utils/predictionInvalidation";
import { countConsecutivePriorDays, evaluateEndoRedFlag, shouldShowSafeguardingPrompt, valuesForPreviousDays } from "../utils/safetyRules";
import { getDailyWindows, unionDurationMs } from "../utils/health/types";
import { buildExtendedSymptoms, EMPTY_ENDO_LOG, EMPTY_PCOS_LOG, EMPTY_PERI_LOG } from "../utils/logEntry";
import { readExtendedSymptoms } from "../database/types";
import { benjaminiHochberg, computeSpearman, studentTTwoSidedP } from "../utils/statistics";
import { evaluateProfile, PROFILES } from "./backtest";

const NOW = new Date("2026-06-28T12:00:00.000Z");
const DAY_MS = 86400000;

const isoDaysAgo = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * DAY_MS).toISOString();

/** Builds DB-shaped rows newest-first: an in-progress cycle started 5 days ago, then completed cycles. */
const makeCycles = (completedLengthsNewestFirst: number[]) => {
  const cycles: any[] = [{ id: "current", start_date: isoDaysAgo(5), cycle_length: null, period_length: null }];
  let offset = 5;
  completedLengthsNewestFirst.forEach((length, index) => {
    offset += length;
    cycles.push({ id: `cycle-${index}`, start_date: isoDaysAgo(offset), cycle_length: length, period_length: 5 });
  });
  return cycles;
};

const daysFromCurrentStart = (iso: string | null) =>
  Math.round((new Date(iso as string).getTime() - new Date(isoDaysAgo(5)).getTime()) / DAY_MS);

// ── cycle math ──
assert.equal(computeCycleLength("2026-02-01T00:00:00.000Z", "2026-01-04T00:00:00.000Z"), 28);
assert.equal(computePeriodLength("2026-02-01T00:00:00.000Z", "2026-02-05T00:00:00.000Z"), 5);
// Calendar days: a late-evening start vs a morning start is still a 28-day gap.
assert.equal(computeCycleLength(new Date(2026, 1, 1, 8), new Date(2026, 0, 4, 23)), 28);

// ── statistics ──
const positive = computeSpearman([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
assert.equal(positive.correlation, 1);
assert.equal(positive.pValue, 0);
assert.equal(positive.n, 5);
assert.equal(computeSpearman([1, 2, 3, 4, 5], [10, 8, 6, 4, 2]).correlation, -1);
// Ties: ranks-Pearson stays within [-1, 1] and is exact for a monotone tied series.
assert.ok(Math.abs(computeSpearman([1, 1, 2, 2, 3], [1, 1, 2, 2, 3]).correlation - 1) < 1e-12);
// Reference values from the Student t distribution.
assert.ok(Math.abs(studentTTwoSidedP(2.101, 18) - 0.05) < 0.001);
assert.ok(Math.abs(studentTTwoSidedP(2.449, 18) - 0.0248) < 0.001);
assert.ok(Math.abs(studentTTwoSidedP(0, 10) - 1) < 1e-9);
assert.deepEqual(benjaminiHochberg([0.01, 0.04, 0.03, 0.5], 0.05), [true, false, false, false]);
assert.deepEqual(benjaminiHochberg([0.01, 0.04, 0.03, 0.5], 0.1), [true, true, true, false]);

// ── prediction engine ──
const noHistory = runPredictionEngine({ cycles: makeCycles([]), currentMode: "standard", now: NOW });
assert.equal(noHistory.model, "none");
assert.match(noHistory.label, /Log your next period/);

// One completed cycle (e.g. the onboarding-reported average): low-confidence, wide estimate.
const reportedOnly = runPredictionEngine({ cycles: makeCycles([32]), currentMode: "standard", now: NOW });
assert.equal(reportedOnly.model, "rule-based");
assert.ok(reportedOnly.confidence <= 0.3);
assert.ok(reportedOnly.stdDev >= 4);
assert.match(reportedOnly.label, /reported cycle length/);

// The in-progress cycle's length is ignored even if a stale value is present.
const staleOpen = makeCycles([28, 28, 28, 28, 28]);
staleOpen[0].cycle_length = 90;
assert.equal(runPredictionEngine({ cycles: staleOpen, currentMode: "standard", now: NOW }).mean, 28);

const stablePrediction = runPredictionEngine({ cycles: makeCycles([28, 29, 27, 28, 28]), currentMode: "standard", now: NOW });
assert.equal(stablePrediction.model, "weighted-average");
assert.ok(Math.abs(stablePrediction.mean - 28) <= 1);
assert.ok(stablePrediction.stdDev <= 4, `window too wide for a regular user: ±${stablePrediction.stdDev}d`);
assert.equal(daysFromCurrentStart(stablePrediction.predictedStartISO), stablePrediction.mean);
assert.equal(
  daysFromCurrentStart(stablePrediction.nextOvulationWindowISO),
  stablePrediction.mean - LUTEAL_PHASE_DAYS - 2,
);

// Perfectly regular history → tight window and high confidence.
const perfect = runPredictionEngine({ cycles: makeCycles(Array(12).fill(28)), currentMode: "standard", now: NOW });
assert.equal(perfect.model, "full-rules");
assert.equal(perfect.mean, 28);
assert.ok(perfect.stdDev <= 2);
assert.ok(perfect.confidence >= 0.8);
assert.equal(perfect.mae, 0);

// Two long cycles: the window must contain what the data says.
const twoLong = runPredictionEngine({ cycles: makeCycles([35, 35]), currentMode: "standard", now: NOW });
assert.ok(twoLong.mean - twoLong.stdDev <= 35 && 35 <= twoLong.mean + twoLong.stdDev);

// A single missed log (56d) is trimmed instead of dragging the prediction.
const missedLog = runPredictionEngine({ cycles: makeCycles([28, 27, 29, 56, 28, 28, 27]), currentMode: "standard", now: NOW });
assert.ok(Math.abs(missedLog.mean - 28) <= 1);

const widePcosPrediction = runPredictionEngine({ cycles: makeCycles([42, 31, 55, 36, 48]), currentMode: "pcos", now: NOW });
assert.equal(widePcosPrediction.widePredictionWindow, true);
assert.equal(widePcosPrediction.irregularFlag, true);

// PCOD has its own prior rather than silently using "standard".
const pcodOne = runPredictionEngine({ cycles: makeCycles([28]), currentMode: "pcod", now: NOW });
assert.ok(pcodOne.mean > reportedOnly.mean - 4 && pcodOne.stdDev > runPredictionEngine({ cycles: makeCycles([28]), currentMode: "standard", now: NOW }).stdDev);

const postPill = runPredictionEngine({
  cycles: makeCycles([28, 29, 28]),
  currentMode: "standard",
  postPillMode: true,
  postPillStartDate: isoDaysAgo(20),
  now: NOW,
});
assert.equal(postPill.model, "none");
assert.match(postPill.label, /Building baseline — 70 days/);

const postPillDone = runPredictionEngine({
  cycles: makeCycles([28, 29, 28]),
  currentMode: "standard",
  postPillMode: true,
  postPillStartDate: isoDaysAgo(120),
  now: NOW,
});
assert.notEqual(postPillDone.model, "none");

// Bias shifts dates (not the cycle-length estimate) and is reported.
const biased = runPredictionEngine({ cycles: makeCycles([28, 29, 27, 28, 28]), currentMode: "standard", biasCorrection: 2.4, now: NOW });
assert.equal(biased.biasAppliedDays, 2);
assert.equal(daysFromCurrentStart(biased.predictedStartISO), stablePrediction.mean + 2);

// ── backtest regression gate ──
// The engine must stay competitive with a plain 6-cycle median, its window should cover
// roughly 80% of outcomes, and its confidence should track the real ±2-day hit rate.
for (const [name, profile] of Object.entries(PROFILES)) {
  const m = evaluateProfile(profile, 80);
  assert.ok(m.engineMae <= m.baselineMae.median6 * 1.15, `${name}: MAE ${m.engineMae.toFixed(2)} vs median6 ${m.baselineMae.median6.toFixed(2)}`);
  assert.ok(m.coverage >= 0.7 && m.coverage <= 0.95, `${name}: window coverage ${(m.coverage * 100).toFixed(0)}%`);
  assert.ok(Math.abs(m.avgConfidence - m.hitRate) <= 0.12, `${name}: confidence ${m.avgConfidence.toFixed(2)} vs hit rate ${m.hitRate.toFixed(2)}`);
}

// ── health import helpers ──
// Watch + phone record overlapping sleep: 23:00–07:00 and 01:00–06:30 is 8h, not 13.5h.
const h = (hours: number) => Date.UTC(2026, 5, 1) + hours * 3600_000;
assert.equal(unionDurationMs([{ start: h(-1), end: h(7) }, { start: h(1), end: h(6.5) }]) / 3600_000, 8);
assert.equal(unionDurationMs([{ start: h(0), end: h(1) }, { start: h(2), end: h(3) }]) / 3600_000, 2);
assert.equal(unionDurationMs([]), 0);
const windows = getDailyWindows("2026-06-10T15:00:00", new Date("2026-06-10T15:00:00"));
assert.equal(windows.sleep.start.getHours(), 18);
assert.equal(windows.sleep.start.getDate(), 9);
assert.equal(windows.sleep.end.getHours(), 12);
assert.equal(windows.activity.end.getTime(), new Date("2026-06-10T15:00:00").getTime(), "today's activity window ends now");

// ── extended symptoms round trip ──
const extended = buildExtendedSymptoms({
  mode: "endo",
  pcos: EMPTY_PCOS_LOG,
  endo: { ...EMPTY_ENDO_LOG, bowelSymptoms: ["Pain"], bladderSymptoms: ["Urgency"] },
  peri: EMPTY_PERI_LOG,
  clotsSize: "Large",
  inFlare: true,
  flare: { pain: 8, nausea: true, movement: "Limited" },
  nowISO: "2026-06-10T10:00:00.000Z",
});
const readBack = readExtendedSymptoms({ extended_symptoms: JSON.stringify(extended) });
assert.deepEqual(readBack.endo?.bowel, ["Pain"]);
assert.equal(readBack.endo?.clots, "Large");
assert.equal(readBack.flare?.mode.movement, "Limited");
assert.equal(readBack.pcos, undefined);
assert.deepEqual(readExtendedSymptoms({ extended_symptoms: "not json" }), {});

// ── calendar-day safety helpers ──
const TODAY = new Date(2026, 5, 10, 9);
const at = (daysAgo: number, hour = 12) => new Date(2026, 5, 10 - daysAgo, hour).toISOString();
const painLog = [
  { logged_date: at(1, 8), value: 5 },
  { logged_date: at(1, 20), value: 9 }, // two logs yesterday → day max is 9
  { logged_date: at(2), value: 8 },
  { logged_date: at(9), value: 10 },
];
assert.deepEqual(valuesForPreviousDays(painLog, TODAY, 3), [9, 8, null]);
assert.deepEqual(valuesForPreviousDays(painLog, TODAY, 1, "min"), [5]);
// Severe pain today + yesterday + the day before → red flag…
assert.equal(
  evaluateEndoRedFlag({ painScore: 8, previousPainScores: valuesForPreviousDays(painLog, TODAY, 2) }).triggerType,
  "severe_pain_3_days",
);
// …but not when one of those days wasn't logged (old severe entries don't count).
assert.equal(
  evaluateEndoRedFlag({ painScore: 9, previousPainScores: [9, null] }).shouldPrompt,
  false,
);
const moodLog = [
  { logged_date: at(1), value: 1 },
  { logged_date: at(2, 9), value: 1 },
  { logged_date: at(2, 21), value: 4 },
  { logged_date: at(3), value: 1 },
];
assert.equal(countConsecutivePriorDays(moodLog, TODAY, (v) => v <= 1, "min"), 3, "a day counts as low if any entry was very low");
assert.equal(countConsecutivePriorDays(moodLog, TODAY, (v) => v <= 1, "max"), 1);
assert.equal(countConsecutivePriorDays([], TODAY, () => true), 0);

// ── safety rules ──
assert.equal(shouldShowSafeguardingPrompt(1, 2, true), true);
assert.equal(shouldShowSafeguardingPrompt(1, 2, false), false);
assert.equal(shouldShowSafeguardingPrompt(2, 2, true), false);

assert.equal(
  evaluateEndoRedFlag({
    painScore: 5,
    bowelSymptoms: ["Constipation"],
    shoulderSide: "Left",
    flowIntensity: "Heavy",
  }).triggerType,
  "bowel_shoulder_heavy_flow",
);

assert.equal(
  evaluateEndoRedFlag({
    painScore: 8,
    previousPainScores: [9, 8],
  }).triggerType,
  "severe_pain_3_days",
);

clearPredictionsDirty();
assert.equal(arePredictionsDirty(), false);
invalidatePredictions("test");
assert.equal(arePredictionsDirty(), true);

console.log("All CycleIQ tests passed.");
