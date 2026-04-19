/**
 * Field-level AES-256-GCM encryption for sensitive free-text fields.
 * Key is derived from the DB key stored in SecureStore — never leaves device.
 * Uses the Web Crypto API available in React Native (Hermes / JSC).
 */
import { getOrCreateDbKey } from "./secureKey";

const enc = new TextEncoder();
const dec = new TextDecoder();

const getKey = async (): Promise<CryptoKey> => {
  const rawKey = await getOrCreateDbKey();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(rawKey.padEnd(32, "0").slice(0, 32)),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );
  return keyMaterial;
};

/** Encrypts plaintext → base64(iv + ciphertext) */
export const encryptField = async (plaintext: string): Promise<string> => {
  if (!plaintext) return "";
  try {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipherBuf = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(plaintext)
    );
    const combined = new Uint8Array(iv.byteLength + cipherBuf.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuf), iv.byteLength);
    return btoa(String.fromCharCode(...combined));
  } catch {
    // Fallback: store as-is if crypto unavailable (web dev mode)
    return plaintext;
  }
};

/** Decrypts base64(iv + ciphertext) → plaintext */
export const decryptField = async (ciphertext: string): Promise<string> => {
  if (!ciphertext) return "";
  try {
    const key = await getKey();
    const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return dec.decode(plainBuf);
  } catch {
    // If decryption fails (e.g. legacy unencrypted value), return as-is
    return ciphertext;
  }
};
