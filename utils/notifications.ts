import { NotificationPrefs, useAppStore } from "@/store";
import { addDays, format } from "date-fns";
import Constants from "expo-constants";
import { LUTEAL_PHASE_DAYS, type PredictionResult } from "./predictions";
import { currentTx, type Tx } from "./tone";

const isExpoGo = Constants.executionEnvironment === "storeClient";

// Lazy-load expo-notifications so the module never executes in Expo Go
const getNotifications = () => import("expo-notifications");
const PERIOD_DAY_IDS = ["pd1-am","pd1-pm","pd2-am","pd2-pm","pd3-am","pd3-pm","pd4-am","pd4-pm","pd5-am","pd5-pm"];
const ENDO_IDS = ["endo-pre3","endo-pre1","endo-d1-am","endo-d1-pm","endo-d2-am","endo-d2-pm","endo-d3-am","endo-d3-pm","endo-d4-am","endo-d4-pm","endo-d5-am","endo-d5-pm","endo-post1","endo-post3","endo-mid","endo-flare-pre"];
const PCOS_IDS = ["pcos-d35","pcos-d60","pcos-d90","pcos-pred-wide","pcos-insulin-d3","pcos-insulin-d7","pcos-supplement-am","pcos-supplement-d14","pcos-ovulation-watch","pcos-stress-pre","pcos-skin-d5","pcos-hair-d10","pcos-post-reset","pcos-log-nudge"];

const initHandler = async () => {
  const N = await getNotifications();
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};
if (!isExpoGo) initHandler();

/** Read-only OS permission check — never prompts. Use on every cold launch and foreground. */
export const hasNotificationPermission = async (): Promise<boolean> => {
  if (isExpoGo) return false;
  try {
    const N = await getNotifications();
    const current = (await N.getPermissionsAsync()) as { granted?: boolean; status?: string };
    return !!(current.granted || current.status === "granted");
  } catch {
    return false;
  }
};

/** Prompts the user if permission has not yet been granted. Use only from explicit user actions. */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (isExpoGo) return false;
  if (await hasNotificationPermission()) return true;
  try {
    const N = await getNotifications();
    const requested = (await N.requestPermissionsAsync()) as { granted?: boolean; status?: string };
    return !!(requested.granted || requested.status === "granted");
  } catch {
    return false;
  }
};

/**
 * Sync scheduled notifications with current OS permission state.
 * Called on every launch and foreground — checks permission only, never prompts.
 */
export const syncNotificationsWithOsPermission = async (
  prediction: PredictionResult | null,
  prefsOverride?: NotificationPrefs,
  modeOverride?: string,
): Promise<void> => {
  const state = useAppStore.getState();
  if (!state.notificationsEnabled) {
    await cancelCycleNotifications();
    return;
  }
  const granted = await hasNotificationPermission();
  if (!granted) {
    await cancelCycleNotifications();
    if (state.notificationsEnabled) {
      state.setNotificationsEnabled(false);
    }
    return;
  }
  await scheduleAllCycleNotifications(
    prediction,
    null,
    prefsOverride ?? state.notificationPrefs,
    modeOverride ?? state.currentMode,
  );
};

const safeHour = (preferredHour: number): number => {
  const { notificationPrefs } = useAppStore.getState();
  const qStart = notificationPrefs?.quietHoursStart ?? 22;
  const qEnd = notificationPrefs?.quietHoursEnd ?? 8;
  const inQuiet =
    qStart > qEnd
      ? preferredHour >= qStart || preferredHour < qEnd
      : preferredHour >= qStart && preferredHour < qEnd;
  return inQuiet ? qEnd : preferredHour;
};

/**
 * Classic-tone wording, keyed by notification id. Chill wording is written inline at
 * each call site; entries with dynamic values pass their classic text as an argument.
 */
const CLASSIC_COPY: Record<string, [title: string, body: string]> = {
  "period-reminder": ["Period expected soon", "Your next period is predicted in about 2 days."],
  "pad-reminder": ["Time to restock", "Your period is about 5 days away. You may want to check your supplies."],
  "hydration-nudge": ["Hydration reminder", "Your period is about 3 days away. Staying hydrated may help with bloating and cramps."],
  "anti-inflam-food": ["Nutrition tip", "Your period is about 2 days away. Oily fish, walnuts, leafy greens and berries may help with inflammation."],
  "heat-pad": ["Heat pad reminder", "Your period may start today. Twenty minutes of heat can ease cramps."],
  "mood-checkin": ["Mood check-in", "You're in your luteal phase, when mood changes are common. Would you like to log how you feel?"],
  "pd1-am": ["Day 1", "Heat, pain relief if needed and a warm drink can help today. Take it easy."],
  "pd1-pm": ["Evening comfort", "A warm bath with Epsom salts may help your muscles relax."],
  "pd2-am": ["Iron and vitamin C", "Day 2: pairing iron-rich food with vitamin C (such as orange juice) helps absorption."],
  "pd2-pm": ["Magnesium", "Dark chocolate, almonds or avocado provide magnesium, which may help with cramps."],
  "pd3-am": ["Hydration", "Day 3: drinking enough water can help reduce bloating."],
  "pd3-pm": ["Iron top-up", "Pumpkin seeds or fortified cereal can help replace iron."],
  "pd4-am": ["Gentle movement", "A short walk or light yoga may lift your mood and ease remaining cramps."],
  "pd4-pm": ["Rest and comfort", "Make time for something relaxing this evening."],
  "pd5-am": ["Day 5", "Keep up iron-rich foods and fluids."],
  "pd5-pm": ["Nearly done", "Your period is likely ending. Well done getting through it."],
  "endo-pre3": ["Endometriosis: 3 days to go", "Anti-inflammatory foods such as turmeric, ginger, oily fish and leafy greens may help."],
  "endo-pre1": ["Prepare your comfort kit", "Your period is likely tomorrow. Heat pad, TENS, medication and comfortable clothes ready?"],
  "endo-d1-am": ["Endometriosis day 1: pain plan", "Pain relief tends to work better taken before cramps peak. Apply heat to your abdomen and lower back."],
  "endo-d1-pm": ["Digestive care", "Warm peppermint tea may ease bloating. Avoid foods you know trigger symptoms."],
  "endo-d2-am": ["Pace yourself", "Day 2 is often the hardest. Rest is part of treatment. Log your pain when you can."],
  "endo-d2-pm": ["Anti-inflammatory dinner", "Oily fish, sweet potato and greens are good choices. Consider avoiding alcohol and added sugar."],
  "endo-d3-am": ["Bladder care", "Drink plenty of water, limit caffeine and try a warm compress."],
  "endo-d3-pm": ["Gentle stretching", "Child's pose or a supine twist can relieve pelvic tension."],
  "endo-d4-am": ["Energy and iron", "Lentils, spinach, tofu and pumpkin seeds help replace iron."],
  "endo-d4-pm": ["Emotional check-in", "Endometriosis is physically and emotionally demanding. How are you feeling?"],
  "endo-d5-am": ["Almost through", "Keep hydrating and eating well. Note anything new to mention to your doctor."],
  "endo-d5-pm": ["Well done", "You've made it through another period. Rest tonight."],
  "endo-post1": ["Recovery day", "Fatigue can linger after your period. Ease back in and prioritise sleep."],
  "endo-post3": ["Gentle return to activity", "A short walk or restorative yoga may help, if you feel up to it."],
  "pcos-d35": ["Day 35 check-in", "It's been 35 days since your last period. Daily logs help identify your pattern."],
  "pcos-d60": ["60 days without a period", "If this is unusual for you, it's worth mentioning to your doctor."],
  "pcos-d90": ["Please see your doctor", "It has been 90 days without a period. Please contact a healthcare provider. Your CycleIQ report can help."],
  "pcos-insulin-d3": ["Blood sugar tip", "Including protein and healthy fat with meals can help keep blood sugar steady."],
  "pcos-insulin-d7": ["Low-GI foods", "Oats, lentils, berries and sweet potato release energy slowly."],
  "pcos-supplement-am": ["Supplements", "Inositol has the most research for PCOS; vitamin D and magnesium may also help. Check with your doctor first."],
  "pcos-supplement-d14": ["Spearmint tea", "Small studies suggest spearmint tea may modestly lower androgens."],
  "pcos-stress-pre": ["Stress and your cycle", "Stress hormones can affect ovulation. A few minutes of deep breathing may help."],
  "pcos-skin-d5": ["Skin check", "After your period is a good time to focus on skincare. Consider logging your skin today."],
  "pcos-hair-d10": ["Scalp care", "Some people find a scalp massage with rosemary oil helpful."],
  "pcos-post-reset": ["Post-period energy", "Energy often improves after your period — a good time for exercise and demanding tasks."],
  "pcos-log-nudge": ["Daily logging", "Logging each day helps CycleIQ learn your pattern. Even 30 seconds helps."],
};

/** Lock-screen-safe content: no health details. */
const discreetContent = (tx: Tx): [string, string] =>
  tx(["CycleIQ", "psst — you've got a reminder"], ["CycleIQ", "You have a new reminder."]);

/** Resolves the title/body actually shown, applying tone and discreet mode. */
export const resolveNotificationContent = (id: string, chill: [string, string], classic?: [string, string]): [string, string] => {
  const { discreetNotifications } = useAppStore.getState();
  const tx = currentTx();
  if (discreetNotifications) return discreetContent(tx);
  return tx(chill, classic ?? CLASSIC_COPY[id] ?? chill);
};

const scheduleAt = async (id: string, title: string, body: string, date: Date, hour = 9, classic?: [string, string]) => {
  if (isExpoGo || Number.isNaN(date.getTime())) return;
  const scheduledDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), safeHour(hour), 0);
  if (scheduledDate <= new Date()) return;
  try {
    const N = await getNotifications();
    const [shownTitle, shownBody] = resolveNotificationContent(id, [title, body], classic);
    await N.scheduleNotificationAsync({
      identifier: id,
      content: { title: shownTitle, body: shownBody },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: scheduledDate,
      },
    });
  } catch { /* non-fatal */ }
};

const cancelId = async (id: string) => {
  if (isExpoGo) return;
  try {
    const N = await getNotifications();
    await N.cancelScheduledNotificationAsync(id).catch(() => {});
  } catch { /* non-fatal */ }
};

export const schedulePeriodReminder = async (predictedStartDate: Date, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("period-reminder");
  if (!enabled) return;
  await scheduleAt("period-reminder", "period incoming", "Heads up — your period's likely in ~2 days. Pads/cups/heat pad on standby?", addDays(predictedStartDate, -2));
};

export const scheduleDailyLogReminder = async (enabled: boolean, hourOfDay = 20) => {
  if (isExpoGo) return;
  try {
    await cancelId("daily-log");
    if (!enabled) return;
    const N = await getNotifications();
    await N.scheduleNotificationAsync({
      identifier: "daily-log",
      content: (([title, body]) => ({ title, body }))(
        resolveNotificationContent("daily-log", ["daily check-in", "30 secs to log how today went — future-you will thank you"], ["Daily check-in", "Take 30 seconds to log how today went."]),
      ),
      trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour: safeHour(hourOfDay), minute: 0 },
    });
  } catch { /* non-fatal */ }
};

/** Removes every scheduled reminder — used when all data is deleted. */
export const cancelAllNotifications = async () => {
  if (isExpoGo) return;
  try {
    const N = await getNotifications();
    await N.cancelAllScheduledNotificationsAsync();
  } catch { /* non-fatal */ }
};

export const cancelCycleNotifications = async () => {
  await Promise.all([
    cancelId("period-reminder"),
    cancelId("daily-log"),
    cancelId("ovulation-window"),
    cancelId("flare-warning"),
    cancelId("pad-reminder"),
    cancelId("hydration-nudge"),
    cancelId("anti-inflam-food"),
    cancelId("heat-pad"),
    cancelId("mood-checkin"),
    cancelId("red-flag"),
    ...PERIOD_DAY_IDS.map(cancelId),
    ...ENDO_IDS.map(cancelId),
    ...PCOS_IDS.map(cancelId),
  ]);
};

export const cancelPredictiveNotifications = async () => {
  await Promise.all([
    cancelId("period-reminder"),
    cancelId("ovulation-window"),
    cancelId("flare-warning"),
    cancelId("pad-reminder"),
    cancelId("hydration-nudge"),
    cancelId("anti-inflam-food"),
    cancelId("heat-pad"),
    cancelId("mood-checkin"),
    cancelId("red-flag"),
    ...PERIOD_DAY_IDS.map(cancelId),
    ...ENDO_IDS.map(cancelId),
    ...PCOS_IDS.map(cancelId),
  ]);
};

export const scheduleInsightNotification = async (insightTitle: string, enabled: boolean) => {
  if (isExpoGo || !enabled) return;
  try {
    const N = await getNotifications();
    await N.scheduleNotificationAsync({
      identifier: `insight-${Date.now()}`,
      content: (([title, body]) => ({ title, body }))(
        resolveNotificationContent(
          "insight",
          ["ooh, new pattern spotted", `We noticed something: "${insightTitle}". Tap to see the tea`],
          ["New insight", `We noticed a pattern: "${insightTitle}". Tap to view.`],
        ),
      ),
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 5000) },
    });
  } catch { /* non-fatal */ }
};

export const scheduleOvulationReminder = async (cycleStartDate: Date, cycleLength: number, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("ovulation-window");
  if (!enabled) return;
  const ovulationDate = addDays(cycleStartDate, cycleLength - LUTEAL_PHASE_DAYS - 1);
  await scheduleAt("ovulation-window", "ovulation szn approaching", `Predicted ovulation around ${format(ovulationDate, "MMM d")}. Energy might be about to peak (it's an estimate — not birth control)`, addDays(ovulationDate, -1), 9, ["Ovulation window approaching", `Ovulation is predicted around ${format(ovulationDate, "MMM d")}. This is an estimate and not suitable for contraception.`]);
};

export const scheduleFlareWarning = async (predictedFlareDate: Date, confidence: number, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("flare-warning");
  if (!enabled || confidence < 0.7) return;
  await scheduleAt("flare-warning", "flare might be coming", `Possible flare around ${format(predictedFlareDate, "MMM d")}. Plan a soft day if you can`, addDays(predictedFlareDate, -1), 9, ["Possible flare ahead", `A flare may occur around ${format(predictedFlareDate, "MMM d")}. Consider planning a lighter day.`]);
};

export const schedulePadReminder = async (predictedStartDate: Date, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("pad-reminder");
  if (!enabled) return;
  await scheduleAt("pad-reminder", "restock check", "Period's ~5 days out — future-you will appreciate the supplies run", addDays(predictedStartDate, -5));
};

export const scheduleHydrationNudge = async (predictedStartDate: Date, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("hydration-nudge");
  if (!enabled) return;
  await scheduleAt("hydration-nudge", "water check", "Period in ~3 days. Staying hydrated may help with bloating & cramps", addDays(predictedStartDate, -3));
};

export const scheduleAntiInflammatoryReminder = async (predictedStartDate: Date, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("anti-inflam-food");
  if (!enabled) return;
  await scheduleAt("anti-inflam-food", "cramp-fighting snacks", "Period in ~2 days. Salmon, walnuts, leafy greens & berries may help calm inflammation", addDays(predictedStartDate, -2), 12);
};

export const scheduleHeatPadReminder = async (predictedStartDate: Date, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("heat-pad");
  if (!enabled) return;
  await scheduleAt("heat-pad", "heat pad era", "Period might start today. 20 mins of heat can take the edge off cramps", predictedStartDate, 8);
};

export const scheduleMoodCheckIn = async (cycleStartDate: Date, cycleLength: number, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("mood-checkin");
  if (!enabled) return;
  await scheduleAt("mood-checkin", "vibe check", "Luteal phase mood dips are real and valid. Wanna log how you're feeling?", addDays(cycleStartDate, cycleLength - 7), 18);
};

export const schedulePeriodDayNotifications = async (periodStartDate: Date, enabled: boolean) => {
  if (isExpoGo) return;
  await Promise.all(PERIOD_DAY_IDS.map(cancelId));
  if (!enabled) return;
  const d = (n: number) => addDays(periodStartDate, n);
  await scheduleAt("pd1-am", "day 1 — you got this", "Heat pad on, pain relief if you need it, warm ginger tea. Go easy on yourself today", d(0), 8);
  await scheduleAt("pd1-pm", "cozy mode", "Warm bath tonight? Epsom salts can help those muscles chill out", d(0), 19);
  await scheduleAt("pd2-am", "fuel up", "Day 2 — iron-rich food + something with vitamin C (like OJ) helps your body absorb the iron", d(1), 9);
  await scheduleAt("pd2-pm", "magnesium moment", "Dark chocolate, almonds or avocado — magnesium may help cramps. Science-approved snacking", d(1), 20);
  await scheduleAt("pd3-am", "hydrate check", "Day 3 — keep the water coming, it can help with bloating", d(2), 9);
  await scheduleAt("pd3-pm", "halfway there", "Pumpkin seeds or fortified cereal for an iron top-up. You're doing amazing", d(2), 18);
  await scheduleAt("pd4-am", "gentle movement?", "A slow walk or light yoga can lift your mood & ease leftover cramps — only if you feel like it", d(3), 9);
  await scheduleAt("pd4-pm", "treat yourself", "Comfort food, fave show, face mask. This is self-care, not being lazy", d(3), 19);
  await scheduleAt("pd5-am", "almost done", "Day 5 — keep the iron & water going", d(4), 9);
  await scheduleAt("pd5-pm", "you did it", "Period (probably) wrapping up. Celebrate with something you love tonight", d(4), 19);
};

export const scheduleEndoNotifications = async (prediction: PredictionResult, enabled: boolean) => {
  if (isExpoGo || prediction.model === "none") return;
  await Promise.all(ENDO_IDS.map(cancelId));
  if (!enabled) return;
  const base = prediction.predictedStartISO ? new Date(prediction.predictedStartISO) : new Date();
  const d = (n: number) => addDays(base, n);
  const cycleLength = prediction.mean;
  await scheduleAt("endo-pre3", "endo prep: 3 days out", "Anti-inflammatory foods may help — turmeric, ginger, omega-3s, leafy greens", d(-3), 9);
  await scheduleAt("endo-pre1", "comfort kit check", "Period likely tomorrow. Heat pad, TENS, meds, comfy fits & snacks — all set?", d(-1), 10);
  await scheduleAt("endo-d1-am", "endo day 1 pain plan", "Taking pain relief before cramps peak tends to work better. Heat on belly + lower back", d(0), 8);
  await scheduleAt("endo-d1-pm", "tummy care", "Warm peppermint tea may ease bloating. Skip any foods you know set you off", d(0), 19);
  await scheduleAt("endo-d2-am", "pace yourself", "Day 2 is often the hardest. Rest is medicine, not a weakness. Log your pain when you can", d(1), 9);
  await scheduleAt("endo-d2-pm", "anti-inflam dinner", "Salmon, sweet potato & greens are great picks. Maybe skip alcohol & sugary stuff tonight", d(1), 18);
  await scheduleAt("endo-d3-am", "bladder care", "Lots of water, go easy on caffeine, and a warm compress can help", d(2), 9);
  await scheduleAt("endo-d3-pm", "gentle stretch", "Child's pose or a supine twist can release pelvic tension. 5 mins counts", d(2), 19);
  await scheduleAt("endo-d4-am", "energy coming back?", "Keep the iron going: lentils, spinach, tofu, pumpkin seeds", d(3), 9);
  await scheduleAt("endo-d4-pm", "feelings check", "Endo is exhausting physically AND emotionally. How are you really doing?", d(3), 20);
  await scheduleAt("endo-d5-am", "almost through", "Keep hydrating & eating well. Jot down anything new for your doctor", d(4), 9);
  await scheduleAt("endo-d5-pm", "you're so strong", "Another endo period survived. Rest up tonight, you earned it", d(4), 19);
  await scheduleAt("endo-post1", "recovery day", "Endo fatigue can hang around. Ease back in & protect your sleep", d(6), 9);
  await scheduleAt("endo-post3", "ease back in", "Gentle walk or restorative yoga today? Only if your body's into it", d(8), 9);
  const ovDay = prediction.ovulationPainDay ?? cycleLength - LUTEAL_PHASE_DAYS;
  await scheduleAt("endo-mid", "ovulation pain heads-up", `Around cycle day ${ovDay} some people get mid-cycle pain. Keep the heat pad close`, d(ovDay - 2), 9, ["Mid-cycle pain", `Around cycle day ${ovDay} some people experience ovulation pain. Keep a heat pad nearby.`]);
  const flareDay = prediction.flareRiskWindowStart ?? cycleLength - 7;
  await scheduleAt("endo-flare-pre", "flare-risk window", `You're near day ${flareDay}, when flares have shown up before. Extra sleep & low stress if you can`, d(flareDay), 10, ["Flare-risk window", `You're near cycle day ${flareDay}, when flares have occurred before. Extra rest may help.`]);
};

export const schedulePcosNotifications = async (prediction: PredictionResult, enabled: boolean) => {
  if (isExpoGo || prediction.model === "none") return;
  await Promise.all(PCOS_IDS.map(cancelId));
  if (!enabled) return;
  const base = new Date();
  const d = (n: number) => addDays(base, n);
  const cycleLength = prediction.mean;
  if (prediction.pcosCyclePattern !== "regular") await scheduleAt("pcos-d35", "day 35 check-in", "35 days since your last period. Daily logs help us learn your pattern", d(35));
  await scheduleAt("pcos-d60", "60 days — checking in", "Still no period after 60 days. Worth bringing up with your doctor if that's unusual for you", d(60), 10);
  await scheduleAt("pcos-d90", "time for a doctor chat", "It's been 90 days without a period — please check in with a healthcare provider. Your report in the app can help", d(90), 9);
  if (prediction.widePredictionWindow) await scheduleAt("pcos-pred-wide", "your cycle's keeping us guessing", `Next period could land anywhere in a ~${Math.round(prediction.stdDev * 2)}-day window. Keep supplies handy`, addDays(base, prediction.lateArrivalP90 ?? 35), 9, ["Wide prediction window", `Your next period could fall anywhere in a ${Math.round(prediction.stdDev * 2)}-day window. Keep supplies handy.`]);
  await scheduleAt("pcos-insulin-d3", "blood sugar tip", "Protein + healthy fat with meals can help keep blood sugar steadier — eggs, avocado, nuts", d(3), 9);
  await scheduleAt("pcos-insulin-d7", "low-GI snack ideas", "Oats, lentils, berries & sweet potato release energy slowly — fewer crashes", d(7), 12);
  await scheduleAt("pcos-supplement-am", "supplement check", "Inositol has the most research for PCOS; vitamin D & magnesium may help too. Ask your doctor first", d(2), 8);
  await scheduleAt("pcos-supplement-d14", "spearmint tea moment", "Small studies suggest spearmint tea may lower androgens a bit. Cozy + maybe helpful", d(14), 19);
  const ovWatchDay = prediction.predictedOvulationDay ?? Math.max(10, cycleLength - LUTEAL_PHASE_DAYS);
  await scheduleAt("pcos-ovulation-watch", "ovulation signs watch", `Around day ${ovWatchDay}: look out for stretchy clear discharge, a temp bump or an energy boost`, d(ovWatchDay), 9, ["Signs of ovulation", `Around day ${ovWatchDay}, look for clear stretchy discharge, a temperature rise or more energy.`]);
  await scheduleAt("pcos-stress-pre", "stress check", "Stress hormones can mess with ovulation. 10 mins of deep breathing today?", d(Math.max(7, cycleLength - LUTEAL_PHASE_DAYS)), 18);
  await scheduleAt("pcos-skin-d5", "skin check", "Post-period is a nice window for skincare. Log your skin today", d(5), 9);
  await scheduleAt("pcos-hair-d10", "scalp care tip", "Some people like a scalp massage with rosemary oil for hair health. Optional self-care", d(10), 19);
  await scheduleAt("pcos-post-reset", "main character window", "Period just ended — energy often picks up now. Good time for workouts & big tasks", d(6), 9);
  await scheduleAt("pcos-log-nudge", "log streak this week?", "Daily logs are how we learn YOUR pattern. Even 30 seconds counts", d(4), 20);
};

export const scheduleRedFlagNotification = async (prediction: PredictionResult, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("red-flag");
  if (!enabled) return;
  const daysSinceLast = prediction.daysSinceLastPeriod ?? 0;
  const tx = currentTx();
  let title = "", body = "", daysFromNow = 0;
  if (prediction.amenorrheaFlag && daysSinceLast > 60) {
    [title, body] = tx(
      ["please check in with a doctor", `It's been ${daysSinceLast} days without a period. That's worth a proper check-up — you can share your CycleIQ report`],
      ["Medical check recommended", `You haven't had a period for ${daysSinceLast} days. Please see a healthcare provider; your CycleIQ report can help.`],
    );
  } else if (prediction.widePredictionWindow && prediction.stdDev > 10) {
    [title, body] = tx(
      ["your cycles are all over the place", `Your cycle length is varying a lot (${Math.round(prediction.stdDev * 2)}+ day window). Worth mentioning at your next doctor visit.`],
      ["High cycle variability", `Your cycle length varies a lot (a ${Math.round(prediction.stdDev * 2)}+ day window). Consider mentioning this to your doctor.`],
    );
    daysFromNow = 1;
  } else if (prediction.regimeChangeDetected) {
    [title, body] = tx(
      ["plot twist in your cycle", "Your recent cycles look different from before. Stress, sleep, meds & travel can all do this — keep logging"],
      ["Change in cycle pattern", "Your recent cycles differ from before. Stress, sleep, medication and travel can all contribute."],
    );
    daysFromNow = 2;
  } else if (prediction.confidence < 0.4) {
    [title, body] = tx(
      ["still learning your cycle", "Predictions get sharper with every period you log. Keep it up"],
      ["Predictions are still learning", "Predictions become more accurate with each period you log."],
    );
    daysFromNow = 3;
  } else return;
  await scheduleAt("red-flag", title, body, new Date(Date.now() + daysFromNow * 86400000), 10, [title, body]);
};

export const scheduleAllCycleNotifications = async (
  prediction: PredictionResult | null,
  actualPeriodStart?: Date | null,
  prefsOverride?: NotificationPrefs,
  modeOverride?: string,
): Promise<void> => {
  if (isExpoGo) return;
  const state = useAppStore.getState();
  const prefs = prefsOverride ?? state.notificationPrefs;
  const currentMode = modeOverride ?? state.currentMode;
  if (!state.notificationsEnabled) {
    await cancelCycleNotifications();
    return;
  }
  await scheduleDailyLogReminder(prefs.dailyLog, prefs.dailyLogHour ?? 20);
  if (!prediction || prediction.model === "none") {
    await cancelPredictiveNotifications();
    return;
  }
  const predictedStartDate = prediction.predictedStartISO ? new Date(prediction.predictedStartISO) : null;
  if (predictedStartDate) {
    await schedulePeriodReminder(predictedStartDate, prefs.period);
    await schedulePadReminder(predictedStartDate, prefs.padReminder);
    await scheduleHydrationNudge(predictedStartDate, prefs.hydrationNudge);
    await scheduleAntiInflammatoryReminder(predictedStartDate, prefs.ironFoodReminder);
    await scheduleHeatPadReminder(predictedStartDate, prefs.heatPadReminder);
    const estimatedCycleStart = addDays(predictedStartDate, -prediction.mean);
    await scheduleOvulationReminder(estimatedCycleStart, prediction.mean, prefs.ovulation);
    await scheduleMoodCheckIn(estimatedCycleStart, prediction.mean, prefs.moodCheckIn);
  }
  if (actualPeriodStart) {
    await schedulePeriodDayNotifications(actualPeriodStart, prefs.periodDayTips);
  }
  if (currentMode === "endo") await scheduleEndoNotifications(prediction, prefs.endoDayTips);
  else await Promise.all(ENDO_IDS.map(cancelId));
  if (currentMode === "pcos") await schedulePcosNotifications(prediction, prefs.pcosNotifications);
  else await Promise.all(PCOS_IDS.map(cancelId));
  await scheduleRedFlagNotification(prediction, prefs.redFlagAlerts ?? true);
};
