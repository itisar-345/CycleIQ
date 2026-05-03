import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AppMode = "standard" | "pcos" | "endo" | "peri" | "teen";

export interface PCOSSetup {
  diagnosisStatus: string;
  cyclePattern: string;
  comorbidities: string[];
  currentManagement: string;
}

export interface EndoSetup {
  diagnosisStage: string;
  flareHistory: string;
  painLocations: string[];
  currentManagement: string;
}

export interface NotificationPrefs {
  period: boolean;
  insights: boolean;
  ovulation: boolean;
  flares: boolean;
  padReminder: boolean;
  hydrationNudge: boolean;
  ironFoodReminder: boolean;
  heatPadReminder: boolean;
  periodDayTips: boolean;    // all 5-day morning + evening notifications
  endoDayTips: boolean;      // endo-specific full-cycle notifications
  pcosNotifications: boolean; // pcos-specific cycle & symptom notifications
  moodCheckIn: boolean;
  dailyLogHour: number;
  quietHoursStart: number;
  quietHoursEnd: number;
}

interface AppState {
  isOnboarded: boolean;
  currentMode: AppMode;
  userName: string | null;
  pcosData: PCOSSetup | null;
  endoData: EndoSetup | null;
  inFlare: boolean;
  flareStartDate: string | null;
  flareEndDate: string | null;
  flareReflection: string | null;
  flareDurationDays: number | null;
  dyspareuniaOptIn: boolean;
  activePeriodId: string | null;
  activePeriodStartDate: string | null;
  averageCycleLength: number | null;
  lastPeriodDate: string | null;
  age: number | null;
  gender: string | null;
  language: string;
  languagePreset: "default" | "inclusive" | "custom";
  customTerms: { cycle: string; flow: string; body: string };
  notificationsEnabled: boolean;
  postPillMode: boolean;
  postPillStartDate: string | null;
  pcosWidePrediction: boolean;
  notificationPrefs: NotificationPrefs;
  dismissedInsights: string[];

  consecutiveLowMoodDays: number; // For safeguarding
  lastSafeguardPrompt: string | null; // ISO date for Sec 4.7 cooldown;
  lastRedFlagPrompt: string | null;
  lastPCOSPrompt: string | null;
  isTeen: boolean; // Teen mode trigger

  setOnboarded: (status: boolean) => void;
  setMode: (mode: AppMode) => void;
  setUserName: (name: string) => void;
  setPCOSData: (data: PCOSSetup) => void;
  setEndoData: (data: EndoSetup) => void;
  setInFlare: (status: boolean, startDate?: string) => void;
  setFlareEnd: (endDate: string, reflection: string) => void;
  setDyspareuniaOptIn: (enabled: boolean) => void;
  setPCOSWidePrediction: (enabled: boolean) => void;
  setActivePeriod: (id: string | null, date: string | null) => void;
  setCycleHistory: (avgLength: number, lastDate: string) => void;
  setProfileInfo: (
    age: number,
    gender: string,
    language: string,
    notificationsEnabled: boolean,
    postPillMode: boolean,
    isTeen: boolean
  ) => void;
  incrementLowMood: () => void;
  resetLowMood: () => void;
  setLastPCOSPrompt: (date: string | null) => void;
  setLastSafeguardPrompt: (date: string | null) => void;
  setLastRedFlagPrompt: (date: string | null) => void;
  checkSafeguardCooldown: () => boolean;
  checkPCOSPromptCooldown: () => boolean;
  checkRedFlagCooldown: () => boolean;
  setLanguagePreset: (preset: "default" | "inclusive" | "custom") => void;
  setCustomTerms: (terms: { cycle?: string; flow?: string; body?: string }) => void;
  setNotificationPrefs: (prefs: Partial<NotificationPrefs>) => void;
  dismissInsight: (title: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isOnboarded: false as boolean,
      currentMode: "standard" as AppMode,
      userName: null as string | null,
      pcosData: null as PCOSSetup | null,
      endoData: null as EndoSetup | null,
      inFlare: false as boolean,
      flareStartDate: null as string | null,
      flareEndDate: null as string | null,
      flareReflection: null as string | null,
      flareDurationDays: null as number | null,
      dyspareuniaOptIn: false as boolean,
      activePeriodId: null as string | null,
      activePeriodStartDate: null as string | null,
      averageCycleLength: null as number | null,
      lastPeriodDate: null as string | null,
      age: null as number | null,
      gender: null as string | null,
      language: "en" as string,
      languagePreset: "default" as "default" | "inclusive" | "custom",
      customTerms: { cycle: "cycle", flow: "flow", body: "body" } as { cycle: string; flow: string; body: string },
      notificationsEnabled: true as boolean,
      postPillMode: false as boolean,
      postPillStartDate: null as string | null,
      pcosWidePrediction: false as boolean,
      consecutiveLowMoodDays: 0 as number,
      lastSafeguardPrompt: null as string | null,
      lastRedFlagPrompt: null as string | null,
      lastPCOSPrompt: null as string | null,
      isTeen: false as boolean,
      notificationPrefs: {
        period: true,
        insights: true,
        ovulation: false,
        flares: true,
        padReminder: true,
        hydrationNudge: true,
        ironFoodReminder: true,
        heatPadReminder: true,
        periodDayTips: true,
        endoDayTips: true,
        pcosNotifications: true,
        moodCheckIn: true,
        dailyLogHour: 20,
        quietHoursStart: 22,
        quietHoursEnd: 8,
      } as NotificationPrefs,
      dismissedInsights: [] as string[],

      setOnboarded: (status) => set({ isOnboarded: status }),
      setMode: (mode) => set({ currentMode: mode }),
      setUserName: (name) => set({ userName: name }),
      setPCOSData: (data) => set({ pcosData: data }),
      setEndoData: (data) => set({ endoData: data }),
      setInFlare: (status, startDate) => set({ 
        inFlare: status,
        flareStartDate: status ? (startDate || new Date().toISOString()) : null
      }),
      setActivePeriod: (id, date) =>
        set({ activePeriodId: id, activePeriodStartDate: date }),
      setCycleHistory: (avgLength, lastDate) =>
        set({ averageCycleLength: avgLength, lastPeriodDate: lastDate }),
      setProfileInfo: (
        age,
        gender,
        language,
        notificationsEnabled,
        postPillMode,
        isTeen,
      ) => set({ age, gender, language, notificationsEnabled, postPillMode, isTeen,
        postPillStartDate: postPillMode ? new Date().toISOString() : null
      }),

      incrementLowMood: () =>
        set((state) => ({
          consecutiveLowMoodDays: state.consecutiveLowMoodDays + 1,
        })),
      resetLowMood: () => set({ consecutiveLowMoodDays: 0 }),
      setFlareEnd: (endDate: string, reflection: string) => {
        const state = get();
        const durationDays = state.flareStartDate
          ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(state.flareStartDate).getTime()) / 86400000) + 1)
          : null;
        set({ flareEndDate: endDate, flareReflection: reflection, inFlare: false, flareDurationDays: durationDays });
      },
      setDyspareuniaOptIn: (enabled: boolean) =>
        set({ dyspareuniaOptIn: enabled }),
      setPCOSWidePrediction: (enabled: boolean) =>
        set({ pcosWidePrediction: enabled }),
      setLastSafeguardPrompt: (date: string | null) =>
        set({ lastSafeguardPrompt: date }),
      setLastRedFlagPrompt: (date: string | null) =>
        set({ lastRedFlagPrompt: date }),
      setLastPCOSPrompt: (date: string | null) =>
        set({ lastPCOSPrompt: date }),
      setLanguagePreset: (preset) =>
        set({ languagePreset: preset }),
      setCustomTerms: (terms) =>
        set((state) => ({ customTerms: { ...state.customTerms, ...terms } })),
      setNotificationPrefs: (prefs) => 
        set((state) => ({ notificationPrefs: { ...state.notificationPrefs, ...prefs } })),
      dismissInsight: (title) => 
        set((state) => {
          if (!state.dismissedInsights.includes(title)) {
            return { dismissedInsights: [...state.dismissedInsights, title] };
          }
          return state;
        }),
      checkSafeguardCooldown: () => {
        const state = get();
        if (!state.lastSafeguardPrompt) return true;
        const now = new Date();
        const daysDiff =
          (now.getTime() - new Date(state.lastSafeguardPrompt).getTime()) /
          (1000 * 60 * 60 * 24);
        return daysDiff >= 14;
      },
      checkPCOSPromptCooldown: () => {
        const state = get();
        if (!state.lastPCOSPrompt) return true;
        const now = new Date();
        const daysDiff =
          (now.getTime() - new Date(state.lastPCOSPrompt).getTime()) /
          (1000 * 60 * 60 * 24);
        return daysDiff >= 7; // Remind weekly once hit
      },
      checkRedFlagCooldown: () => {
        const state = get();
        if (!state.lastRedFlagPrompt) return true;
        const now = new Date();
        const daysDiff =
          (now.getTime() - new Date(state.lastRedFlagPrompt).getTime()) /
          (1000 * 60 * 60 * 24);
        return daysDiff >= 30;
      },
    }),
    {
      name: "cycleiq-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
