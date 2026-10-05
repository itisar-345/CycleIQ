/**
 * User-facing wording for the Daily Log — casual, warm, a bit Gen Z.
 *
 * Rules of the voice:
 * - Friendly and low-pressure ("no wrong answers"), never shaming.
 * - Playful for everyday stuff; plain and caring for pain, safety and anything medical.
 * - Option `value`s are stored data — only ever change the `label`.
 */
import type { Option } from "@/components/log/inputs";

const opt = (value: string, label: string): Option => ({ value, label });

const pick = (v: number, bands: [number, string][]): string => {
  for (const [upTo, text] of bands) if (v <= upTo) return text;
  return bands[bands.length - 1][1];
};

/** Friendly phase framing. Hedged on purpose — everyone's body is different. */
export const PHASE_COPY: Record<string, { name: string; vibe: string; hint: string }> = {
  menstrual: { name: "period", vibe: "rest era 🩸", hint: "Energy's often lower right now — cozy is allowed." },
  follicular: { name: "follicular", vibe: "glow-up phase 🌱", hint: "Estrogen's rising — lots of people feel more energetic & social." },
  ovulatory: { name: "ovulation", vibe: "peak energy ✨", hint: "Around your most fertile days. Confidence often peaks too." },
  luteal: { name: "luteal", vibe: "cozy season 🍂", hint: "PMS can creep in — snacks, sleep & softness help." },
};

export const MODE_BADGE: Record<string, string> = {
  standard: "cycle mode 🗓️",
  pcos: "PCOS mode 💚",
  pcod: "PCOD mode 💙",
  endo: "endo mode 💜",
  peri: "peri mode 🌙",
  teen: "teen mode 🌱",
};

export const Captions = {
  pain: (v: number) =>
    pick(v, [
      [0, "no pain — love that for you ✨"],
      [3, "a lil twinge, manageable"],
      [6, "ok that's real 😮‍💨"],
      [8, "rough. be extra gentle with yourself 🫶"],
      [10, "that's severe — please don't tough this out alone 💛"],
    ]),
  energy: (v: number) =>
    pick(v, [
      [2, "running on fumes 🪫"],
      [4, "low battery"],
      [6, "mid battery"],
      [8, "pretty charged ⚡"],
      [10, "main character energy 🔋"],
    ]),
  brainFog: (v: number) =>
    pick(v, [
      [2, "crystal clear 💎"],
      [5, "a lil hazy"],
      [8, "foggy up there ☁️"],
      [10, "full-on fog machine 🌫️"],
    ]),
  fatigue: (v: number) =>
    pick(v, [
      [2, "feeling fresh 🌿"],
      [5, "a bit tired"],
      [8, "pretty wiped 😴"],
      [10, "absolutely drained — rest is productive too"],
    ]),
  sleepHours: (v: number) =>
    pick(v, [
      [4, "not enough sleep fr 😵‍💫"],
      [6, "a bit short"],
      [9, "solid sleep 😌"],
      [12, "big sleep energy 💤"],
    ]),
  sleepQuality: (v: number) =>
    pick(v, [
      [1, "trash sleep 🗑️"],
      [2, "meh sleep"],
      [3, "it was okay"],
      [4, "good sleep"],
      [5, "slept like a baby 👶"],
    ]),
  stress: (v: number) =>
    pick(v, [
      [1, "chill 🧊"],
      [2, "mostly fine"],
      [3, "a lil stressed"],
      [4, "stressed 😮‍💨"],
      [5, "maxed out 🤯 — try a 2-min breather?"],
    ]),
};

export const Options = {
  painLocations: [
    opt("Pelvic", "pelvic / lower belly"),
    opt("Lower back", "lower back"),
    opt("Head", "head"),
    opt("Legs", "legs"),
    opt("Neck/shoulders", "neck & shoulders"),
    opt("Chest", "chest"),
    opt("Other", "somewhere else"),
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
    opt("Dissociated", "zoned out 😶‍🌫️"),
    opt("Angry", "angry 😡"),
  ],
  bloating: [
    opt("None", "nope"),
    opt("Mild", "a lil"),
    opt("Moderate", "noticeable"),
    opt("Severe", "full balloon 🎈"),
  ],
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
    opt("Small", "small (pea-ish)"),
    opt("Medium", "medium (grape-ish)"),
    opt("Large", "large (bigger than a coin)"),
  ],
  clotSizeWithNone: [
    opt("None", "none"),
    opt("Small", "small (pea-ish)"),
    opt("Medium", "medium (grape-ish)"),
    opt("Large", "large (bigger than a coin)"),
  ],
  exercise: [
    opt("None", "rest day 🛋️"),
    opt("Walking", "walk 🚶"),
    opt("Yoga", "yoga 🧘"),
    opt("Running", "run 🏃"),
    opt("Cycling", "cycle 🚲"),
    opt("Strength", "lift 🏋️"),
  ],
  exerciseFromHealth: opt("Health activity", "from your Health app ⌚"),
  bowel: [
    opt("Constipation", "constipated"),
    opt("Diarrhoea", "diarrhoea"),
    opt("Pain", "pain when pooping"),
    opt("Bleeding", "bleeding"),
  ],
  bladder: [
    opt("Pain", "pain when peeing"),
    opt("Frequency", "peeing a lot"),
    opt("Urgency", "gotta-go urgency"),
    opt("Blood", "blood in pee"),
  ],
  shoulder: [opt("None", "nope"), opt("Left", "left"), opt("Right", "right"), opt("Both", "both")],
  flareMovement: [
    opt("Normal", "moving normal"),
    opt("Limited", "kinda limited"),
    opt("Bed-bound", "bed-bound 🛏️"),
  ],
  acneLocations: [opt("face", "face"), opt("back", "back"), opt("chest", "chest")],
  weight: [opt("Gaining", "going up"), opt("Losing", "going down"), opt("Stable", "pretty stable")],
  cravings: [opt("sugar", "sweet 🍫"), opt("carbs", "carbs 🍞"), opt("salty", "salty 🍟"), opt("general", "everything 🫠")],
  sleepDisruption: [opt("nightmares", "bad dreams"), opt("insomnia", "couldn't fall asleep"), opt("waking", "kept waking up")],
  hotFlashTime: [
    opt("Morning", "morning 🌅"),
    opt("Afternoon", "afternoon ☀️"),
    opt("Evening", "evening 🌆"),
    opt("Night", "night 🌙"),
  ],
};

export const SeverityLabels = {
  generic: ["none", "a little", "noticeable", "a lot"] as [string, string, string, string],
  acne: ["clear ✨", "a few spots", "breaking out", "bad flare-up"] as [string, string, string, string],
  cravings: ["none", "a little", "strong", "can't stop thinking about it"] as [string, string, string, string],
  hotFlash: ["barely", "mild", "sweaty", "intense 🥵"] as [string, string, string, string],
};
