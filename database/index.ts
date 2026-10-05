/**
 * Public database API. Implementation lives in the sibling modules; screens and
 * utils import from "@/database" only. database/index.web.ts replaces this on web.
 */
export { getActiveDbName, getDatabaseEncryptionStatus, checkpointDatabase } from "./connection";
export { dbSchemaVersion, initDb } from "./schema";
export { getCycle, getLatestCycle, createCycle, seedInitialCycleFromOnboarding, closeCycle, getAllCycles, updateCycle, deleteCycle } from "./cycles";
export { createSymptomEntry, getCycleEntries, getAllEntries, saveFlareEnd } from "./symptoms";
export type { SymptomEntry } from "./symptoms";
export { createRedFlagPromptLog, getRedFlagPromptLogs } from "./redFlags";
export type { RedFlagPromptLogInput } from "./redFlags";
export { saveAppSetting, getAppSettings, persistAppSettingsSnapshot } from "./settings";
export { getLatestPredictionFeedback, getPredictionBias, getCyclePredictions, retrainAndStoreCyclePrediction, saveCyclePrediction, getLatestStoredCyclePrediction } from "./predictionStore";
export { exportLocalDataSnapshot, restoreLocalDataSnapshot, wipeLocalDatabase } from "./privacy";
export { getOvulationDay, getCyclePhases, getDayOfCycle, getPhaseForDay, getPhaseAverages } from "./phases";
export type { CyclePhase, PhaseAverage } from "./phases";
export { generateInsights, persistAndRetireInsights } from "./insights";
export type { CycleInsight } from "./insights";
export type { CycleRow, EndoExtended, ExtendedSymptoms, FlareExtended, PcosExtended, PeriExtended, RedFlagPromptLogRow, SymptomEntryRow } from "./types";
export { parseJsonColumn, readExtendedSymptoms } from "./types";
