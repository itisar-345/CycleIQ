import * as SecureStore from "expo-secure-store";

const KEY_NAME = "cycleiq_db_key";

const generateKey = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let key = "";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
};

export const getOrCreateDbKey = async (): Promise<string> => {
  try {
    let key = await SecureStore.getItemAsync(KEY_NAME);
    if (!key) {
      key = generateKey();
      await SecureStore.setItemAsync(KEY_NAME, key);
    }
    return key;
  } catch {
    // SecureStore unavailable (e.g. web/simulator) — fall back to a fixed dev key
    return "cycleiq-dev-fallback-key-2024";
  }
};
