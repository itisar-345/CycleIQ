/**
 * Field-level AES-256-GCM encryption for sensitive free-text fields.
 *
 * Uses @noble/ciphers (audited, pure JS) because Hermes has no `crypto.subtle`;
 * the previous WebCrypto version silently stored plaintext on iOS/Android.
 * Key is the per-install key from SecureStore — it never leaves the device.
 *
 * Format: "enc:v1:" + base64(iv[12] ‖ ciphertext ‖ tag[16]).
 * Values without the prefix are legacy: either plaintext (native) or the old
 * WebCrypto output (same byte layout, no prefix) — both still decrypt.
 */
import { gcm } from "@noble/ciphers/aes";
import * as Crypto from "expo-crypto";
import { getOrCreateDbKey } from "./secureKey";

const PREFIX = "enc:v1:";
const IV_LENGTH = 12;

export class FieldDecryptionError extends Error {
  constructor() {
    super("Encrypted field could not be decrypted with this device's key.");
    this.name = "FieldDecryptionError";
  }
}

// ── UTF-8 / base64 helpers (no TextDecoder dependency; chunked to avoid stack overflow) ──

const utf8Encode = (text: string): Uint8Array => {
  const bytes: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number;
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
  }
  return Uint8Array.from(bytes);
};

const utf8Decode = (bytes: Uint8Array): string => {
  let out = "";
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i];
    let cp: number;
    if (b < 0x80) { cp = b; i += 1; }
    else if (b < 0xe0) { cp = ((b & 31) << 6) | (bytes[i + 1] & 63); i += 2; }
    else if (b < 0xf0) { cp = ((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63); i += 3; }
    else { cp = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63); i += 4; }
    out += String.fromCodePoint(cp);
  }
  return out;
};

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(binary);
};

const fromBase64 = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

// ── key ──

let cachedKey: { raw: string; bytes: Uint8Array } | null = null;

const getKeyBytes = async (): Promise<Uint8Array> => {
  const raw = await getOrCreateDbKey();
  if (cachedKey?.raw !== raw) {
    // Same derivation as the previous WebCrypto version so its ciphertexts still open.
    cachedKey = { raw, bytes: utf8Encode(raw.padEnd(32, "0").slice(0, 32)) };
  }
  return cachedKey.bytes;
};

const decryptBytes = (key: Uint8Array, combined: Uint8Array): string => {
  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);
  return utf8Decode(gcm(key, iv).decrypt(data));
};

// ── public API ──

export const isEncryptedField = (value: string): boolean => value.startsWith(PREFIX);

/** Encrypts plaintext. Throws rather than ever returning plaintext. */
export const encryptField = async (plaintext: string): Promise<string> => {
  if (!plaintext) return "";
  const key = await getKeyBytes();
  const iv = Crypto.getRandomBytes(IV_LENGTH);
  const sealed = gcm(key, iv).encrypt(utf8Encode(plaintext));
  const combined = new Uint8Array(iv.length + sealed.length);
  combined.set(iv, 0);
  combined.set(sealed, iv.length);
  return PREFIX + toBase64(combined);
};

/**
 * Decrypts a value produced by encryptField. Legacy unprefixed values are returned
 * decrypted if they were old WebCrypto output, or as-is if they were stored plaintext.
 * Throws FieldDecryptionError when a current-format value fails authentication.
 */
export const decryptField = async (value: string): Promise<string> => {
  if (!value) return "";
  const key = await getKeyBytes();
  if (isEncryptedField(value)) {
    try {
      return decryptBytes(key, fromBase64(value.slice(PREFIX.length)));
    } catch {
      throw new FieldDecryptionError();
    }
  }
  try {
    return decryptBytes(key, fromBase64(value));
  } catch {
    return value; // legacy plaintext
  }
};

/** For pre-filling forms: returns "" instead of throwing when a value can't be decrypted. */
export const decryptFieldOrEmpty = async (value: string | null | undefined): Promise<string> => {
  if (!value) return "";
  try {
    return await decryptField(value);
  } catch {
    return "";
  }
};
