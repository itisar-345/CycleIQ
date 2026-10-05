/**
 * AES-256-GCM encrypted AsyncStorage adapter for Zustand persist.
 * Uses the same SecureStore key as SQLCipher / field encryption.
 *
 * - "cycleiq:v2:" + encryptField output — current format.
 * - "cycleiq:v1:" — written by the old WebCrypto adapter, which on iOS/Android
 *   silently stored plaintext behind the prefix. Read once, re-encrypted on next save.
 * - Raw JSON — pre-encryption legacy, same migration path.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StateStorage } from "zustand/middleware";
import { decryptField, encryptField } from "./fieldEncryption";

const PREFIX_V2 = "cycleiq:v2:";
const LEGACY_PREFIX_V1 = "cycleiq:v1:";

const isLegacyPlaintext = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
};

export const encryptedPersistStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const raw = await AsyncStorage.getItem(name);
    if (raw == null) return null;

    if (raw.startsWith(PREFIX_V2)) {
      try {
        return await decryptField(raw.slice(PREFIX_V2.length));
      } catch (error) {
        // Key no longer matches (e.g. app reinstalled with old AsyncStorage restored).
        // The data is unrecoverable; start from defaults rather than crash.
        console.error(`[encryptedPersistStorage] could not decrypt "${name}"`, error);
        return null;
      }
    }

    if (raw.startsWith(LEGACY_PREFIX_V1)) {
      const legacy = await decryptField(raw.slice(LEGACY_PREFIX_V1.length));
      return legacy || null;
    }

    return isLegacyPlaintext(raw) ? raw : null;
  },

  setItem: async (name: string, value: string): Promise<void> => {
    const encrypted = await encryptField(value);
    await AsyncStorage.setItem(name, `${PREFIX_V2}${encrypted}`);
  },

  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};
