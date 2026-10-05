/**
 * Daily Log form state for the condition-specific sections, and the pure mapping
 * from that state to the stored extended_symptoms JSON.
 */
import type { EndoExtended, ExtendedSymptoms, PcosExtended, PeriExtended } from "@/database/types";

export interface PcosLog {
  acneSeverity: number;
  acneLocations: string[];
  hairThinningNote: string;
  hirsutism: boolean;
  weightDir: string | null;
  weightNote: string;
  cravingsInt: number;
  cravingsTypes: string[];
  pelvicPressurePain: number | null;
  sleepDisruptTypes: string[];
  anxietySpike: boolean;
}

export const EMPTY_PCOS_LOG: PcosLog = {
  acneSeverity: 0,
  acneLocations: [],
  hairThinningNote: "",
  hirsutism: false,
  weightDir: null,
  weightNote: "",
  cravingsInt: 0,
  cravingsTypes: [],
  pelvicPressurePain: null,
  sleepDisruptTypes: [],
  anxietySpike: false,
};

export interface EndoLog {
  bowelSymptoms: string[];
  bladderSymptoms: string[];
  shoulderSide: string | null;
  dyspareunia: boolean;
  nauseaSeverity: number;
}

export const EMPTY_ENDO_LOG: EndoLog = {
  bowelSymptoms: [],
  bladderSymptoms: [],
  shoulderSide: null,
  dyspareunia: false,
  nauseaSeverity: 0,
};

export interface FlareLog {
  pain: number | null;
  nausea: boolean;
  movement: string | null;
}

export const EMPTY_FLARE_LOG: FlareLog = { pain: null, nausea: false, movement: null };

export type PeriLog = PeriExtended;

export const EMPTY_PERI_LOG: PeriLog = {
  hotFlashes: false,
  hotFlashFrequency: 0,
  hotFlashSeverity: 0,
  hotFlashTimeOfDay: null,
  nightSweats: false,
  vaginalChanges: false,
  memoryIssues: false,
};

export const buildExtendedSymptoms = (input: {
  mode: string;
  pcos: PcosLog;
  endo: EndoLog;
  peri: PeriLog;
  clotsSize: string | null;
  inFlare: boolean;
  flare: FlareLog;
  nowISO: string;
}): ExtendedSymptoms => {
  const extended: ExtendedSymptoms = {};
  if (input.mode === "pcos") {
    const p = input.pcos;
    const pcos: PcosExtended = {
      acne: { severity: p.acneSeverity, locations: p.acneLocations },
      hair_thinning: p.hairThinningNote,
      hirsutism: p.hirsutism,
      weight: { dir: p.weightDir, note: p.weightNote },
      cravings: { int: p.cravingsInt, types: p.cravingsTypes },
      pelvic_pressure: p.pelvicPressurePain,
      sleep_disruption: p.sleepDisruptTypes,
      anxiety_spike: p.anxietySpike,
    };
    extended.pcos = pcos;
  } else if (input.mode === "endo") {
    const e = input.endo;
    const endo: EndoExtended = {
      clots: input.clotsSize,
      bowel: e.bowelSymptoms,
      bladder: e.bladderSymptoms,
      shoulder: e.shoulderSide,
      dyspareunia: e.dyspareunia,
      nausea: e.nauseaSeverity,
    };
    extended.endo = endo;
  } else if (input.mode === "peri") {
    extended.peri = { ...input.peri };
  }
  if (input.inFlare) {
    extended.flare = { start: input.nowISO, mode: { ...input.flare } };
  }
  return extended;
};
