/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  WEB DATABASE STUB — PREVIEW ONLY — DO NOT BUILD FEATURES AGAINST THIS  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  expo-sqlite is not available on web. This module replaces              ║
 * ║  database/index.ts via Metro platform resolution (.web.ts).               ║
 * ║                                                                          ║
 * ║  • No health data is persisted                                          ║
 * ║  • Predictions always return model: "none"                                ║
 * ║  • createCycle / createSymptomEntry are no-ops                            ║
 * ║                                                                          ║
 * ║  First-class target: iOS and Android native builds only.                  ║
 * ║  Test persistence with: npx expo start --ios | --android                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

let webStubWarned = false;

const warnWebStub = (fn: string) => {
  if (webStubWarned) return;
  webStubWarned = true;
  console.warn(
    `[CycleIQ] database/index.web.ts is active — "${fn}" is a no-op. ` +
      "Health data does NOT persist on web. Use iOS/Android for real testing.",
  );
};

const noop = () => Promise.resolve();
const noRows = () => Promise.resolve([]);

export const dbName = "cycleiq.sqlite";
export const dbSchemaVersion = 3;
export const isWebDatabaseStub = true as const;

export const initDb = () => {
  warnWebStub("initDb");
  return noop();
};
export const getLatestCycle = () => Promise.resolve(null);
export const createCycle = () => Promise.resolve("");
export const seedInitialCycleFromOnboarding = () =>
  Promise.resolve({ cycleId: "web-seed", isRecentPeriod: false });
export const closeCycle = () => Promise.resolve(null);
export const getAllCycles = noRows;
export const getCycleEntries = noRows;
export const getAllEntries = noRows;
export const getUnsyncedEntries = noRows;
export const markEntriesSynced = noop;
export const deleteCycle = noop;
export const updateCycle = noop;
export const saveFlareEnd = noop;
export const upsertSymptomEntry = () => Promise.resolve("");
export const createSymptomEntry = () => Promise.resolve("");
export const getPhaseAverages = noRows;
export const generateInsights = () => Promise.resolve([]);
export const persistAndRetireInsights = noop;
export const getLatestPredictionFeedback = () => Promise.resolve(null);
export const getPredictionBias = () => Promise.resolve(0);
export const getCyclePredictions = () => {
  warnWebStub("getCyclePredictions");
  return Promise.resolve({
    model: "none" as const,
    label: "Not available on web preview",
    mean: 28,
    stdDev: 3,
    confidence: 0,
    mae: null,
    predictedStartISO: null,
    windowStartISO: null,
    windowEndISO: null,
  });
};
export const retrainAndStoreCyclePrediction = () => {
  warnWebStub("retrainAndStoreCyclePrediction");
  return getCyclePredictions();
};
export const saveCyclePrediction = noop;
export const getLatestStoredCyclePrediction = () => Promise.resolve(null);
export const createRedFlagPromptLog = () => Promise.resolve("");
export const getRedFlagPromptLogs = noRows;
export const saveAppSetting = noop;
export const getAppSettings = () => Promise.resolve({});
export const persistAppSettingsSnapshot = noop;
export const exportLocalDataSnapshot = () => Promise.resolve({});
export const restoreLocalDataSnapshot = noop;
export const wipeLocalDatabase = noop;
export const checkpointDatabase = noop;
export const getDatabaseEncryptionStatus = () =>
  Promise.resolve({ keyApplied: false, sqlCipherAvailable: false, cipherVersion: null });
export const getCyclePhases = (cycleLength = 28) => [
  { name: "menstrual" as const, dayRange: [1, 5] as [number, number], color: "#FF6B9D" },
  { name: "follicular" as const, dayRange: [6, 12] as [number, number], color: "#4ECDC4" },
  { name: "ovulatory" as const, dayRange: [13, 15] as [number, number], color: "#45B7D1" },
  { name: "luteal" as const, dayRange: [16, cycleLength] as [number, number], color: "#F7DC6F" },
];
export const getDayOfCycle = () => 1;
export const getPhaseForDay = () => "follicular" as const;

export interface CyclePhase { name: 'menstrual'|'follicular'|'ovulatory'|'luteal'; dayRange: [number,number]; color: string; }
export interface PhaseAverage { phase: string; mood_avg: number|null; energy_avg: number|null; brain_fog_avg: number|null; count: number; }
export interface CycleInsight { title: string; description: string; correlation?: number; n?: number; isMentalHealth?: boolean; }
export interface SymptomEntry { cycle_id?: string|null; logged_date: string; [key: string]: any; }
