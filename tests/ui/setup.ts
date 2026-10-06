/**
 * Shared mocks for screen tests (Jest + React Native Testing Library).
 * The database is mocked per test via `mockDb`; native-only modules get inert stubs.
 */
/* eslint-disable @typescript-eslint/no-require-imports */

// First render in a suite also pays module-load time; the 1 s default is too tight.
require("@testing-library/react-native").configure({ asyncUtilTimeout: 5000 });

// Expected dev-only reminder from the Log screen; keep test output readable.
const originalWarn = console.warn;
jest.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
  const msg = String(args[0]);
  if (msg.includes("Safeguarding thresholds require clinical review")) return;
  // The store mirrors settings into SQLite via a lazy import, which is mocked out here.
  if (msg.includes("Unable to persist settings snapshot")) return;
  originalWarn(...args);
});

jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);

// Persisted store → in-memory (no encryption / AsyncStorage needed in tests).
jest.mock("@/utils/encryptedPersistStorage", () => {
  const mem = new Map<string, string>();
  return {
    encryptedPersistStorage: {
      getItem: async (k: string) => mem.get(k) ?? null,
      setItem: async (k: string, v: string) => void mem.set(k, v),
      removeItem: async (k: string) => void mem.delete(k),
    },
  };
});

jest.mock("@/utils/notifications", () => ({
  scheduleAllCycleNotifications: jest.fn(async () => {}),
  requestNotificationPermission: jest.fn(async () => false),
  scheduleInsightNotification: jest.fn(async () => {}),
  scheduleFlareWarning: jest.fn(async () => {}),
  scheduleDailyLogReminder: jest.fn(async () => {}),
}));

jest.mock("@/utils/healthIntegrations", () => ({
  readDailyHealthMetrics: jest.fn(async () => null),
  isHealthBridgeAvailable: () => false,
  requestHealthPermissions: jest.fn(async () => false),
}));

jest.mock("@/utils/fieldEncryption", () => ({
  encryptField: jest.fn(async (t: string) => `enc:v1:${t}`),
  decryptField: jest.fn(async (t: string) => t.replace(/^enc:v1:/, "")),
  decryptFieldOrEmpty: jest.fn(async (t: string | null) => (t ?? "").replace(/^enc:v1:/, "")),
}));

jest.mock("expo-router", () => {
  const React = require("react");
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
  return {
    router,
    useRouter: () => router,
    useLocalSearchParams: jest.fn(() => ({})),
    useSegments: jest.fn(() => []),
    // Run focus effects like a normal effect.
    useFocusEffect: (cb: () => void | (() => void)) => React.useEffect(cb, [cb]),
  };
});

// Every exported database function is a jest.fn; tests set return values via mockDb.
jest.mock("@/database", () => {
  const actualTypes = jest.requireActual("@/database/types");
  const actualPhases = jest.requireActual("@/database/phaseMath");
  return {
    getAllCycles: jest.fn(async () => []),
    getAllEntries: jest.fn(async () => []),
    getLatestCycle: jest.fn(async () => null),
    getCycle: jest.fn(async () => null),
    getCycleEntries: jest.fn(async () => []),
    getCyclePredictions: jest.fn(async () => ({ model: "none", label: "Log your next period to unlock predictions.", mean: 28, stdDev: 0, confidence: 0, mae: null })),
    getLatestPredictionFeedback: jest.fn(async () => null),
    generateInsights: jest.fn(async () => []),
    persistAndRetireInsights: jest.fn(async () => {}),
    getPhaseAverages: jest.fn(async () => []),
    createSymptomEntry: jest.fn(async () => "entry-id"),
    createRedFlagPromptLog: jest.fn(async () => "log-id"),
    saveFlareEnd: jest.fn(async () => {}),
    createCycle: jest.fn(async () => "cycle-id"),
    closeCycle: jest.fn(async () => 5),
    deleteCycle: jest.fn(async () => {}),
    updateCycle: jest.fn(async () => {}),
    getDatabaseEncryptionStatus: jest.fn(async () => ({ keyApplied: true, sqlCipherAvailable: true, cipherVersion: "4.6.1" })),
    // Pure helpers keep their real behaviour.
    getDayOfCycle: actualPhases.getDayOfCycle,
    getPhaseForDay: actualPhases.getPhaseForDay,
    getCyclePhases: actualPhases.getCyclePhases,
    getOvulationDay: actualPhases.getOvulationDay,
    parseJsonColumn: actualTypes.parseJsonColumn,
    readExtendedSymptoms: actualTypes.readExtendedSymptoms,
  };
});
