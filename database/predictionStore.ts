/**
 * Runs the prediction engine against stored cycles and keeps the audit trail
 * plus the feedback used for bias correction.
 */
import { clearPredictionsDirty, PREDICTION_INVALIDATION_STRATEGY } from "../utils/predictionInvalidation";
import { runPredictionEngine } from "../utils/predictions";
import type { PredictionResult } from "../utils/predictions";

import { createLocalId, execSql, queryAll, queryFirst } from "./connection";
import { parseJsonColumn, type CycleRow } from "./types";
import { getAppSettings } from "./settings";

/**
 * Returns the mean signed error (actual - predicted) over the last N feedback records.
 * Positive = predictions were too early (need to add days).
 * Negative = predictions were too late (need to subtract days).
 * Capped at ±7 days to avoid over-correction.
 */
export const getLatestPredictionFeedback = async (): Promise<{ error_days: number; recorded_at: string } | null> => {
  return queryFirst<{ error_days: number; recorded_at: string }>(
    `SELECT error_days, recorded_at FROM prediction_feedback ORDER BY recorded_at DESC LIMIT 1;`
  );
};

export const getPredictionBias = async (limit = 6): Promise<number> => {
  const rows = await queryAll<{ error_days: number }>(
    `SELECT error_days FROM prediction_feedback ORDER BY recorded_at DESC LIMIT ?;`,
    [limit]
  );
  const n = rows.length;
  if (n < 2) return 0;
  const sum = rows.reduce((total, row) => total + row.error_days, 0);
  // Shrink toward 0 so two noisy cycles can't shift every future date.
  const bias = (sum / n) * (n / (n + 2));
  return Math.max(-7, Math.min(7, Math.round(bias * 10) / 10));
};

export const getCyclePredictions = async (
  currentMode: string = "standard",
  postPillMode = false,
  postPillStartDate: string | null = null
): Promise<PredictionResult> => {
  // Policy: PREDICTION_INVALIDATION_STRATEGY === "recompute-on-read"
  // Always runs engine against live cycles; never reads stale cycle_predictions rows.
  void PREDICTION_INVALIDATION_STRATEGY;
  return retrainAndStoreCyclePrediction(currentMode, postPillMode, postPillStartDate);
};

/** The user's mode and post-pill state as last persisted from the app store. */
const getPersistedPredictionContext = async () => {
  const settings = await getAppSettings();
  return {
    currentMode: typeof settings.current_mode === "string" ? settings.current_mode : "standard",
    postPillMode: settings.post_pill_mode === true,
    postPillStartDate: typeof settings.post_pill_start_date === "string" ? settings.post_pill_start_date : null,
  };
};

const retrainsInFlight = new Map<string, Promise<PredictionResult>>();

/**
 * Write paths (create/update/delete cycle) call this without arguments so the stored
 * prediction uses the user's real mode, not a hard-coded "standard".
 */
export const retrainAndStoreCyclePrediction = async (
  currentMode?: string,
  postPillMode?: boolean,
  postPillStartDate?: string | null,
): Promise<PredictionResult> => {
  const persisted = currentMode === undefined ? await getPersistedPredictionContext() : null;
  const mode = currentMode ?? persisted!.currentMode;
  const pillMode = postPillMode ?? persisted?.postPillMode ?? false;
  const pillStart = postPillStartDate !== undefined ? postPillStartDate : persisted?.postPillStartDate ?? null;

  // Share an in-flight retrain only when it was asked for the same inputs.
  const key = `${mode}|${pillMode}|${pillStart ?? ""}`;
  const pending = retrainsInFlight.get(key);
  if (pending) return pending;

  const run = (async () => {
    const cycles = await queryAll<CycleRow>(`SELECT * FROM cycles ORDER BY start_date DESC;`);
    const biasCorrection = await getPredictionBias();
    const prediction = runPredictionEngine({
      cycles,
      currentMode: mode,
      postPillMode: pillMode,
      postPillStartDate: pillStart,
      biasCorrection,
    });
    await saveCyclePrediction(prediction, mode, cycles);
    clearPredictionsDirty();
    return prediction;
  })().finally(() => {
    retrainsInFlight.delete(key);
  });

  retrainsInFlight.set(key, run);
  return run;
};

export const saveCyclePrediction = async (
  prediction: PredictionResult,
  currentMode: string = "standard",
  cycles: { id: string; start_date?: string; cycle_length?: number | null }[] = [],
): Promise<void> => {
  const fingerprint = cycles
    .map((c) => `${c.id}:${c.start_date ?? ""}:${c.cycle_length ?? ""}`)
    .join("|");

  const latest = await getLatestStoredCyclePrediction(currentMode);
  if (
    latest &&
    latest.predictedStartISO === prediction.predictedStartISO &&
    latest.mean === prediction.mean &&
    latest.confidence === prediction.confidence &&
    latest.label === prediction.label
  ) {
    return;
  }

  await execSql(
    `INSERT INTO cycle_predictions (
      id, generated_at, model_version, current_mode, predicted_start, window_start, window_end,
      mean, std_dev, confidence, mae, model, label, payload_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?);`,
    [
      createLocalId(),
      new Date().toISOString(),
      "cycleiq-prediction-v3",
      currentMode,
      prediction.predictedStartISO,
      prediction.windowStartISO,
      prediction.windowEndISO,
      prediction.mean,
      prediction.stdDev,
      prediction.confidence,
      prediction.mae,
      prediction.model,
      prediction.label,
      JSON.stringify({ ...prediction, _cyclesFingerprint: fingerprint }),
    ],
  );

  // Keep audit trail bounded — UI always reads latest via getLatestStoredCyclePrediction
  await execSql(
    `DELETE FROM cycle_predictions WHERE id NOT IN (
      SELECT id FROM cycle_predictions ORDER BY generated_at DESC LIMIT 30
    );`,
  );
};

export const getLatestStoredCyclePrediction = async (
  currentMode?: string,
): Promise<PredictionResult | null> => {
  const row = currentMode
    ? await queryFirst<{ payload_json: string }>(
        `SELECT payload_json FROM cycle_predictions WHERE current_mode = ? ORDER BY generated_at DESC LIMIT 1;`,
        [currentMode],
      )
    : await queryFirst<{ payload_json: string }>(
        `SELECT payload_json FROM cycle_predictions ORDER BY generated_at DESC LIMIT 1;`,
      );
  return parseJsonColumn<PredictionResult>(row?.payload_json);
};
