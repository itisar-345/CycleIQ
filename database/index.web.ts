// Web stub — expo-sqlite is not supported on web.
// All functions return empty/no-op results so the app renders without crashing.
const noop = () => Promise.resolve();
const noRows = () => Promise.resolve([]);

export const dbName = "cycleiq.sqlite";
export const dbSchemaVersion = 3;

export const initDb = noop;
export const getLatestCycle = () => Promise.resolve(null);
export const createCycle = () => Promise.resolve("");
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
export const getCyclePredictions = () => Promise.resolve({ model: "none", label: "Not available on web", mean: 28, stdDev: 3, confidence: 0, mae: null, predictedStartISO: null, windowStartISO: null, windowEndISO: null });
export const retrainAndStoreCyclePrediction = () => Promise.resolve({ model: "none", label: "Not available on web", mean: 28, stdDev: 3, confidence: 0, mae: null, predictedStartISO: null, windowStartISO: null, windowEndISO: null });
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
export const getDatabaseEncryptionStatus = () => Promise.resolve({ keyApplied: false, sqlCipherAvailable: false, cipherVersion: null });
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
