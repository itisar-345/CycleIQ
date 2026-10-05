import { randomBytes, randomUUID as nodeRandomUUID } from "node:crypto";

export const getRandomBytes = (n: number): Uint8Array => new Uint8Array(randomBytes(n));
export const randomUUID = (): string => nodeRandomUUID();
