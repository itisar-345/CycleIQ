/**
 * Lifestyle guidance rules (utils/lifestyleGuidance.ts): each rule fires on the data it
 * should, stays quiet without enough logged days, and keeps the safety rules.
 *
 *   npx tsx tests/guidance.test.ts
 */
import assert from "node:assert/strict";
import { EVIDENCE_SOURCES } from "../data/evidence";
import type { FoodExtended, FoodItem } from "../database/types";
import { buildExtendedSymptoms, EMPTY_ENDO_LOG, EMPTY_FOOD_LOG, EMPTY_PCOS_LOG, EMPTY_PERI_LOG } from "../utils/logEntry";
import { buildLifestyleGuidance, pickNotifiableGuidance, type GuidanceEntry, type GuidanceInput } from "../utils/lifestyleGuidance";

const NOW = new Date(2026, 5, 28, 21, 0);

/** A log `daysAgo` local days before NOW, at midday. */
const log = (daysAgo: number, fields: Partial<GuidanceEntry> = {}): GuidanceEntry => ({
  logged_date: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - daysAgo, 12).toISOString(),
  pain_score: null, mood_score: null, energy_score: null, fatigue_score: null, flow_intensity: null,
  sleep_hours: null, exercise_type: null, exercise_duration: null, steps_count: null, activity_minutes: null,
  extended_symptoms: null,
  ...fields,
});
const days = (n: number, fields: Partial<GuidanceEntry>) => Array.from({ length: n }, (_, i) => log(i, fields));
const run = (overrides: Partial<GuidanceInput>) =>
  buildLifestyleGuidance({ mode: "standard", isTeen: false, entries: [], periodStarts: [], now: NOW, ...overrides });
const ids = (overrides: Partial<GuidanceInput>) => run(overrides).map((g) => g.id);

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

test("nothing to say without logs (standard mode)", () => {
  assert.deepEqual(ids({}), []);
});

test("activity below 150 min/week suggests more, from logged days only", () => {
  const g = run({ entries: days(5, { exercise_type: "Walking", exercise_duration: 10 }) }).find((x) => x.id === "activity-below");
  assert.ok(g);
  assert.match(g.body[1], /about 70 active minutes/);
  assert.equal(g.grade, "guideline");
});

test("unlogged days are not zeros: 3 logged days say nothing", () => {
  assert.ok(!ids({ entries: days(3, { exercise_duration: 5, exercise_type: "Walking" }) }).includes("activity-below"));
});

test("meeting 150 minutes is acknowledged; PCOS is pointed toward 250", () => {
  const entries = days(5, { exercise_type: "Walking", exercise_duration: 35 });
  assert.ok(ids({ entries }).includes("activity-met"));
  const pcos = run({ mode: "pcos", entries }).find((g) => g.id === "activity-met")!;
  assert.match(pcos.body[1], /250/);
});

test("no activity nudges during a flare or severe pain", () => {
  const entries = [...days(5, { exercise_duration: 5, exercise_type: "Walking", steps_count: 2000 }), log(1, { pain_score: 8 })];
  const out = ids({ entries });
  assert.ok(!out.includes("activity-below") && !out.includes("steps-below"));
  assert.ok(!ids({ entries: days(5, { exercise_duration: 5, exercise_type: "Walking" }), inFlare: true }).includes("activity-below"));
});

test("teens get the 60 min/day target and no strength or supplement talk", () => {
  const out = run({ isTeen: true, mode: "pcos", entries: days(5, { exercise_duration: 20, exercise_type: "Walking" }) });
  assert.ok(out.some((g) => g.id === "activity-teen"));
  assert.ok(!out.some((g) => g.id === "strength" || g.id === "pcos-supplements"));
  const painful = run({ isTeen: true, entries: [log(10, { flow_intensity: "Heavy", pain_score: 7 }), log(11, { flow_intensity: "Medium", pain_score: 8 })] });
  for (const g of [...out, ...painful]) {
    assert.doesNotMatch(g.body.join(" "), /supplement|vitamin D|omega-3|inositol/i, g.id);
  }
});

test("strength training suggested when 2 weeks of activity has none", () => {
  assert.ok(ids({ entries: days(6, { exercise_type: "Running", exercise_duration: 30 }) }).includes("strength"));
  const withLift = [...days(6, { exercise_type: "Running", exercise_duration: 30 }), log(8, { exercise_type: "Strength", exercise_duration: 30 })];
  assert.ok(!ids({ entries: withLift }).includes("strength"));
});

test("steps: below 7,000 suggests more; 7,000+ is acknowledged", () => {
  assert.ok(ids({ entries: days(5, { steps_count: 4200 }) }).includes("steps-below"));
  assert.ok(ids({ entries: days(5, { steps_count: 8100 }) }).includes("steps-met"));
});

test("short sleep is flagged against the age-appropriate target", () => {
  assert.ok(ids({ entries: days(5, { sleep_hours: 6 }) }).includes("sleep-short"));
  assert.ok(!ids({ entries: days(5, { sleep_hours: 7.5 }) }).includes("sleep-short"));
  assert.ok(ids({ isTeen: true, entries: days(5, { sleep_hours: 7.5 }) }).includes("sleep-short"));
  assert.match(run({ mode: "pcos", entries: days(5, { sleep_hours: 6 }) }).find((g) => g.id === "sleep-short")!.body[1], /insulin/);
});

test("heavy periods + tiredness → iron check warning, first in the list", () => {
  const heavy = [log(20, { flow_intensity: "Heavy" }), log(21, { flow_intensity: "Very Heavy" }), log(22, { flow_intensity: "Heavy" })];
  const tired = [log(1, { fatigue_score: 8 }), log(2, { energy_score: 2 }), log(3, { fatigue_score: 7 })];
  const out = run({ entries: [...heavy, ...tired] });
  assert.equal(out[0].id, "iron-check");
  assert.equal(out[0].kind, "warning");
  assert.match(out[0].body[1], /ferritin/);
  assert.ok(ids({ entries: heavy }).includes("iron-foods"));
  assert.ok(!ids({ entries: heavy.slice(0, 2) }).includes("iron-foods"));
});

test("painful periods get exercise evidence; endo gets its own, weaker wording", () => {
  const painful = [log(10, { flow_intensity: "Heavy", pain_score: 7 }), log(11, { flow_intensity: "Medium", pain_score: 6 })];
  const std = run({ entries: painful }).find((g) => g.id === "pain-period")!;
  assert.ok(std.sources.includes("cochraneExerciseDysmenorrhoea"));
  const endo = run({ mode: "endo", entries: painful }).find((g) => g.id === "pain-endo")!;
  assert.equal(endo.grade, "limited");
  // Pain on non-bleeding days doesn't count as period pain.
  assert.ok(!ids({ entries: [log(10, { pain_score: 7 }), log(11, { pain_score: 7 })] }).includes("pain-period"));
});

test("low mood in the week before periods → PMS suggestion", () => {
  const periodStarts = [log(30).logged_date, log(2).logged_date];
  const lowBefore = [log(33, { mood_score: 1 }), log(34, { mood_score: 2 }), log(5, { mood_score: 2 })];
  assert.ok(ids({ entries: lowBefore, periodStarts }).includes("pms-mood"));
  // Same low days, but mid-cycle: no PMS pattern.
  const lowMid = [log(15, { mood_score: 1 }), log(16, { mood_score: 2 }), log(17, { mood_score: 2 })];
  assert.ok(!ids({ entries: lowMid, periodStarts }).includes("pms-mood"));
});

test("condition modes: PCOS food facts, endo gut tips, peri hot flushes & bone", () => {
  assert.deepEqual(ids({ mode: "pcos" }), ["pcos-food", "pcos-supplements"]);
  const bowel = log(3, { extended_symptoms: JSON.stringify({ endo: { bowel: ["Constipation"] } }) });
  assert.ok(ids({ mode: "endo", entries: [bowel] }).includes("endo-gut"));
  const flushes = [1, 2, 3].map((d) => log(d, { extended_symptoms: JSON.stringify({ peri: { hotFlashes: true } }) }));
  const peri = run({ mode: "peri", entries: flushes });
  assert.ok(peri.some((g) => g.id === "peri-hot-flashes"));
  assert.ok(peri.some((g) => g.id === "peri-bone"));
});

test("notifications: warnings first, general education never", () => {
  assert.equal(pickNotifiableGuidance(run({ mode: "pcos" })), null);
  const heavyTired = [
    log(20, { flow_intensity: "Heavy" }), log(21, { flow_intensity: "Heavy" }), log(22, { flow_intensity: "Heavy" }),
    ...days(5, { fatigue_score: 9, steps_count: 3000 }),
  ];
  assert.equal(pickNotifiableGuidance(run({ entries: heavyTired }))?.id, "iron-check");
});

test("every item cites real sources and has both voices", () => {
  const everything = [
    ...run({ mode: "pcos", entries: [...days(6, { exercise_duration: 5, exercise_type: "Walking", steps_count: 3000, sleep_hours: 6 })] }),
    ...run({ mode: "peri", entries: [1, 2, 3].map((d) => log(d, { extended_symptoms: JSON.stringify({ peri: { nightSweats: true } }) })) }),
    ...run({ mode: "endo", entries: [log(3, { extended_symptoms: JSON.stringify({ endo: { bowel: ["Pain"] } }) })] }),
  ];
  assert.ok(everything.length >= 8);
  for (const g of everything) {
    assert.ok(g.sources.length > 0, g.id);
    for (const s of g.sources) assert.ok(EVIDENCE_SOURCES[s]?.url.startsWith("https://"), `${g.id}: ${s}`);
    for (const text of [...g.title, ...g.body]) assert.ok(text.trim().length > 0, g.id);
  }
});

// ── food & drink (optional Daily Log food card) ──

const meal = (daysAgo: number, food: Partial<FoodExtended>, fields: Partial<GuidanceEntry> = {}) =>
  log(daysAgo, {
    ...fields,
    extended_symptoms: JSON.stringify({
      ...JSON.parse(fields.extended_symptoms ?? "{}"),
      food: { fruitVeg: null, foods: [], caffeine: null, alcohol: null, ...food },
    }),
  });
const meals = (n: number, food: Partial<FoodExtended>) => Array.from({ length: n }, (_, i) => meal(i, food));
const allFoods: FoodItem[] = ["Wholegrains", "IronRich", "CalciumRich"];

test("fruit & veg: below 5 portions suggests more; 5+ is acknowledged; 3 days says nothing", () => {
  const low = run({ entries: meals(5, { fruitVeg: 2, foods: allFoods }) }).find((g) => g.id === "food-fruit-veg")!;
  assert.match(low.body[1], /averaging 2 portions/);
  assert.ok(ids({ entries: meals(5, { fruitVeg: 5, foods: allFoods }) }).includes("food-fruit-veg-met"));
  assert.ok(!ids({ entries: meals(3, { fruitVeg: 1 }) }).some((id) => id.startsWith("food-")));
  // Endometriosis adds the citrus association.
  assert.ok(run({ mode: "endo", entries: meals(5, { fruitVeg: 2 }) }).find((g) => g.id === "food-fruit-veg")!.sources.includes("harrisFruitEndo"));
});

test("wholegrains on fewer than half of logged days → fibre suggestion (PCOS: insulin)", () => {
  assert.ok(ids({ entries: meals(5, { fruitVeg: 5 }) }).includes("food-fibre"));
  assert.ok(!ids({ entries: meals(5, { fruitVeg: 5, foods: ["Wholegrains"] }) }).includes("food-fibre"));
  assert.match(run({ mode: "pcos", entries: meals(5, { fruitVeg: 5 }) }).find((g) => g.id === "food-fibre")!.body[1], /insulin/);
});

test("calcium suggestion only where evidence points: PMS pattern or perimenopause", () => {
  assert.ok(!ids({ entries: meals(5, { fruitVeg: 5 }) }).includes("food-calcium"));
  assert.ok(ids({ mode: "peri", entries: meals(5, { fruitVeg: 5 }) }).includes("food-calcium"));
  const periodStarts = [log(30).logged_date, log(2).logged_date];
  const lowBefore = [meal(33, {}, { mood_score: 1 }), meal(34, {}, { mood_score: 2 }), meal(5, { fruitVeg: 5 }, { mood_score: 2 })];
  const pms = run({ entries: [...lowBefore, ...meals(5, { fruitVeg: 5 })], periodStarts }).find((g) => g.id === "food-calcium")!;
  assert.ok(pms.sources.includes("calciumFoodPms"));
});

test("no oily fish in 2 weeks of food logs → omega-3 suggestion", () => {
  assert.ok(ids({ entries: meals(8, { fruitVeg: 5, foods: allFoods }) }).includes("food-oily-fish"));
  const withFish = [...meals(8, { fruitVeg: 5, foods: allFoods }), meal(10, { foods: ["OilyFish"] })];
  assert.ok(!ids({ entries: withFish }).includes("food-oily-fish"));
});

test("red / processed meat above WCRF limits; endo wording is graded limited", () => {
  const entries = meals(5, { fruitVeg: 5, foods: [...allFoods, "RedMeat"] });
  assert.ok(ids({ entries }).includes("food-red-meat"));
  assert.equal(run({ mode: "endo", entries }).find((g) => g.id === "food-red-meat")!.grade, "limited");
  assert.ok(ids({ entries: [...meals(5, { fruitVeg: 5, foods: allFoods }), meal(1, { foods: ["ProcessedMeat"] }), meal(2, { foods: ["ProcessedMeat"] })] }).includes("food-red-meat"));
  assert.ok(!ids({ entries: [...meals(5, { fruitVeg: 5, foods: allFoods }), meal(1, { foods: ["RedMeat"] })] }).includes("food-red-meat"));
});

test("fried food, sugary drinks, caffeine and alcohol each trigger on frequent days", () => {
  const base = meals(5, { fruitVeg: 5, foods: allFoods });
  const extra = (food: Partial<FoodExtended>) => [...base, ...[0, 1, 2].map((d) => meal(d, { fruitVeg: 5, ...food }))];
  assert.ok(ids({ entries: extra({ foods: [...allFoods, "Fried"] }) }).includes("food-fried"));
  assert.match(run({ mode: "pcos", entries: extra({ foods: [...allFoods, "SugaryDrinks"] }) }).find((g) => g.id === "food-sugary-drinks")!.body[1], /insulin/);
  assert.ok(ids({ entries: meals(5, { caffeine: 5 }) }).includes("food-caffeine"));
  assert.ok(!ids({ entries: meals(5, { caffeine: 3 }) }).includes("food-caffeine"));
  const alcohol = run({ mode: "peri", entries: meals(5, { alcohol: 1 }) }).find((g) => g.id === "food-alcohol")!;
  assert.ok(alcohol.sources.includes("hseHotFlushes") && alcohol.grade === "limited");
});

test("perimenopause: hot-flush days that follow alcohol / caffeine are pointed out", () => {
  const flush = JSON.stringify({ peri: { hotFlashes: true } });
  const entries = [1, 2, 3, 4].map((d) => meal(d, { caffeine: d <= 3 ? 3 : 0 }, { extended_symptoms: flush }));
  const g = run({ mode: "peri", entries }).find((x) => x.id === "food-flush-triggers")!;
  assert.match(g.body[1], /On 3 of 4 hot-flush days/);
});

test("iron warning cites the food log when iron-rich food is rare", () => {
  const heavy = [log(20, { flow_intensity: "Heavy" }), log(21, { flow_intensity: "Heavy" }), log(22, { flow_intensity: "Heavy" })];
  const tiredMeals = [1, 2, 3, 4, 5].map((d) => meal(d, { fruitVeg: 3, foods: d === 1 ? ["IronRich"] : [] }, { fatigue_score: 8 }));
  const warning = run({ entries: [...heavy, ...tiredMeals] })[0];
  assert.equal(warning.id, "iron-check");
  assert.match(warning.body[1], /iron-rich food on 1 of 5 days/);
});

test("teens get no food rules, even with food data", () => {
  assert.ok(!ids({ isTeen: true, entries: meals(8, { fruitVeg: 1, caffeine: 5, alcohol: 1 }) }).some((id) => id.startsWith("food-")));
});

test("food tips never mention weight or calories", () => {
  const everything = run({ mode: "pcos", entries: meals(8, { fruitVeg: 1, caffeine: 6, alcohol: 2, foods: ["RedMeat", "Fried", "SugaryDrinks", "ProcessedMeat"] }) });
  assert.ok(everything.filter((g) => g.id.startsWith("food-")).length >= 6);
  for (const g of everything) assert.doesNotMatch([...g.title, ...g.body].join(" "), /weight|calorie|kcal/i, g.id);
});

test("notifications rotate through suggestions day by day; warnings still win", () => {
  const items = run({ entries: meals(8, { fruitVeg: 1, caffeine: 6 }) });
  const picked = new Set([0, 1, 2, 3, 4, 5].map((d) => pickNotifiableGuidance(items, NOW.getTime() + d * 86400000)!.id));
  assert.ok(picked.size > 1, `always ${[...picked]}`);
  for (const id of picked) assert.notEqual(items.find((g) => g.id === id)!.kind, "learn");
});

test("the food log is saved only when something was answered", () => {
  const base = { mode: "standard", pcos: EMPTY_PCOS_LOG, endo: EMPTY_ENDO_LOG, peri: EMPTY_PERI_LOG, clotsSize: null, inFlare: false, flare: { pain: null, nausea: false, movement: null }, nowISO: NOW.toISOString() };
  assert.equal(buildExtendedSymptoms({ ...base, food: EMPTY_FOOD_LOG }).food, undefined);
  assert.deepEqual(buildExtendedSymptoms({ ...base, food: { ...EMPTY_FOOD_LOG, alcohol: 0 } }).food, { ...EMPTY_FOOD_LOG, alcohol: 0 });
});

console.log(`All ${passed} guidance tests passed.`);
