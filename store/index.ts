import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppMode = "standard" | "pcos" | "endo" | "peri";

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
  dyspareuniaOptIn: boolean;
  activePeriodId: string | null;
  activePeriodStartDate: string | null;
  averageCycleLength: number | null;
  lastPeriodDate: string | null;
  age: number | null;
  gender: string | null;
  language: string;
  notificationsEnabled: boolean;
  postPillMode: boolean;
  pcosWidePrediction: boolean;

  consecutiveLowMoodDays: number; // For safeguarding
  lastSafeguardPrompt: string | null; // ISO date for Sec 4.7 cooldown;
  lastRedFlagPrompt: string | null;

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
  ) => void;
  incrementLowMood: () => void;
  resetLowMood: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isOnboarded: false,
      currentMode: "standard",
      userName: null,
      pcosData: null,
      endoData: null,
      inFlare: false,
      flareStartDate: null,
      flareEndDate: null,
      flareReflection: null,
      dyspareuniaOptIn: false,
      activePeriodId: null,
      activePeriodStartDate: null,
      averageCycleLength: null,
      lastPeriodDate: null,
      age: null,
      gender: null,
      language: "en",
      notificationsEnabled: true,
      postPillMode: false,
      pcosWidePrediction: false,
      consecutiveLowMoodDays: 0,
      lastSafeguardPrompt: null,
      lastRedFlagPrompt: null,

      setOnboarded: (status) => set({ isOnboarded: status }),
      setMode: (mode) => set({ currentMode: mode }),
      setUserName: (name) => set({ userName: name }),
      setPCOSData: (data) => set({ pcosData: data }),
      setEndoData: (data) => set({ endoData: data }),
      setInFlare: (status) => set({ inFlare: status }),
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
      ) => set({ age, gender, language, notificationsEnabled, postPillMode }),

      incrementLowMood: () =>
        set((state) => ({
          consecutiveLowMoodDays: state.consecutiveLowMoodDays + 1,
        })),
      resetLowMood: () => set({ consecutiveLowMoodDays: 0 }),
      setInFlare: (status: boolean, startDate?: string) =>
        set({
          inFlare: status,
          ...(status && {
            flareStartDate: startDate || new Date().toISOString(),
          }),
        }),
      setFlareEnd: (endDate: string, reflection: string) =>
        set({
          flareEndDate: endDate,
          flareReflection: reflection,
          inFlare: false,
        }),
      setDyspareuniaOptIn: (enabled: boolean) =>
        set({ dyspareuniaOptIn: enabled }),
      setPCOSWidePrediction: (enabled: boolean) =>
        set({ pcosWidePrediction: enabled }),
      setLastSafeguardPrompt: (date: string | null) =>
        set({ lastSafeguardPrompt: date }),
      checkSafeguardCooldown: () => {
        const state = useAppStore.getState();
        if (!state.lastSafeguardPrompt) return true;
        const now = new Date();
        const daysDiff =
          (now.getTime() - new Date(state.lastSafeguardPrompt).getTime()) /
          (1000 * 60 * 60 * 24);
        return daysDiff >= 14;
      },
      checkRedFlagCooldown: () => {
        const state = useAppStore.getState();
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
      storage: AsyncStorage,
    },
  ),
);
