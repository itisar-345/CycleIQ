/**
 * AES-256-GCM encrypted AsyncStorage adapter for Zustand persist.
 * Uses the same SecureStore-derived key as SQLCipher / field encryption.
 * Legacy plaintext blobs are read once and re-written encrypted on next save.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StateStorage } from "zustand/middleware";
import { decryptField, encryptField } from "./fieldEncryption";

const ENCRYPTED_PREFIX = "cycleiq:v1:";

const isLegacyPlaintext = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
};

export const encryptedPersistStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const raw = await AsyncStorage.getItem(name);
    if (raw == null) return null;

    if (raw.startsWith(ENCRYPTED_PREFIX)) {
      const decrypted = await decryptField(raw.slice(ENCRYPTED_PREFIX.length));
      return decrypted || null;
    }

    // Legacy plaintext migration path — return as-is; next setItem encrypts it.
    if (isLegacyPlaintext(raw)) {
      return raw;
    }

    return null;
  },

  setItem: async (name: string, value: string): Promise<void> => {
    const encrypted = await encryptField(value);
    await AsyncStorage.setItem(name, `${ENCRYPTED_PREFIX}${encrypted}`);
  },

  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};
