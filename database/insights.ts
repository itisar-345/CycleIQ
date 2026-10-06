/**
 * Personal correlation insights (Spearman + Benjamini–Hochberg).
 */
import { benjaminiHochberg, computeSpearman } from "../utils/statistics";

import type { Tone } from "../store";
import { txFor } from "../utils/tone";
import { createLocalId, execSql, queryAll } from "./connection";
import { parseJsonColumn, type CycleRow, type SymptomEntryRow } from "./types";

/** The parts of extended_symptoms the insight tests read (older entries nest under "pcos"). */
interface ExtendedSymptomFields {
  acne?: string | number;
  anxiety_spike?: boolean;
  cravings?: number | { int?: number };
  pcos?: {
    acne?: { severity?: string | number };
    anxiety_spike?: boolean;
    cravings?: { int?: number };
  };
}
import { getDayOfCycle } from "./phases";

export interface CycleInsight {
  title: string;
  description: string;
  correlation?: number;
  n?: number;
  /** Flare Onset Pattern only: average cycle day flares begin (used to schedule warnings). */
  onsetDay?: number;
  /** True for mood/stress insights — triggers mental health disclaimer on card */
  isMentalHealth?: boolean;
}

/** Classic-tone descriptions by insight title: [positive correlation, negative correlation]. */
const CLASSIC_DESCRIPTIONS: Record<string, [string, string]> = {
  "Sleep & Pain": ["More sleep tends to coincide with higher pain scores.", "Less sleep tends to coincide with higher pain scores."],
  "Stress & Mood": ["Higher stress tends to coincide with higher mood scores.", "Higher stress tends to coincide with lower mood scores."],
  "Sleep & Mood": ["More sleep tends to coincide with better mood.", "More sleep tends to coincide with lower mood."],
  "Movement & Mood": ["More active days tend to be better-mood days.", "More active days tend to coincide with lower mood."],
  "Movement & Energy": ["More exercise tends to coincide with higher energy.", "More exercise tends to coincide with lower energy."],
  "Stress & Pain": ["Higher-stress days tend to have higher pain scores.", "Higher-stress days tend to have lower pain scores."],
  "Stress & Bloating": ["Higher stress tends to coincide with more bloating.", "Higher stress tends to coincide with less bloating."],
  "Stress & Cycle Length": ["Higher stress during a cycle tends to coincide with longer cycles.", "Higher stress during a cycle tends to coincide with shorter cycles."],
  "Cycle Phase & Brain Fog": ["Brain fog tends to be higher later in your cycle.", "Brain fog tends to be higher earlier in your cycle."],
  "Cycle Phase & Energy": ["Energy tends to be higher later in your cycle.", "Energy tends to be higher earlier in your cycle."],
  "Sleep & Skin": ["More sleep tends to coincide with more acne.", "Less sleep tends to coincide with more acne."],
  "Stress & Skin": ["Higher stress tends to coincide with more breakouts.", "Higher stress tends to coincide with fewer breakouts."],
  "Cycle Phase & Cravings": ["Cravings tend to be stronger later in your cycle.", "Cravings tend to be stronger earlier in your cycle."],
  "Sleep & Anxiety": ["More sleep tends to coincide with more anxiety spikes.", "Less sleep tends to coincide with more anxiety spikes."],
  "Sleep & Flare Severity": ["More sleep tends to coincide with more severe flare pain.", "Less sleep tends to coincide with more severe flare pain."],
  "Stress & Flare Severity": ["Higher stress tends to coincide with more severe flare pain.", "Higher stress tends to coincide with less severe flare pain."],
};

export const generateInsights = async (mode: string = "standard", tone: Tone = "chill"): Promise<CycleInsight[]> => {
  const tx = txFor(tone);
  const entries = await queryAll<SymptomEntryRow>(
    `SELECT * FROM symptom_entries ORDER BY logged_date DESC LIMIT 90;`
  );

  // Minimum required days to run correlation
  if (entries.length < 20) {
    return [
      {
        title: tx("patterns loading\u2026 \ud83d\udd0d", "Insights are on their way"),
        description: tx(
          `Log ${20 - entries.length} more day${20 - entries.length === 1 ? "" : "s"} and we'll start spotting what affects what \u2014 like whether bad sleep means worse pain for you. You're doing great.`,
          `Log ${20 - entries.length} more day${20 - entries.length === 1 ? "" : "s"} to unlock personal insights, such as how sleep relates to pain.`,
        )
      }
    ];
  }

  const insights: CycleInsight[] = [];

  // Series are oldest-first; null = not logged that day (never imputed as 0).
  type Series = (number | null)[];
  const getSeries = <K extends keyof SymptomEntryRow>(
    key: K,
    parser: (val: SymptomEntryRow[K]) => number | null,
  ): Series => entries.map((e) => parser(e[key])).reverse();
  const getExtendedSeries = (parser: (v: ExtendedSymptomFields | null) => number | null): Series =>
    entries.map((e) => parser(parseJsonColumn<ExtendedSymptomFields>(e.extended_symptoms))).reverse();
  const toNumber = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const cycles = await queryAll<CycleRow>(`SELECT * FROM cycles ORDER BY start_date DESC;`);
  const cyclesDict: Record<string, CycleRow> = Object.fromEntries(cycles.map((c) => [c.id, c]));

  const docSeries: Series = entries.map((e) => {
      if (!e.cycle_id || !cyclesDict[e.cycle_id]) return null;
      return getDayOfCycle(e.logged_date, cyclesDict[e.cycle_id].start_date);
  }).reverse();

  const cycleLengthSeries: Series = entries.map((e) => {
      if (!e.cycle_id || !cyclesDict[e.cycle_id]) return null;
      return toNumber(cyclesDict[e.cycle_id].cycle_length);
  }).reverse();

  const sleepScore = getSeries("sleep_hours", toNumber);
  const painScore = getSeries("pain_score", toNumber);
  const moodScore = getSeries("mood_score", toNumber);
  const stressScore = getSeries("stress_score", toNumber);
  const exerciseScore = getSeries("exercise_duration", toNumber);
  const energyScore = getSeries("energy_score", toNumber);
  const brainFogScore = getSeries("brain_fog_score", toNumber);
  const bloatingScore = getSeries("bloating", (v) => {
     if (v === 'Severe') return 3;
     if (v === 'Moderate') return 2;
     if (v === 'Mild') return 1;
     if (v === 'None') return 0;
     return null;
  });

  // Run every test first, then keep only those surviving a false-discovery-rate
  // correction across all of them — testing ~10–14 pairs at p < 0.05 each would
  // otherwise surface a spurious "pattern" for many users.
  interface Candidate {
    title: string;
    descPos: string;
    descNeg: string;
    isMentalHealth: boolean;
    correlation: number;
    pValue: number;
    n: number;
  }
  const candidates: Candidate[] = [];
  const test = (x: Series, y: Series, title: string, descPos: string, descNeg: string, isMentalHealth = false) => {
     const xs: number[] = [];
     const ys: number[] = [];
     for (let i = 0; i < x.length; i++) {
        const a = x[i], b = y[i];
        if (a !== null && b !== null) { xs.push(a); ys.push(b); }
     }
     const cor = computeSpearman(xs, ys);
     if (cor.n >= 20) {
        candidates.push({ title, descPos, descNeg, isMentalHealth, correlation: cor.correlation, pValue: cor.pValue, n: cor.n });
     }
  };

  // Standard Correlations (Section 8)
  if (mode !== "endo") test(sleepScore, painScore, "Sleep & Pain", "Plot twist: more sleep tends to show up with higher pain for you — maybe pain is keeping you in bed?", "Less sleep tends to mean more pain the next day for you. Sleep = pain relief, apparently 😴");
  test(stressScore, moodScore, "Stress & Mood", "Interesting — higher stress tends to come with a better mood for you. Busy-but-thriving era?", "When stress goes up, your mood tends to dip. Not a coincidence 🫠", true);
  test(sleepScore, moodScore, "Sleep & Mood", "More sleep tends to = better mood for you. Protect that bedtime 🌙", "More sleep tends to show up on lower-mood days — could be low mood making you want to sleep more 💛", true);
  test(exerciseScore, moodScore, "Movement & Mood", "Days you move more tend to be better-mood days. Even a walk counts 🚶", "More movement tends to come with lower mood for you — maybe you're pushing too hard on rough days?", true);
  test(exerciseScore, energyScore, "Movement & Energy", "Moving more tends to come with more energy for you ⚡", "More movement tends to show up with lower energy — rest days might be your friend.");
  if (mode !== "endo") test(stressScore, painScore, "Stress & Pain", "Stressful days tend to be more painful days for you 😮‍💨", "Interesting — your pain tends to be lower on stressful days.");
  test(stressScore, bloatingScore, "Stress & Bloating", "Stress tends to show up as bloat for you 🎈", "You tend to bloat less on stressful days.");
  test(stressScore, cycleLengthSeries, "Stress & Cycle Length", "Stressful cycles tend to run longer for you — stress can delay ovulation.", "Stressful cycles tend to be shorter for you.");
  test(docSeries, brainFogScore, "Cycle Phase & Brain Fog", "Brain fog tends to roll in later in your cycle ☁️", "Brain fog tends to hit earlier in your cycle ☁️");
  test(docSeries, energyScore, "Cycle Phase & Energy", "Your energy tends to climb later in your cycle ⚡", "Your energy tends to peak earlier in your cycle ⚡");

  if (mode === "pcos") {
    const acneScore = getExtendedSeries((v) => {
        if (!v) return null;
        const acne = v.acne ?? v.pcos?.acne?.severity;
        if (acne === undefined || acne === null) return null;
        return acne === 'Severe' || acne === 3 ? 3 : acne === 'Moderate' || acne === 2 ? 2 : acne === 'Mild' || acne === 1 ? 1 : 0;
    });
    const anxietyScore = getExtendedSeries((v) => (v ? ((v.anxiety_spike || v.pcos?.anxiety_spike) ? 1 : 0) : null));
    const cravingScore = getExtendedSeries((v) => {
        if (!v) return null;
        if (typeof v.cravings === 'number') return v.cravings;
        return toNumber(v.cravings?.int ?? v.pcos?.cravings?.int);
    });

    test(sleepScore, acneScore, "Sleep & Skin", "More sleep tends to show up with more breakouts — weird, but that's what your logs say.", "Less sleep tends to = more breakouts for you. Beauty sleep is real 💤");
    test(stressScore, acneScore, "Stress & Skin", "Stress tends to show up on your skin 😩", "Your skin tends to be clearer on stressful days — interesting.");
    test(docSeries, cravingScore, "Cycle Phase & Cravings", "Cravings tend to ramp up later in your cycle 🍫 (totally normal)", "Cravings tend to hit earlier in your cycle 🍫");
    test(sleepScore, anxietyScore, "Sleep & Anxiety", "More sleep tends to come with more anxiety spikes — anxiety might be wiping you out 💛", "Less sleep tends to mean more anxiety spikes for you 💛", true);
  }

  if (mode === "endo") {
     const flareCount = entries.filter(e => e.flare_start).length;

     if (flareCount >= 5) {
        const onsetDays: number[] = [];
        for (const e of entries) {
            const cycle = e.cycle_id ? cyclesDict[e.cycle_id] : undefined;
            if (e.flare_start && cycle) onsetDays.push(getDayOfCycle(e.logged_date, cycle.start_date));
        }
        if (onsetDays.length > 0) {
            const avgOnset = Math.round(onsetDays.reduce((a,b)=>a+b,0) / onsetDays.length);
            insights.push({
               title: "Flare Onset Pattern",
               onsetDay: avgOnset,
               description: tx(`Your flares usually kick off around cycle day ${avgOnset}. Plan a softer few days around then if you can 💜`, `Your flares most often begin around cycle day ${avgOnset}. Consider planning lighter days around then.`)
            });
        }
     }

     test(sleepScore, painScore, "Sleep & Flare Severity", "More sleep tends to show up on worse flare days — flares can knock you out.", "Less sleep tends to come with worse flare pain for you 💜");
     test(stressScore, painScore, "Stress & Flare Severity", "Stress tends to make your flares hit harder 💜", "Your flare pain tends to be lower on stressful days.");
  }

  const significant = benjaminiHochberg(candidates.map((c) => c.pValue), 0.1);
  candidates.forEach((c, i) => {
     if (!significant[i] || Math.abs(c.correlation) <= 0.3) return;
     insights.push({
        title: c.title,
        description: tx(
          c.correlation > 0 ? c.descPos : c.descNeg,
          (CLASSIC_DESCRIPTIONS[c.title] ?? [c.descPos, c.descNeg])[c.correlation > 0 ? 0 : 1],
        ),
        correlation: Math.round(c.correlation * 100) / 100,
        n: c.n,
        isMentalHealth: c.isMentalHealth,
     });
  });

  return insights;
};

// Persist computed insights and retire stale ones (older than 90 days or weakened below threshold)
export const persistAndRetireInsights = async (freshInsights: CycleInsight[]): Promise<void> => {
  const now = new Date().toISOString();
  // Upsert fresh insights
  for (const insight of freshInsights) {
    const existing = await execSql(
      `SELECT id FROM user_correlations WHERE title = ?;`, [insight.title]
    );
    if (existing.rows.length > 0) {
      await execSql(
        `UPDATE user_correlations SET correlation = ?, n = ?, generated_at = ? WHERE title = ?;`,
        [insight.correlation ?? null, insight.n ?? null, now, insight.title]
      );
    } else {
      await execSql(
        `INSERT INTO user_correlations (id, title, correlation, n, generated_at) VALUES (?,?,?,?,?);`,
        [createLocalId(), insight.title, insight.correlation ?? null, insight.n ?? null, now]
      );
    }
  }
  // Retire insights not present in fresh batch that are older than 90 days
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  await execSql(
    `DELETE FROM user_correlations WHERE generated_at < ?;`, [cutoff]
  );
};
