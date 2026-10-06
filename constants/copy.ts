/**
 * Shared wording for the Daily Log, phases and modes, in both voices (see utils/tone.ts).
 *
 * Rules:
 * - chill: friendly, low-pressure, emoji. classic: plain, calm, clear.
 * - Pain, safety and anything medical say the same thing in both voices.
 * - Option `value`s are stored data — only ever change the labels.
 */
import type { Option } from "@/components/log/inputs";
import { useAppStore, type Tone } from "@/store";
import { useMemo } from "react";

type Band = [upTo: number, chill: string, classic: string];

const buildCopy = (tone: Tone) => {
  const c = <T,>(chill: T, classic: T): T => (tone === "classic" ? classic : chill);
  const opt = (value: string, chill: string, classic: string = value): Option => ({ value, label: c(chill, classic) });
  const band = (bands: Band[]) => (v: number): string => {
    for (const [upTo, chill, classic] of bands) if (v <= upTo) return c(chill, classic);
    const last = bands[bands.length - 1];
    return c(last[1], last[2]);
  };
  const four = (chill: string[], classic: string[]) => c(chill, classic) as [string, string, string, string];

  return {
    /** Phase framing. Hedged on purpose — everyone's body is different. */
    phases: {
      menstrual: {
        name: c("period", "Menstrual"),
        vibe: c("rest era 🩸", "Menstrual phase"),
        hint: c("Energy's often lower right now — cozy is allowed.", "Energy is often lower during your period. Rest when you can."),
      },
      follicular: {
        name: c("follicular", "Follicular"),
        vibe: c("glow-up phase 🌱", "Follicular phase"),
        hint: c("Estrogen's rising — lots of people feel more energetic & social.", "Estrogen is rising. Many people feel more energetic in this phase."),
      },
      ovulatory: {
        name: c("ovulation", "Ovulation"),
        vibe: c("peak energy ✨", "Ovulatory phase"),
        hint: c("Around your most fertile days. Confidence often peaks too.", "This is around your most fertile time. Energy often peaks."),
      },
      luteal: {
        name: c("luteal", "Luteal"),
        vibe: c("cozy season 🍂", "Luteal phase"),
        hint: c("PMS can creep in — snacks, sleep & softness help.", "PMS symptoms may appear. Sleep, regular meals and rest can help."),
      },
    } as Record<string, { name: string; vibe: string; hint: string }>,

    modeBadge: {
      standard: c("cycle mode 🗓️", "Cycle tracking"),
      pcos: c("PCOS mode 💚", "PCOS"),
      pcod: c("PCOD mode 💙", "PCOD"),
      endo: c("endo mode 💜", "Endometriosis"),
      peri: c("peri mode 🌙", "Perimenopause"),
      teen: c("teen mode 🌱", "Teen"),
    } as Record<string, string>,

    captions: {
      pain: band([
        [0, "no pain — love that for you ✨", "No pain"],
        [3, "a lil twinge, manageable", "Mild pain"],
        [6, "ok that's real 😮‍💨", "Moderate pain"],
        [8, "rough. be extra gentle with yourself 🫶", "Severe pain — please take care of yourself"],
        [10, "that's severe — please don't tough this out alone 💛", "Very severe pain — please don't manage this alone"],
      ]),
      energy: band([
        [2, "running on fumes 🪫", "Very low energy"],
        [4, "low battery", "Low energy"],
        [6, "mid battery", "Moderate energy"],
        [8, "pretty charged ⚡", "Good energy"],
        [10, "main character energy 🔋", "High energy"],
      ]),
      brainFog: band([
        [2, "crystal clear 💎", "Clear-headed"],
        [5, "a lil hazy", "Slightly foggy"],
        [8, "foggy up there ☁️", "Foggy"],
        [10, "full-on fog machine 🌫️", "Very foggy"],
      ]),
      fatigue: band([
        [2, "feeling fresh 🌿", "Not tired"],
        [5, "a bit tired", "A little tired"],
        [8, "pretty wiped 😴", "Very tired"],
        [10, "absolutely drained — rest is productive too", "Exhausted — rest is important"],
      ]),
      sleepHours: band([
        [4, "not enough sleep fr 😵‍💫", "Short sleep"],
        [6, "a bit short", "A little short"],
        [9, "solid sleep 😌", "Healthy amount of sleep"],
        [12, "big sleep energy 💤", "Long sleep"],
      ]),
      sleepQuality: band([
        [1, "trash sleep 🗑️", "Very poor"],
        [2, "meh sleep", "Poor"],
        [3, "it was okay", "Okay"],
        [4, "good sleep", "Good"],
        [5, "slept like a baby 👶", "Excellent"],
      ]),
      stress: band([
        [1, "chill 🧊", "Very low"],
        [2, "mostly fine", "Low"],
        [3, "a lil stressed", "Moderate"],
        [4, "stressed 😮‍💨", "High"],
        [5, "maxed out 🤯 — try a 2-min breather?", "Very high — a short breathing break may help"],
      ]),
    },

    options: {
      painLocations: [
        opt("Pelvic", "pelvic / lower belly", "Pelvic / lower abdomen"),
        opt("Lower back", "lower back"),
        opt("Head", "head"),
        opt("Legs", "legs"),
        opt("Neck/shoulders", "neck & shoulders", "Neck / shoulders"),
        opt("Chest", "chest"),
        opt("Other", "somewhere else", "Other"),
      ],
      painTypes: [
        opt("Cramping", "crampy 🌀"),
        opt("Stabbing", "stabby 🔪"),
        opt("Aching", "achy"),
        opt("Burning", "burning 🔥"),
        opt("Pressure", "heavy pressure"),
        opt("Throbbing", "throbbing 💥"),
      ],
      moodTags: [
        opt("Anxious", "anxious 😬"),
        opt("Irritable", "snappy 😤"),
        opt("Low", "low 🌧️"),
        opt("Hopeful", "hopeful 🌱"),
        opt("Stable", "steady ⚖️"),
        opt("Overwhelmed", "overwhelmed 🫠"),
        opt("Calm", "calm 🧘"),
        opt("Tearful", "teary 🥲"),
        opt("Dissociated", "zoned out 😶‍🌫️", "Detached"),
        opt("Angry", "angry 😡"),
      ],
      bloating: [opt("None", "nope"), opt("Mild", "a lil"), opt("Moderate", "noticeable"), opt("Severe", "full balloon 🎈")],
      flow: [
        opt("None", "none"),
        opt("Spotting", "spotting"),
        opt("Light", "light"),
        opt("Medium", "medium"),
        opt("Heavy", "heavy"),
        opt("Very Heavy", "super heavy 🌊"),
      ],
      flowTeen: [opt("None", "none"), opt("Light", "light"), opt("Medium", "medium"), opt("Heavy", "heavy")],
      clotSize: [
        opt("Small", "small (pea-ish)", "Small (pea-sized)"),
        opt("Medium", "medium (grape-ish)", "Medium (grape-sized)"),
        opt("Large", "large (bigger than a coin)", "Large (larger than a coin)"),
      ],
      clotSizeWithNone: [
        opt("None", "none"),
        opt("Small", "small (pea-ish)", "Small (pea-sized)"),
        opt("Medium", "medium (grape-ish)", "Medium (grape-sized)"),
        opt("Large", "large (bigger than a coin)", "Large (larger than a coin)"),
      ],
      exercise: [
        opt("None", "rest day 🛋️", "None"),
        opt("Walking", "walk 🚶"),
        opt("Yoga", "yoga 🧘"),
        opt("Running", "run 🏃"),
        opt("Cycling", "cycle 🚲"),
        opt("Strength", "lift 🏋️", "Strength training"),
      ],
      exerciseFromHealth: opt("Health activity", "from your Health app ⌚", "From Health app"),
      bowel: [
        opt("Constipation", "constipated"),
        opt("Diarrhoea", "diarrhoea"),
        opt("Pain", "pain when pooping", "Painful bowel movements"),
        opt("Bleeding", "bleeding", "Rectal bleeding"),
      ],
      bladder: [
        opt("Pain", "pain when peeing", "Painful urination"),
        opt("Frequency", "peeing a lot", "Frequent urination"),
        opt("Urgency", "gotta-go urgency", "Urgency"),
        opt("Blood", "blood in pee", "Blood in urine"),
      ],
      shoulder: [opt("None", "nope", "None"), opt("Left", "left"), opt("Right", "right"), opt("Both", "both")],
      flareMovement: [
        opt("Normal", "moving normal", "Normal"),
        opt("Limited", "kinda limited", "Limited"),
        opt("Bed-bound", "bed-bound 🛏️", "Bed-bound"),
      ],
      acneLocations: [opt("face", "face", "Face"), opt("back", "back", "Back"), opt("chest", "chest", "Chest")],
      weight: [opt("Gaining", "going up", "Increasing"), opt("Losing", "going down", "Decreasing"), opt("Stable", "pretty stable", "Stable")],
      cravings: [
        opt("sugar", "sweet 🍫", "Sweet"),
        opt("carbs", "carbs 🍞", "Carbohydrates"),
        opt("salty", "salty 🍟", "Salty"),
        opt("general", "everything 🫠", "General"),
      ],
      sleepDisruption: [
        opt("nightmares", "bad dreams", "Nightmares"),
        opt("insomnia", "couldn't fall asleep", "Trouble falling asleep"),
        opt("waking", "kept waking up", "Waking during the night"),
      ],
      hotFlashTime: [
        opt("Morning", "morning 🌅"),
        opt("Afternoon", "afternoon ☀️"),
        opt("Evening", "evening 🌆"),
        opt("Night", "night 🌙"),
      ],
    },

    severity: {
      generic: four(["none", "a little", "noticeable", "a lot"], ["None", "Mild", "Moderate", "Severe"]),
      acne: four(["clear ✨", "a few spots", "breaking out", "bad flare-up"], ["Clear", "Mild", "Moderate", "Severe"]),
      cravings: four(["none", "a little", "strong", "can't stop thinking about it"], ["None", "Mild", "Strong", "Very strong"]),
      hotFlash: four(["barely", "mild", "sweaty", "intense 🥵"], ["Very mild", "Mild", "Moderate", "Severe"]),
    },
  };
};

export type Copy = ReturnType<typeof buildCopy>;

const cache: Partial<Record<Tone, Copy>> = {};
export const getCopy = (tone: Tone): Copy => (cache[tone] ??= buildCopy(tone));

/** Copy for the user's current tone; re-renders when it changes. */
export const useCopy = (): Copy => {
  const tone = useAppStore((s) => s.tone);
  return useMemo(() => getCopy(tone), [tone]);
};
