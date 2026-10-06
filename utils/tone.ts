/**
 * Two voices for the app's wording:
 * - "chill"   — casual, lowercase, emoji (default)
 * - "classic" — plain, calm sentences for people who prefer that
 *
 * Every user-facing string is written as tx(chill, classic) at its call site, so both
 * versions sit side by side and stay in sync. Safety and medical messages should say
 * the same thing in both voices — only the style changes.
 */
import { useAppStore, type Tone } from "@/store";
import { useCallback } from "react";

export type Tx = <T>(chill: T, classic: T) => T;

export const txFor = (tone: Tone): Tx => (chill, classic) => (tone === "classic" ? classic : chill);

/** Outside React (notifications, alerts fired from utils). */
export const currentTx = (): Tx => txFor(useAppStore.getState().tone);

/** In components: re-renders when the user switches tone. */
export const useTx = (): Tx => {
  const tone = useAppStore((s) => s.tone);
  return useCallback<Tx>((chill, classic) => (tone === "classic" ? classic : chill), [tone]);
};
