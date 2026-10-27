/**
 * Evidence-based supplement tips, each tied to the point in the cycle where it matters, and
 * the plan for when to notify about them. Pure (no database, no UI) so every rule is tested.
 *
 * Research and grading: docs/EVIDENCE_REVIEW.md §6. Ground rules on top of
 * utils/lifestyleGuidance.ts:
 * - Adults only. Teens get no supplement content.
 * - A dose is named only where a guideline or regulator names one (folic acid, vitamin D,
 *   calcium). Iron never: it should follow a blood test, and the dose is a clinician's call.
 * - Food first wherever food can cover the need.
 * - Each tip says who it is for and when to ask a clinician first.
 */
import { addDays } from "date-fns";
import { HEAVY_DAYS_FOR_IRON_CHECK } from "../data/evidence";
import type { Guidance, GuidanceInput } from "./lifestyleGuidance";
import { hasPremenstrualLowMood, toDays, within } from "./lifestyleGuidance";

export interface SupplementTip extends Guidance {
  /** When to notify: days from the predicted period start (negative = before), at this hour. */
  notify: { offsetDays: number; hour: number };
}

export interface SupplementInput extends GuidanceInput {
  /** Flips the vitamin D "darker months" window. Defaults to northern. */
  southernHemisphere?: boolean;
}

/** Every id a supplement notification can use, so they can all be cancelled. */
export const SUPPLEMENT_TIP_IDS = [
  "supp-folic-acid",
  "supp-iron",
  "supp-period-pain",
  "supp-calcium-pms",
  "supp-peri-bone",
  "supp-vitamin-d",
] as const;

/** NHS: supplement from October to early March (northern hemisphere); April–September in the south. */
export const isLowSunMonth = (date: Date, southernHemisphere = false): boolean => {
  const m = date.getMonth();
  const northernWinter = m >= 9 || m <= 2;
  return southernHemisphere ? !northernWinter : northernWinter;
};

const SOUTHERN_TIME_ZONES = /^(Australia|Antarctica)\/|^Pacific\/(Auckland|Chatham|Fiji|Tongatapu|Apia|Noumea|Efate)|^America\/(Argentina|Santiago|Sao_Paulo|Montevideo|Asuncion|La_Paz|Lima)|^Africa\/(Johannesburg|Maputo|Harare|Lusaka|Windhoek|Gaborone|Maseru|Mbabane|Blantyre|Lubumbashi)|^Indian\/(Mauritius|Reunion|Antananarivo)/;

/** Best guess from the device time zone. No location is read. */
export const isSouthernHemisphereTimeZone = (timeZone?: string): boolean => {
  try {
    return SOUTHERN_TIME_ZONES.test(timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
  } catch {
    return false;
  }
};

export function buildSupplementGuidance(input: SupplementInput): SupplementTip[] {
  if (input.isTeen) return [];
  const today = new Date(input.now === undefined ? Date.now() : input.now);
  const days = toDays(input.entries, today);
  const mode = input.mode;
  const out: SupplementTip[] = [];

  // Heavy periods → iron, but only after a blood test. Sent on day 2 of the period.
  const heavyDays = within(days, 45).filter((d) => d.heavy).length;
  if (heavyDays >= HEAVY_DAYS_FOR_IRON_CHECK) {
    out.push({
      id: "supp-iron", kind: "suggestion", grade: "moderate", sources: ["odsIron", "stoffelIron2017", "whoIronMenstruating2011"],
      notify: { offsetDays: 1, hour: 12 },
      title: ["iron: test before you take it", "Iron supplements: test first"],
      body: [
        "heavy periods can drain iron, but don't start iron tablets without a ferritin blood test — too much iron is harmful. if a doctor says take it: every other day absorbed better than daily in trials, take it with vitamin C, and keep tea, coffee, milk & calcium ~2 hours away",
        "Heavy periods can lower iron, but don't start iron supplements without a ferritin blood test; excess iron is harmful. If a clinician advises iron, trials found it was absorbed better taken every other day than daily. Take it with vitamin C, and keep tea, coffee, milk and calcium supplements about two hours apart from it.",
      ],
    });
  }

  // Painful periods → vitamin D and omega-3 (primary dysmenorrhoea only). Sent 5 days before.
  const painfulPeriodDays = within(days, 45).filter((d) => d.bleeding && (d.pain ?? 0) >= 6).length;
  if (painfulPeriodDays >= 2 && mode !== "endo") {
    out.push({
      id: "supp-period-pain", kind: "suggestion", grade: "moderate", sources: ["vitDDysmenorrhoea", "omega3Dysmenorrhoea", "zincDysmenorrhoea2024", "odsZinc"],
      notify: { offsetDays: -5, hour: 18 },
      title: ["cramps era incoming — supplements?", "Supplements and period pain"],
      body: [
        "your last periods hit hard. in trials, vitamin D, omega-3 (fish oil) and zinc all eased period pain — but they were taken for 2–3 months, so it's a long game, not a same-day fix. works for regular cramps, not endo pain. zinc: low doses (even ~7 mg) helped, never go over 40 mg a day. ask a pharmacist about doses, esp. if you're on blood thinners",
        "Your recent periods have been painful. In trials, vitamin D, omega-3 (fish oil) and zinc supplements reduced period pain, but they were taken for two to three months, so they are longer-term options rather than same-day remedies. The benefit was for period pain without an underlying cause, not endometriosis. For zinc, low doses (around 7 mg) helped; don't exceed 40 mg a day in total. Ask a pharmacist or doctor about suitable doses, especially if you take blood thinners.",
      ],
    });
  }

  // Premenstrual low mood → calcium (ACOG), and a B6 safety note. Sent as the luteal phase starts.
  if (hasPremenstrualLowMood(days, input, today)) {
    out.push({
      id: "supp-calcium-pms", kind: "suggestion", grade: "moderate", sources: ["acogPmd2023", "calciumPms", "tgaB6"],
      notify: { offsetDays: -10, hour: 18 },
      title: ["calcium for PMS", "Calcium for premenstrual symptoms"],
      body: [
        "the PMS window is coming up. ACOG suggests 1,000–1,200 mg calcium a day for PMS (low-quality evidence, but low risk). count food first — a glass of milk or fortified plant milk is ~300 mg — and only top up the gap. in the big trial it was taken every day and helped by cycle 3. skip high-dose B6: regulators link even <50 mg/day to nerve damage, and it hides in magnesium products",
        "Your premenstrual phase is approaching. ACOG suggests 1,000–1,200 mg of calcium a day for premenstrual symptoms (a conditional recommendation based on low-quality evidence). Count food first (a glass of milk or fortified plant milk has about 300 mg) and supplement only the gap. In the main trial it was taken daily, with benefit by the third cycle. Avoid high-dose vitamin B6: regulators have linked even under 50 mg a day to nerve damage, and it is often included in magnesium products.",
      ],
    });
  }

  if (mode === "peri") {
    // Bone: calcium + vitamin D (Menopause Society). Sent after the period, once a cycle.
    out.push({
      id: "supp-peri-bone", kind: "suggestion", grade: "guideline", sources: ["namsOsteoporosis2021"],
      notify: { offsetDays: 6, hour: 9 },
      title: ["calcium & vitamin D check", "Calcium and vitamin D"],
      body: [
        "bone check: aim for ~1,200 mg calcium a day — count your food first and only supplement the gap (extra from tablets adds no benefit and can raise kidney-stone risk). vitamin D: 800–1,000 IU (20–25 µg) a day is the usual advice",
        "For bone health around menopause, aim for about 1,200 mg of calcium a day. Count what you eat first and supplement only the gap; more from supplements adds no benefit and may raise kidney-stone risk. The usual vitamin D recommendation is 800–1,000 IU (20–25 µg) a day.",
      ],
    });
  } else {
    // Folic acid: anyone who could become pregnant (USPSTF grade A). Sent after the period.
    out.push({
      id: "supp-folic-acid", kind: "suggestion", grade: "guideline", sources: ["uspstfFolicAcid2023"],
      notify: { offsetDays: 6, hour: 9 },
      title: ["folic acid, if pregnancy's possible", "Folic acid if you could become pregnant"],
      body: [
        "if you could get pregnant — planned or not — guidelines say take 400–800 µg folic acid every day, starting at least a month before. it protects against brain & spine birth defects, and food alone usually isn't enough. not planning & on reliable contraception? ask your doctor if it's worth it for you",
        "If you could become pregnant, planned or not, guidelines recommend a daily folic acid supplement of 400–800 µg, starting at least a month before conception. It protects against brain and spine birth defects, and diet alone is usually not enough. If you use reliable contraception and aren't planning a pregnancy, ask your doctor whether you need it.",
      ],
    });
    // Vitamin D in the darker months (NHS). Peri mode covers it in the bone tip.
    if (isLowSunMonth(today, input.southernHemisphere)) {
      out.push({
        id: "supp-vitamin-d", kind: "suggestion", grade: "guideline", sources: ["nhsVitaminD", ...(mode === "pcos" ? (["vitDPcos2018"] as const) : [])],
        notify: { offsetDays: 13, hour: 9 },
        title: ["vitamin D season", "Vitamin D in autumn and winter"],
        body: [
          "in autumn & winter the sun's too weak for your skin to make enough vitamin D. NHS advice: 10 µg (400 IU) a day — all year if you have dark skin, cover up outdoors or rarely get outside. don't go over 100 µg a day" +
            (mode === "pcos" ? ". low vitamin D is common with PCOS too" : ""),
          "In autumn and winter, sunlight is too weak for your skin to make enough vitamin D. The NHS advises 10 µg (400 IU) a day, and all year if you have dark skin, cover most of your skin outdoors or rarely go outside. Don't exceed 100 µg (4,000 IU) a day." +
            (mode === "pcos" ? " Low vitamin D is common in PCOS." : ""),
        ],
      });
    }
  }

  return out;
}

type GuideEntry = Guidance & { modes?: string[] };

/**
 * Reference guide: what the research says about each commonly used supplement, good or bad.
 * Shown in Insights, never notified. Condition-only entries carry `modes`.
 */
const SUPPLEMENT_GUIDE: GuideEntry[] = [
  {
    id: "guide-iron", kind: "learn", grade: "moderate", sources: ["odsIron", "ironHmbAustralia", "stoffelIron2017"],
    title: ["iron", "Iron"],
    body: [
      "heavy periods are the #1 reason young women run low on iron (tired, breathless, cold hands). but only supplement if a ferritin test says you're low — extra iron is harmful. if you do: every other day, with vitamin C, away from tea/coffee/milk",
      "Heavy periods are a leading cause of low iron, which causes tiredness and breathlessness. Supplement only if a ferritin blood test shows you are low; excess iron is harmful. If advised to take it, alternate days, with vitamin C and away from tea, coffee and dairy, improve absorption.",
    ],
  },
  {
    id: "guide-folic-acid", kind: "learn", grade: "guideline", sources: ["uspstfFolicAcid2023"],
    title: ["folic acid", "Folic acid"],
    body: [
      "the one with the strongest evidence of all: 400–800 µg a day if you could get pregnant, starting a month before. prevents brain & spine birth defects",
      "The supplement with the strongest evidence: 400–800 µg daily for anyone who could become pregnant, starting at least a month before conception, to prevent brain and spine birth defects.",
    ],
  },
  {
    id: "guide-vitamin-d", kind: "learn", grade: "guideline", sources: ["nhsVitaminD", "vitDDysmenorrhoea"],
    title: ["vitamin D", "Vitamin D"],
    body: [
      "10 µg (400 IU) a day in autumn/winter, all year if you've got dark skin or barely go outside. bonus: trials found less period pain. max 100 µg a day — more isn't better",
      "10 µg (400 IU) a day in autumn and winter, and all year with dark skin or little time outdoors. Trials also found reduced period pain. Don't exceed 100 µg a day.",
    ],
  },
  {
    id: "guide-omega-3", kind: "learn", grade: "moderate", sources: ["omega3Dysmenorrhoea", "nhsFish"],
    title: ["omega-3 (fish oil)", "Omega-3 (fish oil)"],
    body: [
      "linked to less period pain and fewer painkillers in trials. food first: 1 portion of oily fish a week (salmon, sardines, mackerel). supplements thin the blood a bit — check first if you're on blood thinners",
      "Trials link omega-3 to less period pain and painkiller use. Food first: at least one portion of oily fish a week. Supplements have a mild blood-thinning effect, so check with a pharmacist if you take anticoagulants.",
    ],
  },
  {
    id: "guide-zinc", kind: "learn", grade: "limited", sources: ["zincDysmenorrhoea2024", "odsZinc"],
    title: ["zinc", "Zinc"],
    body: [
      "6 trials found less period pain, even at ~7 mg a day, after 2+ months. small studies hint at better insulin with PCOS. the catch: over 40 mg a day for long drains your copper. meat, shellfish, seeds & beans have it too",
      "Six trials found less period pain, even at around 7 mg a day, after two or more months; small trials suggest better insulin sensitivity in PCOS. Evidence is low-certainty. Over 40 mg a day long-term causes copper deficiency. Meat, shellfish, seeds and pulses are good sources.",
    ],
  },
  {
    id: "guide-calcium", kind: "learn", grade: "moderate", sources: ["acogPmd2023", "calciumPms", "namsOsteoporosis2021"],
    title: ["calcium", "Calcium"],
    body: [
      "1,000–1,200 mg a day can ease PMS (ACOG backs it, evidence is so-so) and protects bones around menopause. count dairy/fortified milk/tofu first, top up only the gap. take it 2 hours away from iron",
      "1,000–1,200 mg a day may ease premenstrual symptoms (ACOG, conditional) and protects bone around menopause. Count food first and supplement only the gap. Take it two hours apart from iron.",
    ],
  },
  {
    id: "guide-magnesium", kind: "learn", grade: "limited", sources: ["cochraneSupplementsDysmenorrhoea", "tgaB6"],
    title: ["magnesium", "Magnesium"],
    body: [
      "super hyped for cramps & PMS, but the reviews say the evidence isn't there yet. low risk at normal doses — just check the label: lots of magnesium products sneak in vitamin B6",
      "Popular for cramps and PMS, but reviews found insufficient evidence. It is low-risk at standard doses, but many magnesium products also contain vitamin B6; check the label.",
    ],
  },
  {
    id: "guide-b6", kind: "learn", grade: "limited", sources: ["b6Pms", "tgaB6"],
    title: ["vitamin B6", "Vitamin B6"],
    body: [
      "maybe helps PMS, but the trials are weak. not worth it at high doses: regulators found nerve damage (tingling, numb hands/feet) even under 50 mg a day. add up B6 across ALL your products",
      "Possible benefit for PMS, but the trials are low quality. Regulators have linked nerve damage (tingling or numbness in hands and feet) to doses under 50 mg a day. Add up B6 across all products you take.",
    ],
  },
  {
    id: "guide-b12", kind: "learn", grade: "guideline", sources: ["odsB12"],
    title: ["vitamin B12", "Vitamin B12"],
    body: [
      "vegan or barely eat animal foods? you need fortified foods or a B12 supplement — plants don't have it. low B12 = tiredness that looks like low iron",
      "If you are vegan or eat few animal foods, you need fortified foods or a B12 supplement; plant foods contain none. Deficiency causes tiredness that can resemble low iron.",
    ],
  },
  {
    id: "guide-ginger-b1", kind: "learn", grade: "limited", sources: ["gingerDysmenorrhoea", "cochraneSupplementsDysmenorrhoea"],
    title: ["ginger & vitamin B1", "Ginger and vitamin B1"],
    body: [
      "ginger matched common painkillers for cramps in small trials, and B1 (thiamine) showed some promise. Cochrane says: interesting, not proven. ginger tea is a low-risk try",
      "In small trials ginger eased period pain about as well as common painkillers, and vitamin B1 showed some promise. A Cochrane review rated the evidence very limited.",
    ],
  },
  {
    id: "guide-turmeric", kind: "learn", grade: "limited", sources: ["curcuminReview2025"],
    title: ["turmeric (curcumin)", "Turmeric (curcumin)"],
    body: [
      "6 of 10 small trials found less PMS / cramps, but they were too different to combine. not proven. avoid if you're on blood thinners",
      "Six of ten small trials reported fewer PMS or period-pain symptoms, but they were too varied to pool. Not established. Avoid with anticoagulants unless a clinician agrees.",
    ],
  },
  {
    id: "guide-vitex", kind: "learn", grade: "limited", sources: ["vitexPms"],
    title: ["chasteberry (vitex)", "Chasteberry (vitex)"],
    body: [
      "trials look good for PMS, but most were biased so the real effect is probably smaller. it messes with hormones: skip if you're on the pill, trying to conceive or pregnant unless a doctor says ok",
      "Trials suggest a benefit for PMS, but most were at high risk of bias, so the true effect is likely smaller. It acts on hormones: avoid with hormonal contraception, fertility treatment or pregnancy unless a clinician advises it.",
    ],
  },
  {
    id: "guide-inositol", kind: "learn", grade: "limited", sources: ["inositolReview", "pcosGuideline2023"], modes: ["pcos", "pcod"],
    title: ["inositol", "Inositol"],
    body: [
      "the PCOS internet fave, but the review behind the 2023 guideline called the evidence limited & inconclusive. fewer tummy side effects than metformin, but metformin did better on some results. talk it through with your doctor",
      "Widely used for PCOS, but the review behind the 2023 guideline found the evidence limited and inconclusive. It has fewer gut side effects than metformin, which performed better on some outcomes. Discuss with your doctor.",
    ],
  },
  {
    id: "guide-nac", kind: "learn", grade: "limited", sources: ["nacPcos"], modes: ["pcos", "pcod"],
    title: ["NAC (N-acetylcysteine)", "N-acetylcysteine (NAC)"],
    body: [
      "small trials found better ovulation & pregnancy rates vs placebo with PCOS, but worse than metformin. only worth it as part of a fertility plan with your doctor",
      "Small trials found improved ovulation and pregnancy rates versus placebo in PCOS, but lower than with metformin. Consider it only as part of a fertility plan with your doctor.",
    ],
  },
  {
    id: "guide-hot-flush-herbals", kind: "learn", grade: "guideline", sources: ["namsNonhormone2023"], modes: ["peri"],
    title: ["soy & herbals for hot flashes", "Soy and herbal remedies for hot flushes"],
    body: [
      "the menopause society does NOT recommend soy, black cohosh or other herbals for hot flashes — they didn't reliably work. there are proven options, ask your doctor",
      "The Menopause Society does not recommend soy, black cohosh or other herbal supplements for hot flushes, as they did not reliably help. Effective treatments are available from your doctor.",
    ],
  },
];

/** The A–Z reference guide for the user's condition. Teens get none. */
export function buildSupplementGuide(input: Pick<GuidanceInput, "mode" | "isTeen">): Guidance[] {
  if (input.isTeen) return [];
  return SUPPLEMENT_GUIDE.filter((g) => !g.modes || g.modes.includes(input.mode)).map(({ modes: _modes, ...g }) => g);
}

export interface SupplementNotification {
  tip: SupplementTip;
  /** The day to notify (the hour is in tip.notify.hour). */
  date: Date;
}

/**
 * One notification per tip, at its offset from the predicted period start. A slot that has
 * already passed moves to the same point in the following cycle.
 */
export function planSupplementNotifications(
  tips: SupplementTip[],
  predictedStartISO: string,
  cycleLength: number,
  now: Date | number = Date.now(),
): SupplementNotification[] {
  const start = new Date(predictedStartISO);
  if (Number.isNaN(start.getTime()) || !(cycleLength > 0)) return [];
  const nowMs = new Date(now).getTime();
  const base = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  return tips.map((tip) => {
    let date = addDays(base, tip.notify.offsetDays);
    // Scheduling happens on a later launch too, so two cycles ahead is plenty.
    for (let i = 0; i < 3 && new Date(date.getFullYear(), date.getMonth(), date.getDate(), tip.notify.hour).getTime() <= nowMs; i++) {
      date = addDays(date, Math.round(cycleLength));
    }
    return { tip, date };
  });
}
