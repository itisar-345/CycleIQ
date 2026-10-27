/**
 * Evidence-based lifestyle guidance from the user's own logs: activity, steps, sleep,
 * food and drink (from the optional Daily Log food card), heavy periods and iron, period
 * pain, premenstrual mood, and condition-specific facts. Pure (no database, no UI) so
 * every rule is unit-tested.
 *
 * Ground rules (see docs/EVIDENCE_REVIEW.md and docs/CLINICAL_REVIEW.md §5):
 * - Signposting, never diagnosis. Warnings suggest talking to a clinician.
 * - Unlogged days are never treated as zero: a rule needs enough logged days to speak.
 * - No supplement talk for teens. Supplement tips live in utils/supplementGuidance.ts.
 * - No weight-loss or calorie messaging; food tips are about what to add or swap.
 * - Never nudge more activity during a flare or a run of severe pain.
 * - Every item names its evidence grade and sources, and says so when evidence is weak.
 */
import { differenceInCalendarDays } from "date-fns";
import type { FoodExtended, FoodItem, SymptomEntryRow } from "../database/types";
import { readExtendedSymptoms } from "../database/types";
import {
  ACTIVITY_TARGETS,
  FOOD_TARGETS,
  HEAVY_DAYS_FOR_IRON_CHECK,
  SLEEP_TARGETS,
  type EvidenceGrade,
  type EvidenceSourceId,
} from "../data/evidence";
import { localDateKey, parseLocalDate } from "./dates";

export type GuidanceKind = "warning" | "suggestion" | "positive" | "learn";

export interface Guidance {
  id: string;
  kind: GuidanceKind;
  /** [chill, classic] */
  title: [string, string];
  body: [string, string];
  grade: EvidenceGrade;
  sources: EvidenceSourceId[];
}

export type GuidanceEntry = Pick<SymptomEntryRow,
  "logged_date" | "pain_score" | "mood_score" | "energy_score" | "fatigue_score" | "flow_intensity" |
  "sleep_hours" | "exercise_type" | "exercise_duration" | "steps_count" | "activity_minutes" | "extended_symptoms">;

export interface GuidanceInput {
  mode: string;
  isTeen: boolean;
  entries: GuidanceEntry[];
  /** Start dates of logged (confirmed) periods, any order. */
  periodStarts: string[];
  inFlare?: boolean;
  now?: Date | number;
}

/** A 7-day rule needs at least this many logged days before it says anything. */
export const MIN_LOGGED_DAYS = 4;
const HEAVY_FLOWS = new Set(["Heavy", "Very Heavy"]);
const NO_FLOW = new Set(["None", "Spotting"]);
const KIND_ORDER: Record<GuidanceKind, number> = { warning: 0, suggestion: 1, positive: 2, learn: 3 };

// ─── day aggregation ─────────────────────────────────────────────────────────

export interface Day {
  key: string;
  ageDays: number;
  pain: number | null;
  mood: number | null;
  energy: number | null;
  fatigue: number | null;
  heavy: boolean;
  bleeding: boolean;
  sleep: number | null;
  /** Active minutes, or null when nothing about activity was logged. */
  activeMinutes: number | null;
  strength: boolean;
  steps: number | null;
  hotFlash: boolean;
  bowel: boolean;
  /** Food log for the day (several logs merged), or null if no food question was answered. */
  food: FoodExtended | null;
}

const isFoodAnswered = (f: FoodExtended | undefined): f is FoodExtended =>
  !!f && (f.fruitVeg !== null || f.caffeine !== null || f.alcohol !== null || (f.foods?.length ?? 0) > 0);

/** Two logs on one day: counts take the larger answer, foods are combined. */
const mergeFood = (a: FoodExtended | null, b: FoodExtended): FoodExtended => ({
  fruitVeg: maxOf(a?.fruitVeg ?? null, b.fruitVeg),
  caffeine: maxOf(a?.caffeine ?? null, b.caffeine),
  alcohol: maxOf(a?.alcohol ?? null, b.alcohol),
  foods: [...new Set([...(a?.foods ?? []), ...(b.foods ?? [])])],
});

const maxOf = (a: number | null, b: number | null | undefined) =>
  b === null || b === undefined ? a : a === null ? b : Math.max(a, b);
const minOf = (a: number | null, b: number | null | undefined) =>
  b === null || b === undefined ? a : a === null ? b : Math.min(a, b);

/** Several logs on one day collapse to one: worst pain and mood, most activity. */
export function toDays(entries: GuidanceEntry[], today: Date): Day[] {
  const days = new Map<string, Day>();
  for (const e of entries) {
    const key = localDateKey(e.logged_date);
    const ageDays = differenceInCalendarDays(today, parseLocalDate(key));
    if (ageDays < 0) continue;
    const d = days.get(key) ?? {
      key, ageDays, pain: null, mood: null, energy: null, fatigue: null, heavy: false, bleeding: false,
      sleep: null, activeMinutes: null, strength: false, steps: null, hotFlash: false, bowel: false, food: null,
    };
    d.pain = maxOf(d.pain, e.pain_score);
    d.mood = minOf(d.mood, e.mood_score);
    d.energy = minOf(d.energy, e.energy_score);
    d.fatigue = maxOf(d.fatigue, e.fatigue_score);
    d.heavy ||= HEAVY_FLOWS.has(e.flow_intensity ?? "");
    d.bleeding ||= !!e.flow_intensity && !NO_FLOW.has(e.flow_intensity);
    d.sleep = maxOf(d.sleep, e.sleep_hours);
    d.steps = maxOf(d.steps, e.steps_count);
    const minutes = Math.max(e.activity_minutes ?? 0, e.exercise_duration ?? 0);
    const activityLogged = e.activity_minutes != null || e.exercise_duration != null || !!e.exercise_type;
    if (activityLogged) d.activeMinutes = (d.activeMinutes ?? 0) + minutes;
    d.strength ||= e.exercise_type === "Strength";
    const ext = readExtendedSymptoms(e);
    d.hotFlash ||= !!ext.peri?.hotFlashes || !!ext.peri?.nightSweats;
    d.bowel ||= (ext.endo?.bowel?.length ?? 0) > 0;
    if (isFoodAnswered(ext.food)) d.food = mergeFood(d.food, ext.food);
    days.set(key, d);
  }
  return [...days.values()];
}

export const within = (days: Day[], n: number) => days.filter((d) => d.ageDays < n);
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const values = (days: Day[], pick: (d: Day) => number | null) =>
  days.map(pick).filter((v): v is number => v !== null);

// ─── rules ───────────────────────────────────────────────────────────────────

function activityGuidance(week: Day[], twoWeeks: Day[], input: GuidanceInput, resting: boolean): Guidance[] {
  const out: Guidance[] = [];
  const minutes = values(week, (d) => d.activeMinutes);
  if (minutes.length >= MIN_LOGGED_DAYS && !resting) {
    const weekly = Math.round((avg(minutes) * 7) / 5) * 5;
    if (input.isTeen) {
      const daily = Math.round(avg(minutes));
      if (daily < ACTIVITY_TARGETS.teenDailyMinutes) {
        out.push({
          id: "activity-teen", kind: "suggestion", grade: "guideline", sources: ["who2020"],
          title: ["move a bit more?", "Daily activity"],
          body: [
            `you're averaging ~${daily} active mins a day. the WHO goal for teens is 60 a day — walking, dancing, sport, it all counts. small bits add up`,
            `You're averaging about ${daily} active minutes a day. The WHO recommends an average of 60 minutes a day for teenagers; any activity that gets you moving counts.`,
          ],
        });
      }
    } else if (weekly < ACTIVITY_TARGETS.adultWeeklyMinutes) {
      out.push({
        id: "activity-below", kind: "suggestion", grade: "guideline",
        sources: input.mode === "pcos" ? ["pcosGuideline2023", "who2020"] : ["who2020"],
        title: ["room for more movement", "Weekly activity"],
        body: [
          `you're at ~${weekly} active mins this week. the goal is 150+ (brisk walking counts) — try adding ~${Math.max(10, Math.round((150 - weekly) / 5 / 5) * 5)} mins on 5 days.` +
            (input.mode === "pcos" ? " for PCOS this helps insulin & cycles, whatever your weight" : ""),
          `You're at about ${weekly} active minutes this week. Guidelines recommend at least 150 minutes of moderate activity, such as brisk walking.` +
            (input.mode === "pcos" ? " In PCOS, activity improves insulin sensitivity and cycle health regardless of weight change." : ""),
        ],
      });
    } else {
      const pcosMore = input.mode === "pcos" && weekly < ACTIVITY_TARGETS.pcosExtraBenefitWeeklyMinutes;
      out.push({
        id: "activity-met", kind: "positive", grade: "guideline",
        sources: input.mode === "pcos" ? ["pcosExercise2024", "who2020"] : ["who2020"],
        title: ["activity goal: smashed", "Activity goal met"],
        body: [
          `~${weekly} active mins this week — that's the 150+ goal.` + (pcosMore ? " going toward 250 adds extra benefit for PCOS, if it feels good" : " keep it up"),
          `About ${weekly} active minutes this week meets the 150-minute guideline.` + (pcosMore ? " For PCOS, building toward 250 minutes adds further benefit." : ""),
        ],
      });
    }
  }

  // Muscle strengthening twice a week is part of the same guidelines (and protects bone).
  const activeDays = twoWeeks.filter((d) => (d.activeMinutes ?? 0) > 0);
  if (!input.isTeen && !resting && activeDays.length >= MIN_LOGGED_DAYS && !twoWeeks.some((d) => d.strength)) {
    out.push({
      id: "strength", kind: "suggestion", grade: "guideline",
      sources: input.mode === "peri" ? ["who2020", "namsOsteoporosis2021"] : input.mode === "pcos" ? ["pcosGuideline2023", "who2020"] : ["who2020"],
      title: ["add some strength?", "Strength training"],
      body: [
        "no strength sessions logged in 2 weeks. guidelines say 2 days a week — bodyweight squats, bands or weights all count" +
          (input.mode === "peri" ? ". it's one of the best things for your bones right now" : ""),
        "No strength training logged in two weeks. Guidelines recommend muscle-strengthening activity on at least 2 days a week; bodyweight, bands or weights all count." +
          (input.mode === "peri" ? " It is especially important for bone health around menopause." : ""),
      ],
    });
  }
  return out;
}

function stepsGuidance(week: Day[], resting: boolean): Guidance[] {
  const steps = values(week, (d) => d.steps);
  if (steps.length < MIN_LOGGED_DAYS || resting) return [];
  const daily = Math.round(avg(steps) / 100) * 100;
  if (daily >= ACTIVITY_TARGETS.dailySteps) {
    return [{
      id: "steps-met", kind: "positive", grade: "moderate", sources: ["dingSteps2025", "paluchSteps2022"],
      title: ["step count: solid", "Daily steps"],
      body: [
        `~${daily.toLocaleString()} steps a day. big studies find most of the health benefit lands around 7,000 — you're there`,
        `You're averaging about ${daily.toLocaleString()} steps a day. Large studies find most of the health benefit is reached at around 7,000 steps a day.`,
      ],
    }];
  }
  return [{
    id: "steps-below", kind: "suggestion", grade: "moderate", sources: ["dingSteps2025", "paluchSteps2022"],
    title: ["sneak in some steps", "Daily steps"],
    body: [
      `~${daily.toLocaleString()} steps a day lately. aim for ~7,000 (you don't need 10k) — adding 1,000 a day is a good first step`,
      `You're averaging about ${daily.toLocaleString()} steps a day. Benefits rise up to roughly 7,000 steps a day (10,000 isn't necessary); adding 1,000 a day is a realistic start.`,
    ],
  }];
}

function sleepGuidance(week: Day[], input: GuidanceInput): Guidance[] {
  const sleep = values(week, (d) => d.sleep);
  if (sleep.length < MIN_LOGGED_DAYS) return [];
  const hours = Math.round(avg(sleep) * 10) / 10;
  const target = input.isTeen ? SLEEP_TARGETS.teenHours : SLEEP_TARGETS.adultHours;
  if (hours >= target) return [];
  const pcos = input.mode === "pcos";
  return [{
    id: "sleep-short", kind: "suggestion", grade: "guideline",
    sources: [input.isTeen ? "sleepTeens" : "sleepAdults", ...(pcos ? ["sleepInsulin" as const] : [])],
    title: ["sleep's running low", "Sleep"],
    body: [
      `~${hours}h a night this week. ${input.isTeen ? "teens need 8–10h" : "adults need 7h+"}` +
        (pcos ? " — and short sleep worsens insulin resistance, which matters with PCOS" : "") + ". a fixed wake time helps most",
      `You're averaging ${hours} hours a night. ${input.isTeen ? "Teenagers need 8–10 hours" : "Adults need at least 7 hours"}` +
        (pcos ? "; short sleep also worsens insulin resistance, which is relevant to PCOS" : "") + ". A consistent wake time is a good place to start.",
    ],
  }];
}

function ironGuidance(days: Day[]): Guidance[] {
  const heavyDays = within(days, 45).filter((d) => d.heavy).length;
  if (heavyDays < HEAVY_DAYS_FOR_IRON_CHECK) return [];
  const recent = within(days, 14);
  const tiredDays = recent.filter((d) => (d.fatigue ?? 0) >= 7 || (d.energy !== null && d.energy <= 3)).length;
  const foodDays = recent.filter((d) => d.food);
  const ironDays = foodDays.filter((d) => d.food!.foods.includes("IronRich")).length;
  const lowIronFood = foodDays.length >= MIN_LOGGED_DAYS && ironDays / foodDays.length < FOOD_TARGETS.dailyFoodShare;
  const foodLog: [string, string] = lowIronFood
    ? [` (your food log shows iron-rich food on ${ironDays} of ${foodDays.length} days.)`, ` Your food log shows iron-rich food on ${ironDays} of ${foodDays.length} days.`]
    : ["", ""];
  const foods: [string, string] = [
    "iron foods: lentils, beans, spinach, tofu, red meat or fish — with vitamin C (citrus, peppers) and tea/coffee away from meals" + foodLog[0],
    "Iron-rich foods include lentils, beans, leafy greens, tofu, meat and fish. Vitamin C (citrus, peppers) improves absorption; tea and coffee with meals reduce it." + foodLog[1],
  ];
  if (tiredDays >= 3) {
    return [{
      id: "iron-check", kind: "warning", grade: "moderate", sources: ["ironHmbAustralia", "ironHmbFatigue", "odsIron"],
      title: ["heavy periods + tiredness", "Heavy periods and tiredness"],
      body: [
        `you logged ${heavyDays} heavy days and you've been really tired. heavy periods are a common cause of low iron — worth asking a doctor about an iron (ferritin) blood test. ${foods[0]}`,
        `You logged ${heavyDays} heavy-flow days and frequent tiredness. Heavy periods are a common cause of low iron, so consider asking a healthcare provider about an iron (ferritin) blood test. ${foods[1]}`,
      ],
    }];
  }
  return [{
    id: "iron-foods", kind: "suggestion", grade: "moderate", sources: ["ironHmbAustralia", "odsIron"],
    title: ["heavy flow = iron matters", "Heavy flow and iron"],
    body: [
      `${heavyDays} heavy days this period. heavy periods are linked to low iron, and they're worth mentioning to a doctor if they're usual for you. ${foods[0]}`,
      `You logged ${heavyDays} heavy-flow days. Heavy periods are linked to low iron and are worth discussing with a healthcare provider if they're typical for you. ${foods[1]}`,
    ],
  }];
}

function periodPainGuidance(days: Day[], input: GuidanceInput): Guidance[] {
  const painfulPeriodDays = within(days, 45).filter((d) => d.bleeding && (d.pain ?? 0) >= 6).length;
  if (painfulPeriodDays < 2) return [];
  if (input.mode === "endo") {
    return [{
      id: "pain-endo", kind: "suggestion", grade: "limited", sources: ["endoExercise2024", "eshreEndo2022"],
      title: ["what helps endo pain", "Managing endometriosis pain"],
      body: [
        "small trials suggest regular gentle exercise (yoga, walking) may improve endo pain & quality of life — evidence is still thin. heat helps too. if pain isn't controlled, ask about treatment options",
        "Small trials suggest regular gentle exercise such as yoga or walking may improve endometriosis pain and quality of life, though the evidence is limited. Heat can help. If pain isn't controlled, discuss treatment options with your doctor.",
      ],
    }];
  }
  // Vitamin D / omega-3 for period pain live in utils/supplementGuidance.ts (supp-period-pain).
  return [{
    id: "pain-period", kind: "suggestion", grade: "moderate", sources: ["cochraneExerciseDysmenorrhoea"],
    title: ["cramps: what the research says", "Period pain: what helps"],
    body: [
      "regular exercise (about 3x a week, all cycle long) reduced period pain in trials. heat and taking pain relief early help too",
      "In trials, regular exercise (around three sessions a week throughout the cycle) reduced period pain. Heat and taking pain relief early also help.",
    ],
  }];
}

/** Low mood (≤ 2 of 5) in the 7 days before a period, at least 3 times in recent cycles. */
export function hasPremenstrualLowMood(days: Day[], input: GuidanceInput, today: Date): boolean {
  const starts = input.periodStarts.map((s) => parseLocalDate(localDateKey(s))).sort((a, b) => a.getTime() - b.getTime());
  let lowLuteal = 0;
  for (const d of within(days, 75)) {
    if (d.mood === null || d.mood > 2) continue;
    const day = parseLocalDate(d.key);
    const next = starts.find((s) => s > day);
    if (!next || next > today) continue;
    const before = differenceInCalendarDays(next, day);
    if (before >= 1 && before <= 7) lowLuteal++;
  }
  return lowLuteal >= 3;
}

function pmsGuidance(pms: boolean, input: GuidanceInput): Guidance[] {
  if (!pms) return [];
  const supplement: [string, string] = input.isTeen
    ? ["", ""]
    : [
        " one big trial found calcium cut PMS symptoms — dairy, fortified plant milk, tofu & greens are good sources",
        " A large trial found calcium reduced PMS symptoms; dairy, fortified plant milks, tofu and leafy greens are good sources.",
      ];
  return [{
    id: "pms-mood", kind: "suggestion", grade: "moderate", sources: ["calciumPms", "b6Pms"],
    title: ["the pre-period dip", "Premenstrual low mood"],
    body: [
      "your mood keeps dipping in the week before your period. that's a real pattern, not you being dramatic." + supplement[0] +
        ". if it's affecting daily life, a doctor can help — there are good treatments",
      "Your mood is often low in the week before your period." + supplement[1] +
        " If it affects daily life, talk to a healthcare provider; effective treatments are available.",
    ],
  }];
}

/**
 * Food and drink, from the optional food card. Each rule needs ≥ 4 days with a food answer
 * in the window; "how often" rules compare against those logged days only.
 */
function foodGuidance(days: Day[], input: GuidanceInput, pms: boolean): Guidance[] {
  if (input.isTeen) return [];
  const out: Guidance[] = [];
  const week = within(days, 7).filter((d) => d.food);
  const twoWeeks = within(days, 14).filter((d) => d.food);
  const on = (list: Day[], item: FoodItem) => list.filter((d) => d.food!.foods.includes(item)).length;
  const share = (list: Day[], item: FoodItem) => on(list, item) / list.length;
  const enoughWeek = week.length >= MIN_LOGGED_DAYS;
  const mode = input.mode;

  // Fruit & vegetables — WHO ≥ 400 g (≈ 5 portions) a day.
  const portions = values(week, (d) => d.food!.fruitVeg);
  if (portions.length >= MIN_LOGGED_DAYS) {
    const avgPortions = Math.round(avg(portions) * 10) / 10;
    const endoCitrus: [string, string] = mode === "endo"
      ? [" (in a big study, more fruit — especially citrus — was linked to lower endo risk)", " In a large cohort, higher fruit intake, especially citrus, was associated with lower endometriosis risk."]
      : ["", ""];
    if (avgPortions < FOOD_TARGETS.fruitVegPortions) {
      out.push({
        id: "food-fruit-veg", kind: "suggestion", grade: "guideline",
        sources: mode === "endo" ? ["whoHealthyDiet", "harrisFruitEndo"] : ["whoHealthyDiet"],
        title: ["more plants on the plate", "Fruit and vegetables"],
        body: [
          `~${avgPortions} fruit & veg portions a day lately. the WHO goal is 5 (400 g) — one extra at each meal gets you most of the way` + endoCitrus[0],
          `You're averaging ${avgPortions} portions of fruit and vegetables a day. The WHO recommends at least five (400 g); adding one portion per meal closes most of the gap.` + endoCitrus[1],
        ],
      });
    } else {
      out.push({
        id: "food-fruit-veg-met", kind: "positive", grade: "guideline", sources: ["whoHealthyDiet"],
        title: ["5-a-day: done", "Fruit and vegetables"],
        body: [
          `~${avgPortions} portions a day — right on the WHO goal of 5. nice`,
          `You're averaging ${avgPortions} portions a day, meeting the WHO recommendation of five.`,
        ],
      });
    }
  }

  // Wholegrains / pulses — fibre; in PCOS, low-GI and high-fibre eating improves insulin resistance.
  if (enoughWeek && share(week, "Wholegrains") < FOOD_TARGETS.dailyFoodShare) {
    const pcos = mode === "pcos";
    out.push({
      id: "food-fibre", kind: "suggestion", grade: pcos ? "moderate" : "guideline",
      sources: pcos ? ["pcosCarbQuality", "reynoldsFibre"] : ["reynoldsFibre", "whoHealthyDiet"],
      title: ["fibre check", "Wholegrains and pulses"],
      body: [
        `wholegrains or beans/lentils on ${on(week, "Wholegrains")} of ${week.length} days. high-fibre eating is linked to 15–30% lower risk of heart disease, diabetes & early death` +
          (pcos ? " — and in PCOS trials, high-fibre / low-GI meals improved insulin resistance" : "") + ". easy swaps: oats, brown rice, wholemeal bread, dal",
        `You had wholegrains or pulses on ${on(week, "Wholegrains")} of ${week.length} days. Higher fibre intake is associated with 15–30% lower rates of heart disease, type 2 diabetes and early death` +
          (pcos ? "; in PCOS trials, high-fibre and low-GI diets improved insulin resistance" : "") + ". Simple swaps include oats, brown rice, wholemeal bread and lentils.",
      ],
    });
  }

  // Calcium — premenstrual low mood (trial + cohort) or bone health around menopause.
  if ((pms || mode === "peri") && enoughWeek && share(week, "CalciumRich") < FOOD_TARGETS.dailyFoodShare) {
    out.push({
      id: "food-calcium", kind: "suggestion", grade: pms ? "moderate" : "guideline",
      sources: pms ? ["calciumFoodPms", "calciumPms"] : ["namsOsteoporosis2021"],
      title: ["calcium's running low", "Calcium-rich foods"],
      body: [
        `calcium-rich food on ${on(week, "CalciumRich")} of ${week.length} days. ` +
          (pms
            ? "women eating ~4 servings a day of calcium-rich foods had ~40% less PMS in a big study"
            : "around menopause, ~1,200 mg a day helps protect your bones") + " — dairy, fortified plant milk, tofu, almonds, leafy greens",
        `You had calcium-rich food on ${on(week, "CalciumRich")} of ${week.length} days. ` +
          (pms
            ? "In a large cohort, women with about four daily servings of calcium-rich foods had around 40% lower risk of PMS."
            : "Around menopause, about 1,200 mg of calcium a day helps protect bone.") + " Good sources: dairy, fortified plant milks, tofu, almonds and leafy greens.",
      ],
    });
  }

  // Oily fish — 2 fish portions a week, 1 oily; omega-3 links to less period pain and lower endo risk.
  if (twoWeeks.length >= 7 && on(twoWeeks, "OilyFish") === 0) {
    out.push({
      id: "food-oily-fish", kind: "suggestion", grade: "guideline",
      sources: mode === "endo" ? ["nhsFish", "missmerFatEndo", "omega3Dysmenorrhoea"] : ["nhsFish", "omega3Dysmenorrhoea"],
      title: ["omega-3 gap", "Oily fish"],
      body: [
        "no oily fish in 2 weeks of logs. aim for 1 portion a week (salmon, sardines, mackerel); omega-3 is linked to less period pain" +
          (mode === "endo" ? " and lower endo risk" : "") + ". plant-based? walnuts, flax & chia have a different omega-3",
        "No oily fish in two weeks of logs. Guidelines suggest at least one portion a week (salmon, sardines, mackerel); omega-3 is linked to reduced period pain" +
          (mode === "endo" ? " and lower endometriosis risk" : "") + ". Walnuts, flax and chia provide a plant form of omega-3.",
      ],
    });
  }

  // Red & processed meat — WCRF; endo: NHS II red-meat link.
  if (enoughWeek) {
    const red = on(week, "RedMeat");
    const processed = on(week, "ProcessedMeat");
    if (red > FOOD_TARGETS.redMeatDaysPerWeek || processed > FOOD_TARGETS.processedMeatDaysPerWeek) {
      const endo = mode === "endo";
      out.push({
        id: "food-red-meat", kind: "suggestion", grade: endo ? "limited" : "guideline",
        sources: endo ? ["wcrfRedMeat", "redMeatEndo"] : ["wcrfRedMeat"],
        title: ["meat check", "Red and processed meat"],
        body: [
          `red meat on ${red} days, processed meat on ${processed} this week. cancer guidelines say ~3 portions of red meat a week max and very little processed` +
            (endo ? ". in a big study, swapping red meat for fish, eggs or plants was linked to lower endo risk" : "") + ". beans, fish, eggs & tofu are easy swaps",
          `You had red meat on ${red} days and processed meat on ${processed} days this week. Cancer-prevention guidelines advise no more than about three portions of red meat a week and very little processed meat` +
            (endo ? "; in a large cohort, replacing red meat with fish, eggs or plant protein was associated with lower endometriosis risk" : "") + ".",
        ],
      });
    }
  }

  // Fried / fast food — trans fats (WHO; endo: +48% risk with highest trans-fat intake).
  if (enoughWeek && on(week, "Fried") >= FOOD_TARGETS.frequentDaysPerWeek) {
    const endo = mode === "endo";
    out.push({
      id: "food-fried", kind: "suggestion", grade: endo ? "limited" : "guideline",
      sources: endo ? ["whoHealthyDiet", "missmerFatEndo"] : ["whoHealthyDiet"],
      title: ["fried food streak", "Fried and fast food"],
      body: [
        `fried or fast food on ${on(week, "Fried")} days this week. the WHO says limit trans fats (mostly in fried & processed food)` +
          (endo ? " — and the highest trans-fat intake was linked to 48% higher endo risk in one big study" : "") + ". home-cooked swaps count",
        `You had fried or fast food on ${on(week, "Fried")} days this week. The WHO advises limiting trans fats, found mainly in fried and processed foods` +
          (endo ? "; one large cohort linked the highest trans-fat intake with 48% higher endometriosis risk" : "") + ".",
      ],
    });
  }

  // Sugary drinks — WHO free sugars < 10%; PCOS: blood sugar.
  if (enoughWeek && on(week, "SugaryDrinks") >= FOOD_TARGETS.frequentDaysPerWeek) {
    const pcos = mode === "pcos";
    out.push({
      id: "food-sugary-drinks", kind: "suggestion", grade: "guideline",
      sources: pcos ? ["whoHealthyDiet", "pcosCarbQuality"] : ["whoHealthyDiet"],
      title: ["sugary drinks", "Sugary drinks"],
      body: [
        `sugary drinks on ${on(week, "SugaryDrinks")} days this week. they're the easiest place to cut free sugar (WHO: under ~12 tsp a day)` +
          (pcos ? " and they spike blood sugar, which PCOS makes harder to handle" : "") + ". sparkling water with fruit is a solid swap",
        `You had sugary drinks on ${on(week, "SugaryDrinks")} days this week. They're the simplest place to reduce free sugars (WHO: under 10% of energy, about 12 teaspoons a day)` +
          (pcos ? ", and they raise blood sugar quickly, which matters with insulin resistance in PCOS" : "") + ".",
      ],
    });
  }

  // Caffeine — EFSA ≤ 400 mg (≈ 4 coffees); peri: hot-flush trigger.
  const caffeine = values(week, (d) => d.food!.caffeine);
  if (caffeine.length >= MIN_LOGGED_DAYS && avg(caffeine) > FOOD_TARGETS.caffeineDrinks) {
    out.push({
      id: "food-caffeine", kind: "suggestion", grade: "guideline",
      sources: mode === "peri" ? ["efsaCaffeine", "hseHotFlushes"] : ["efsaCaffeine"],
      title: ["caffeine's up there", "Caffeine"],
      body: [
        `~${Math.round(avg(caffeine))} caffeinated drinks a day. the safe limit is ~400 mg (about 4 coffees) — less if pregnant. cutting the afternoon ones helps sleep too` +
          (mode === "peri" ? ", and caffeine can set off hot flushes" : ""),
        `You're averaging about ${Math.round(avg(caffeine))} caffeinated drinks a day. Up to 400 mg (about four cups of coffee) is considered safe for healthy adults, 200 mg in pregnancy` +
          (mode === "peri" ? ". Caffeine can also trigger hot flushes" : "") + ".",
      ],
    });
  }

  // Alcohol — PMS (OR 1.45), endometriosis (moderate intake), hot-flush trigger.
  const alcohol = values(week, (d) => d.food!.alcohol);
  const drinkingDays = alcohol.filter((a) => a > 0).length;
  if (alcohol.length >= MIN_LOGGED_DAYS && drinkingDays >= FOOD_TARGETS.frequentDaysPerWeek) {
    const sources: EvidenceSourceId[] = ["alcoholPms"];
    if (mode === "endo") sources.push("alcoholEndo");
    if (mode === "peri") sources.push("hseHotFlushes");
    out.push({
      id: "food-alcohol", kind: "suggestion", grade: "limited", sources,
      title: ["alcohol & your cycle", "Alcohol"],
      body: [
        `drinks on ${drinkingDays} days this week. studies link alcohol with more PMS (about 45% higher odds)` +
          (mode === "endo" ? " and with endo" : "") + (mode === "peri" ? ", and it's a common hot-flush trigger" : "") +
          ". a few alcohol-free days a week is a good place to start",
        `You had alcohol on ${drinkingDays} days this week. Studies associate alcohol with premenstrual symptoms (about 45% higher odds)` +
          (mode === "endo" ? " and with endometriosis" : "") + (mode === "peri" ? ", and it commonly triggers hot flushes" : "") + ".",
      ],
    });
  }

  // Perimenopause: personal trigger check — hot-flush days vs caffeine / alcohol days.
  if (mode === "peri") {
    const flushDays = within(days, 14).filter((d) => d.hotFlash && d.food);
    const triggered = flushDays.filter((d) => (d.food!.alcohol ?? 0) > 0 || (d.food!.caffeine ?? 0) >= 3).length;
    if (flushDays.length >= 3 && triggered / flushDays.length >= 0.5) {
      out.push({
        id: "food-flush-triggers", kind: "suggestion", grade: "limited", sources: ["hseHotFlushes"],
        title: ["possible hot-flush triggers", "Possible hot-flush triggers"],
        body: [
          `on ${triggered} of your ${flushDays.length} hot-flush days you'd had alcohol or 3+ caffeinated drinks. triggers are personal — try a week with less and see if the log changes`,
          `On ${triggered} of ${flushDays.length} hot-flush days you'd also had alcohol or three or more caffeinated drinks. Triggers vary between people; a week with less of these will show in your log whether it helps.`,
        ],
      });
    }
  }

  return out;
}

function conditionGuidance(days: Day[], input: GuidanceInput): Guidance[] {
  const out: Guidance[] = [];
  if (input.mode === "pcos") {
    out.push({
      id: "pcos-food", kind: "learn", grade: "guideline", sources: ["pcosGuideline2023"],
      title: ["the 'PCOS diet' myth", "Eating with PCOS"],
      body: [
        "the international PCOS guideline found no single diet beats the others. what helps: regular balanced meals, high-fibre / slow-carb foods (oats, beans, wholegrains, veg) and protein — whatever you can stick with",
        "The international PCOS guideline found no specific diet is better than others. Regular balanced meals with high-fibre, slower-release carbohydrates (oats, legumes, wholegrains, vegetables) and protein are a sound approach; choose what you can sustain.",
      ],
    });
    if (!input.isTeen) {
      out.push({
        id: "pcos-supplements", kind: "learn", grade: "limited", sources: ["inositolReview", "vitDPcos2018", "vitDPcos2015"],
        title: ["supplements, honestly", "PCOS supplements: the evidence"],
        body: [
          "inositol is popular but the review behind the 2023 guideline called the evidence limited and inconclusive. vitamin D results are mixed. worth a chat with your doctor, especially if you're low in vitamin D",
          "The review informing the 2023 guideline found the evidence for inositol limited and inconclusive, and vitamin D trials are mixed. Discuss with your doctor, particularly if you may be vitamin D deficient.",
        ],
      });
    }
  }
  if (input.mode === "endo") {
    out.push({
      id: "endo-food", kind: "learn", grade: "limited", sources: ["redMeatEndo", "eshreEndo2022"],
      title: ["food & endo", "Diet and endometriosis"],
      body: [
        "no diet is proven to treat endo. in a study of 80k+ women, eating lots of red meat was linked to higher endo risk, and swapping some for fish, eggs or plants was linked to lower risk. a link, not proof",
        "No diet has been proven to treat endometriosis. In a study of over 80,000 women, high red-meat intake was associated with higher risk, and replacing some with fish, eggs or plant protein with lower risk. This is an association, not proof of benefit.",
      ],
    });
    if (within(days, 30).some((d) => d.bowel)) {
      out.push({
        id: "endo-gut", kind: "suggestion", grade: "limited", sources: ["endoNutritionScoping"],
        title: ["gut symptoms + endo", "Bowel symptoms and diet"],
        body: [
          "you've logged bowel symptoms. small studies found a low-FODMAP diet eased gut symptoms with endo — best tried with a dietitian so you don't cut out too much",
          "You've logged bowel symptoms. Small studies suggest a low-FODMAP diet can ease gut symptoms in endometriosis; it's best done with a dietitian to avoid unnecessary restriction.",
        ],
      });
    }
  }
  if (input.mode === "peri") {
    if (within(days, 14).filter((d) => d.hotFlash).length >= 3) {
      out.push({
        id: "peri-hot-flashes", kind: "suggestion", grade: "guideline", sources: ["namsNonhormone2023"],
        title: ["hot flashes: what actually works", "Hot flushes: effective options"],
        body: [
          "hormone therapy works best; CBT, clinical hypnosis and some non-hormone medicines are proven too. soy, herbal supplements and exercise didn't reliably help hot flashes in reviews. a doctor can talk options",
          "Hormone therapy is the most effective treatment; CBT, clinical hypnosis and some non-hormonal medicines also have good evidence. Reviews found soy, herbal supplements and exercise don't reliably reduce hot flushes. A healthcare provider can discuss options.",
        ],
      });
    }
    out.push({
      id: "peri-bone", kind: "learn", grade: "guideline", sources: ["namsOsteoporosis2021"],
      title: ["protect your bones", "Bone health around menopause"],
      body: [
        "bone loss speeds up around menopause. the menopause society suggests ~1,200 mg calcium a day (food first: dairy, fortified milks, tofu, greens), enough vitamin D, and weight-bearing + strength exercise",
        "Bone loss accelerates around menopause. The Menopause Society recommends about 1,200 mg of calcium daily (from food first: dairy, fortified plant milks, tofu, leafy greens), adequate vitamin D, and weight-bearing and strength exercise.",
      ],
    });
  }
  return out;
}

// ─── main ────────────────────────────────────────────────────────────────────

export function buildLifestyleGuidance(input: GuidanceInput): Guidance[] {
  const today = new Date(input.now === undefined ? Date.now() : input.now);
  const days = toDays(input.entries, today);
  const week = within(days, 7);
  const twoWeeks = within(days, 14);
  // Don't push activity during a flare or a run of severe pain.
  const resting = !!input.inFlare || within(days, 3).some((d) => (d.pain ?? 0) >= 7);

  const pms = hasPremenstrualLowMood(days, input, today);

  const all = [
    ...ironGuidance(days),
    ...activityGuidance(week, twoWeeks, input, resting),
    ...stepsGuidance(week, resting),
    ...sleepGuidance(week, input),
    ...periodPainGuidance(days, input),
    ...pmsGuidance(pms, input),
    ...foodGuidance(days, input, pms),
    ...conditionGuidance(days, input),
  ];
  return all.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}

/**
 * The one item worth a notification: a warning if there is one, otherwise one personal
 * suggestion, rotating daily so food, sleep and activity tips all get a turn. General
 * education is never notified.
 */
export const pickNotifiableGuidance = (items: Guidance[], now: Date | number = Date.now()): Guidance | null => {
  const warning = items.find((g) => g.kind === "warning");
  if (warning) return warning;
  const suggestions = items.filter((g) => g.kind === "suggestion");
  if (suggestions.length === 0) return null;
  const day = Math.floor(new Date(now).getTime() / 86400000);
  return suggestions[day % suggestions.length];
};
