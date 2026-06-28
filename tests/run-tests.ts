import assert from "node:assert/strict";
import { computeCycleLength, computePeriodLength } from "../utils/cycleMath";
import { runPredictionEngine } from "../utils/predictions";
import { arePredictionsDirty, clearPredictionsDirty, invalidatePredictions } from "../utils/predictionInvalidation";
import { evaluateEndoRedFlag, shouldShowSafeguardingPrompt } from "../utils/safetyRules";
import { computeSpearman } from "../utils/statistics";

const isoDaysAgo = (daysAgo: number) => {
  const date = new Date("2026-06-28T12:00:00.000Z");
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

const makeCycles = (lengthsNewestFirst: number[]) => {
  let offset = 0;
  return lengthsNewestFirst.map((length, index) => {
    const cycle = {
      id: `cycle-${index}`,
      start_date: isoDaysAgo(offset),
      cycle_length: length,
      period_length: 5,
    };
    offset += length;
    return cycle;
  });
};

assert.equal(computeCycleLength("2026-02-01T00:00:00.000Z", "2026-01-04T00:00:00.000Z"), 28);
assert.equal(computePeriodLength("2026-02-01T00:00:00.000Z", "2026-02-05T00:00:00.000Z"), 5);

const positive = computeSpearman([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
assert.equal(positive.correlation, 1);
assert.equal(positive.pValue, 0);
assert.equal(positive.n, 5);

const negative = computeSpearman([1, 2, 3, 4, 5], [10, 8, 6, 4, 2]);
assert.equal(negative.correlation, -1);

const tooFewCycles = runPredictionEngine({ cycles: makeCycles([28]), currentMode: "standard" });
assert.equal(tooFewCycles.model, "none");
assert.match(tooFewCycles.label, /Log 2\+ cycles/);

const stablePrediction = runPredictionEngine({ cycles: makeCycles([28, 29, 27, 28, 28]), currentMode: "standard" });
assert.equal(stablePrediction.model, "gpr");
assert.notEqual(stablePrediction.model, "none");
assert.ok(stablePrediction.predictedStartISO);
assert.ok(stablePrediction.confidence > 0.4);

const heldOutActualLength = 28;
assert.ok(Math.abs(stablePrediction.mean - heldOutActualLength) <= 4);

const widePcosPrediction = runPredictionEngine({ cycles: makeCycles([42, 31, 55, 36, 48]), currentMode: "pcos" });
assert.equal(widePcosPrediction.widePredictionWindow, true);
assert.equal(widePcosPrediction.irregularFlag, true);

const postPill = runPredictionEngine({
  cycles: makeCycles([28, 29, 28]),
  currentMode: "standard",
  postPillMode: true,
  postPillStartDate: isoDaysAgo(20),
});
assert.equal(postPill.model, "none");
assert.match(postPill.label, /Building baseline/);

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
