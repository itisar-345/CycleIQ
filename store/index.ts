import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { HealthImportPrefs } from "@/utils/healthIntegrations";

export type AppMode = "standard" | "pcos" | "pcod" | "endo" | "peri" | "teen";

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
  currentlyInFlare: boolean;
}

export interface NotificationPrefs {
  period: boolean;
  dailyLog: boolean;
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
  redFlagAlerts: boolean;
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
  healthImportPrefs: HealthImportPrefs;
  dismissedInsights: string[];

  consecutiveLowMoodDays: number; // For safeguarding
  lastSafeguardPrompt: string | null; // ISO date for Sec 4.7 cooldown;
  lastRedFlagPrompt: string | null;
  lastPCOSPrompt: string | null;
  lastNotificationPrompt: string | null;
  cycleVarianceDays: number | null;
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
  setCycleHistory: (avgLength: number, lastDate: string, varianceDays?: number) => void;
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
  setLastNotificationPrompt: (date: string | null) => void;
  checkNotificationPromptCooldown: () => boolean;
  checkSafeguardCooldown: () => boolean;
  checkPCOSPromptCooldown: () => boolean;
  checkRedFlagCooldown: () => boolean;
  setLanguagePreset: (preset: "default" | "inclusive" | "custom") => void;
  setCustomTerms: (terms: { cycle?: string; flow?: string; body?: string }) => void;
  setNotificationPrefs: (prefs: Partial<NotificationPrefs>) => void;
  setHealthImportPrefs: (prefs: Partial<HealthImportPrefs>) => void;
  dismissInsight: (title: string) => void;
}

const persistSettingsToSqlite = (state: AppState) => {
  void import("@/database")
    .then(({ persistAppSettingsSnapshot }) =>
      persistAppSettingsSnapshot({
        currentMode: state.currentMode,
        language: state.language,
        languagePreset: state.languagePreset,
        customTerms: state.customTerms,
        notificationsEnabled: state.notificationsEnabled,
        notificationPrefs: state.notificationPrefs,
        healthImportPrefs: state.healthImportPrefs,
        dismissedInsights: state.dismissedInsights,
      }),
    )
    .catch((error) => {
      console.warn("Unable to persist settings snapshot to SQLite", error);
    });
};

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
      lastNotificationPrompt: null as string | null,
      cycleVarianceDays: null as number | null,
      isTeen: false as boolean,
      notificationPrefs: {
        period: true,
        dailyLog: true,
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
        redFlagAlerts: true,
        moodCheckIn: true,
        dailyLogHour: 20,
        quietHoursStart: 22,
        quietHoursEnd: 8,
      } as NotificationPrefs,
      healthImportPrefs: {
        appleHealthSleep: false,
        appleHealthActivity: false,
        healthConnectSleep: false,
        healthConnectActivity: false,
      } as HealthImportPrefs,
      dismissedInsights: [] as string[],

      setOnboarded: (status) => set({ isOnboarded: status }),
      setMode: (mode) => {
        set({ currentMode: mode });
        persistSettingsToSqlite(get());
      },
      setUserName: (name) => set({ userName: name }),
      setPCOSData: (data) => set({ pcosData: data }),
      setEndoData: (data) => set({ endoData: data }),
      setInFlare: (status, startDate) => set({ 
        inFlare: status,
        flareStartDate: status ? (startDate || new Date().toISOString()) : null
      }),
      setActivePeriod: (id, date) =>
        set({ activePeriodId: id, activePeriodStartDate: date }),
      setCycleHistory: (avgLength, lastDate, varianceDays) =>
        set({ averageCycleLength: avgLength, lastPeriodDate: lastDate, cycleVarianceDays: varianceDays ?? null }),
      setProfileInfo: (
        age,
        gender,
        language,
        notificationsEnabled,
        postPillMode,
        isTeen,
      ) => {
        set({ age, gender, language, notificationsEnabled, postPillMode, isTeen,
          postPillStartDate: postPillMode ? new Date().toISOString() : null
        });
        persistSettingsToSqlite(get());
      },

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
      setLastNotificationPrompt: (date: string | null) =>
        set({ lastNotificationPrompt: date }),
      checkNotificationPromptCooldown: () => {
        const state = get();
        if (!state.lastNotificationPrompt) return true;
        const daysDiff =
          (Date.now() - new Date(state.lastNotificationPrompt).getTime()) /
          (1000 * 60 * 60 * 24);
        return daysDiff >= 30;
      },
      setLanguagePreset: (preset) => {
        set({ languagePreset: preset });
        persistSettingsToSqlite(get());
      },
      setCustomTerms: (terms) => {
        set((state) => ({ customTerms: { ...state.customTerms, ...terms } }));
        persistSettingsToSqlite(get());
      },
      setNotificationPrefs: (prefs) => {
        set((state) => ({ notificationPrefs: { ...state.notificationPrefs, ...prefs } }));
        persistSettingsToSqlite(get());
      },
      setHealthImportPrefs: (prefs) => {
        set((state) => ({ healthImportPrefs: { ...state.healthImportPrefs, ...prefs } }));
        persistSettingsToSqlite(get());
      },
      dismissInsight: (title) => 
        set((state) => {
          if (!state.dismissedInsights.includes(title)) {
            const next = { dismissedInsights: [...state.dismissedInsights, title] };
            setTimeout(() => persistSettingsToSqlite(get()), 0);
            return next;
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
