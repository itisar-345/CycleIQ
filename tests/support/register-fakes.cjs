/**
 * Preloaded by `npm test` (tsx --require). Points native-only Expo / React Native modules
 * at in-process stand-ins so the database layer runs against real SQLite in Node.
 */
const Module = require("module");
const path = require("path");

const fakes = {
  "expo-sqlite": "fake-expo-sqlite.ts",
  "expo-crypto": "fake-expo-crypto.ts",
  "expo-secure-store": "fake-expo-secure-store.ts",
  "react-native": "fake-react-native.ts",
  "@react-native-async-storage/async-storage": "fake-async-storage.ts",
  "expo-constants": "fake-expo-constants.ts",
};

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolve(request, ...rest) {
  if (Object.prototype.hasOwnProperty.call(fakes, request)) {
    return path.join(__dirname, fakes[request]);
  }
  // "@/x" path alias from tsconfig
  if (request.startsWith("@/")) {
    return originalResolve.call(this, path.join(__dirname, "..", "..", request.slice(2)), ...rest);
  }
  return originalResolve.call(this, request, ...rest);
};

globalThis.__DEV__ = false;
