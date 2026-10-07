import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY_NAME = "cycleiq_db_key";
const KEY_LENGTH = 32;
// 64 symbols: 256 % 64 === 0, so mapping random bytes onto it has no modulo bias (192 bits).
const KEY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  // Readable while the phone is locked after first unlock, so background
  // notification work doesn't fail to open the database.
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export class SecureKeyUnavailableError extends Error {
  constructor(cause: unknown) {
    super(`Secure key storage is unavailable: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "SecureKeyUnavailableError";
  }
}

const generateKey = (): string => {
  const bytes = Crypto.getRandomBytes(KEY_LENGTH);
  let key = "";
  for (let i = 0; i < bytes.length; i++) key += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
  return key;
};

/**
 * Web is a preview-only target (see database/connection.web.ts): there is no keychain,
 * so the key lives in localStorage and offers no protection at rest.
 */
const getOrCreateWebPreviewKey = (): string => {
  const storage = globalThis.localStorage;
  const existing = storage?.getItem(KEY_NAME);
  if (existing) return existing;
  const key = generateKey();
  storage?.setItem(KEY_NAME, key);
  return key;
};

const loadOrCreateNativeKey = async (): Promise<string> => {
  try {
    // Read without options so keys saved by older builds (default accessibility) are still found.
    const existing = await SecureStore.getItemAsync(KEY_NAME);
    if (existing) return existing;
    const key = generateKey();
    await SecureStore.setItemAsync(KEY_NAME, key, SECURE_STORE_OPTIONS);
    return key;
  } catch (error) {
    // Never fall back to a fixed key: that would either lock the user out of data
    // encrypted with the real key or encrypt new data with a publicly known one.
    throw new SecureKeyUnavailableError(error);
  }
};

let keyPromise: Promise<string> | null = null;

/** Returns the per-install encryption key, creating it once. Concurrent callers share one key. */
export const getOrCreateDbKey = (): Promise<string> => {
  if (Platform.OS === "web") return Promise.resolve(getOrCreateWebPreviewKey());
  if (!keyPromise) {
    keyPromise = loadOrCreateNativeKey().catch((error) => {
      keyPromise = null; // allow a retry (e.g. after the device is unlocked)
      throw error;
    });
  }
  return keyPromise;
};
