import { useAppStore } from "@/store";
import { addDays, format } from "date-fns";
import Constants from "expo-constants";
import type { PredictionResult } from "./predictions";

const isExpoGo = Constants.executionEnvironment === "storeClient";

// Lazy-load expo-notifications so the module never executes in Expo Go
const getNotifications = () => import("expo-notifications");

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

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (isExpoGo) return false;
  try {
    const N = await getNotifications();
    const { status } = await N.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
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

const scheduleAt = async (id: string, title: string, body: string, date: Date, hour = 9) => {
  if (isExpoGo || date <= new Date()) return;
  try {
    const N = await getNotifications();
    await N.scheduleNotificationAsync({
      identifier: id,
      content: { title, body },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate(), safeHour(hour), 0),
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
  await scheduleAt("period-reminder", "Period due soon 🩸", "Your next period is predicted to start in ~2 days. Stay prepared!", addDays(predictedStartDate, -2));
};

export const scheduleDailyLogReminder = async (enabled: boolean, hourOfDay = 20) => {
  if (isExpoGo) return;
  try {
    await cancelId("daily-log");
    if (!enabled) return;
    const N = await getNotifications();
    await N.scheduleNotificationAsync({
      identifier: "daily-log",
      content: { title: "Daily check-in 📋", body: "30 seconds to log today's symptoms — your future self will thank you 💕" },
      trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour: safeHour(hourOfDay), minute: 0 },
    });
  } catch { /* non-fatal */ }
};

export const scheduleInsightNotification = async (insightTitle: string, enabled: boolean) => {
  if (isExpoGo || !enabled) return;
  try {
    const N = await getNotifications();
    await N.scheduleNotificationAsync({
      identifier: `insight-${Date.now()}`,
      content: { title: "✨ New pattern spotted!", body: `We noticed: "${insightTitle}". Tap to explore.` },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 5000) },
    });
  } catch { /* non-fatal */ }
};

export const scheduleOvulationReminder = async (cycleStartDate: Date, cycleLength: number, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("ovulation-window");
  if (!enabled) return;
  const ovulationDate = addDays(cycleStartDate, cycleLength - 14 - 1);
  await scheduleAt("ovulation-window", "Ovulation window approaching 🌸", `Predicted ovulation around ${format(ovulationDate, "MMM d")}. Your energy is about to peak!`, addDays(ovulationDate, -1));
};

export const scheduleFlareWarning = async (predictedFlareDate: Date, confidence: number, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("flare-warning");
  if (!enabled || confidence < 0.7) return;
  await scheduleAt("flare-warning", "Possible flare approaching 💜", `A flare may be coming around ${format(predictedFlareDate, "MMM d")}. Be gentle with yourself 🫶`, addDays(predictedFlareDate, -1));
};

export const schedulePadReminder = async (predictedStartDate: Date, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("pad-reminder");
  if (!enabled) return;
  await scheduleAt("pad-reminder", "Time to stock up! 🛍️", "Your period is ~5 days away — grab your supplies before you need them 💕", addDays(predictedStartDate, -5));
};

export const scheduleHydrationNudge = async (predictedStartDate: Date, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("hydration-nudge");
  if (!enabled) return;
  await scheduleAt("hydration-nudge", "Drink up 💧", "Your period is ~3 days away. Staying hydrated now can reduce bloating & cramps 🌊", addDays(predictedStartDate, -3));
};

export const scheduleAntiInflammatoryReminder = async (predictedStartDate: Date, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("anti-inflam-food");
  if (!enabled) return;
  await scheduleAt("anti-inflam-food", "Eat to beat cramps 🥑", "Period in ~2 days! Load up on anti-inflammatory foods: salmon, walnuts, leafy greens, berries 🍫", addDays(predictedStartDate, -2), 12);
};

export const scheduleHeatPadReminder = async (predictedStartDate: Date, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("heat-pad");
  if (!enabled) return;
  await scheduleAt("heat-pad", "Heat pad time 🔥", "Your period may be starting today! Grab your heat pad — 20 mins can ease cramps 💪", predictedStartDate, 8);
};

export const scheduleMoodCheckIn = async (cycleStartDate: Date, cycleLength: number, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("mood-checkin");
  if (!enabled) return;
  await scheduleAt("mood-checkin", "How are you feeling? 💭", "You're in your luteal phase — mood dips are normal. Log how you're feeling 🫶", addDays(cycleStartDate, cycleLength - 7), 18);
};

export const schedulePeriodDayNotifications = async (periodStartDate: Date, enabled: boolean) => {
  if (isExpoGo) return;
  const ids = ["pd1-am","pd1-pm","pd2-am","pd2-pm","pd3-am","pd3-pm","pd4-am","pd4-pm","pd5-am","pd5-pm"];
  await Promise.all(ids.map(cancelId));
  if (!enabled) return;
  const d = (n: number) => addDays(periodStartDate, n);
  await scheduleAt("pd1-am", "Day 1 🩸 You've got this", "Grab your heat pad 🔥, take ibuprofen if needed & sip warm ginger tea. Be gentle with yourself 🤍", d(0), 8);
  await scheduleAt("pd1-pm", "Evening comfort ritual 🛁", "A warm bath with Epsom salts can relax your muscles tonight 💕", d(0), 19);
  await scheduleAt("pd2-am", "Fuel up 🥩", "Day 2 — eat iron-rich foods & pair with OJ to absorb 3x more iron 🍊", d(1), 9);
  await scheduleAt("pd2-pm", "Magnesium magic ✨", "Snack on dark chocolate, almonds or avocado — magnesium relaxes uterine muscles 🍫", d(1), 20);
  await scheduleAt("pd3-am", "Hydrate & energise 💧", "Day 3 — drink 8+ glasses of water to reduce bloating 🌴", d(2), 9);
  await scheduleAt("pd3-pm", "Iron top-up 🌿", "Pumpkin seeds, dark chocolate & fortified cereals — halfway through, you're crushing it 💪", d(2), 18);
  await scheduleAt("pd4-am", "Gentle movement 🧘‍♀️", "Light yoga or a short walk can boost your mood & reduce lingering cramps 🌸", d(3), 9);
  await scheduleAt("pd4-pm", "Treat yourself 🍿", "Tonight is for your fave comfort food, a feel-good movie, or a face mask 💖", d(3), 19);
  await scheduleAt("pd5-am", "Almost done! 🌟", "Day 5 — keep eating iron-rich foods & stay hydrated ✨", d(4), 9);
  await scheduleAt("pd5-pm", "You did it! 🎉", "Last day! Celebrate with something you love tonight 💕", d(4), 19);
};

export const scheduleEndoNotifications = async (prediction: PredictionResult, enabled: boolean) => {
  if (isExpoGo || prediction.model === "none") return;
  const ids = ["endo-pre3","endo-pre1","endo-d1-am","endo-d1-pm","endo-d2-am","endo-d2-pm","endo-d3-am","endo-d3-pm","endo-d4-am","endo-d4-pm","endo-d5-am","endo-d5-pm","endo-post1","endo-post3","endo-mid","endo-flare-pre"];
  await Promise.all(ids.map(cancelId));
  if (!enabled) return;
  const base = prediction.predictedStartISO ? new Date(prediction.predictedStartISO) : new Date();
  const d = (n: number) => addDays(base, n);
  const cycleLength = prediction.mean;
  await scheduleAt("endo-pre3", "Endo prep: 3 days to go 💜", "Start anti-inflammatory protocol: turmeric, ginger, omega-3s, leafy greens 🌿", d(-3), 9);
  await scheduleAt("endo-pre1", "Stock comfort kit 🧸", "Period tomorrow! Heat pad 🔥, TENS, pain meds, comfy clothes & snacks ready? 💜", d(-1), 10);
  await scheduleAt("endo-d1-am", "Endo Day 1 💜 Pain first-aid", "Take pain meds BEFORE cramps peak. Heat pad on abdomen + lower back 🤍", d(0), 8);
  await scheduleAt("endo-d1-pm", "Evening: bowel care 🌿", "Stay hydrated, avoid dairy & gluten if triggers. Warm peppermint tea can ease bloating 🍵", d(0), 19);
  await scheduleAt("endo-d2-am", "Pace yourself 🛌", "Day 2 is often hardest. Rest is medicine. Log your pain score 📊", d(1), 9);
  await scheduleAt("endo-d2-pm", "Anti-inflam dinner 🥑", "Try salmon, sweet potato & steamed greens. Avoid alcohol & processed sugar 🚫", d(1), 18);
  await scheduleAt("endo-d3-am", "Bladder care 💧", "Drink plenty of water, avoid caffeine & try a warm compress 🌿", d(2), 9);
  await scheduleAt("endo-d3-pm", "Gentle stretch 🧘‍♀️", "Child's pose or supine twist can release pelvic tension 🌸", d(2), 19);
  await scheduleAt("endo-d4-am", "Energy returning? ✨", "Keep up iron-rich foods: lentils, spinach, tofu & pumpkin seeds 💪", d(3), 9);
  await scheduleAt("endo-d4-pm", "Emotional check-in 💭", "Endo is exhausting physically AND emotionally. Log your mood tonight 🫶", d(3), 20);
  await scheduleAt("endo-d5-am", "Almost through it 🌟", "Keep hydrating & eating well. Note anything new for your doctor 📝", d(4), 9);
  await scheduleAt("endo-d5-pm", "You are so strong 💜", "You made it through another endo period. Rest tonight 🌸", d(4), 19);
  await scheduleAt("endo-post1", "Recovery day 🌿", "Endo fatigue can linger. Ease back slowly. Prioritise sleep 💤", d(6), 9);
  await scheduleAt("endo-post3", "Reintroduce gently 🧘‍♀️", "Try a gentle walk or restorative yoga today 🌸", d(8), 9);
  const ovDay = prediction.ovulationPainDay ?? cycleLength - 14;
  await scheduleAt("endo-mid", "Ovulation pain heads-up 💜", `Cycle day ${ovDay}: mittelschmerz possible. Heat pad ready 🌸`, d(ovDay - 2), 9);
  const flareDay = prediction.flareRiskWindowStart ?? cycleLength - 7;
  await scheduleAt("endo-flare-pre", "Reduce triggers 🚫", `Pre-flare window day ${flareDay}. Cut stress/alcohol/inflammatory foods, prioritize sleep 💜`, d(flareDay), 10);
};

export const schedulePcosNotifications = async (prediction: PredictionResult, enabled: boolean) => {
  if (isExpoGo || prediction.model === "none") return;
  const ids = ["pcos-d35","pcos-d60","pcos-d90","pcos-pred-wide","pcos-insulin-d3","pcos-insulin-d7","pcos-supplement-am","pcos-supplement-d14","pcos-ovulation-watch","pcos-stress-pre","pcos-skin-d5","pcos-hair-d10","pcos-post-reset","pcos-log-nudge"];
  await Promise.all(ids.map(cancelId));
  if (!enabled) return;
  const base = new Date();
  const d = (n: number) => addDays(base, n);
  const cycleLength = prediction.mean;
  if (prediction.pcosCyclePattern !== "regular") await scheduleAt("pcos-d35", "PCOS: 35 days no period 💚", "35 days since last period. Log symptoms daily to spot your pattern 📊", d(35));
  await scheduleAt("pcos-d60", "60 days — checking in 💚", "Still no period after 60 days. Worth mentioning to your doctor if unusual 🫶", d(60), 10);
  await scheduleAt("pcos-d90", "90 days — check in with your doctor 💬", "We recommend speaking with your healthcare provider 💜", d(90), 9);
  if (prediction.widePredictionWindow) await scheduleAt("pcos-pred-wide", "Wide prediction window 📅", `Next period in ~${Math.round(prediction.stdDev * 2)}d window. Keep pads handy 💕`, addDays(base, prediction.lateArrivalP90 ?? 35));
  await scheduleAt("pcos-insulin-d3", "Blood sugar & PCOS 🥑", "Eat protein + healthy fat with every meal — eggs, avocado, nuts & seeds 🌿", d(3), 9);
  await scheduleAt("pcos-insulin-d7", "Low-GI eating 🍎", "Oats, lentils, berries, sweet potato help reduce insulin spikes ✨", d(7), 12);
  await scheduleAt("pcos-supplement-am", "PCOS supplement check 💚", "Inositol, vitamin D & magnesium are most evidence-backed for PCOS 🌿", d(2), 8);
  await scheduleAt("pcos-supplement-d14", "Spearmint tea 🌿", "2 cups of spearmint tea daily can reduce androgens in PCOS ✨", d(14), 19);
  const ovWatchDay = prediction.predictedOvulationDay ?? Math.max(10, cycleLength - 18);
  await scheduleAt("pcos-ovulation-watch", "Ovulation signs watch 🌸", `Day ${ovWatchDay}: watch egg-white mucus, temp rise, energy boost 📊`, d(ovWatchDay));
  await scheduleAt("pcos-stress-pre", "Stress affects your cycle 🧘‍♀️", "High cortisol can delay ovulation. Try 10 mins of deep breathing today 💚", d(Math.max(7, cycleLength - 14)), 18);
  await scheduleAt("pcos-skin-d5", "PCOS skin care 🧖‍♀️", "Post-period oestrogen is rising — great time for skincare! Log your skin today 📊", d(5), 9);
  await scheduleAt("pcos-hair-d10", "Hair & androgen tip 💇‍♀️", "Androgens are lower now — good time for a scalp massage with rosemary oil 🌿", d(10), 19);
  await scheduleAt("pcos-post-reset", "Hormone reset window ✨", "Period just ended — oestrogen rising. Best window for exercise & big tasks 🌊", d(6), 9);
  await scheduleAt("pcos-log-nudge", "Log every day this week 📝", "Consistent logging is how we learn YOUR pattern. Even 30 seconds counts 💪", d(4), 20);
};

export const scheduleRedFlagNotification = async (prediction: PredictionResult, enabled: boolean) => {
  if (isExpoGo) return;
  await cancelId("red-flag");
  if (!enabled) return;
  const daysSinceLast = prediction.daysSinceLastPeriod ?? 0;
  let title = "", body = "", daysFromNow = 0;
  if (prediction.amenorrheaFlag && daysSinceLast > 60) {
    title = "🚨 Medical Check Recommended";
    body = `No period for ${daysSinceLast} days. Please consult your healthcare provider 💜`;
  } else if (prediction.widePredictionWindow && prediction.stdDev > 10) {
    title = "⚠️ Very High Cycle Variability";
    body = `Your prediction window is ${Math.round(prediction.stdDev * 2)}+ days wide. Consider discussing with your doctor.`;
    daysFromNow = 1;
  } else if (prediction.regimeChangeDetected) {
    title = "⚠️ Sudden Pattern Shift";
    body = "Your cycle pattern has shifted significantly. Consider tracking triggers closely.";
    daysFromNow = 2;
  } else if (prediction.confidence < 0.4) {
    title = "⚠️ Low Prediction Confidence";
    body = `Confidence is only ${Math.round(prediction.confidence * 100)}%. Keep logging symptoms.`;
    daysFromNow = 3;
  } else return;
  await scheduleAt("red-flag", title, body, new Date(Date.now() + daysFromNow * 86400000), 10);
};

export const scheduleAllCycleNotifications = async (
  prediction: PredictionResult | null,
  actualPeriodStart?: Date | null,
): Promise<void> => {
  if (isExpoGo || !prediction || prediction.model === "none") return;
  const prefs = useAppStore.getState().notificationPrefs;
  const { currentMode } = useAppStore.getState();
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
    if (currentMode === "endo" && prefs.endoDayTips) await scheduleEndoNotifications(prediction, prefs.endoDayTips);
    if (currentMode === "pcos" && prefs.pcosNotifications) await schedulePcosNotifications(prediction, prefs.pcosNotifications);
    await scheduleRedFlagNotification(prediction, prefs.redFlagAlerts ?? true);
  }
};
