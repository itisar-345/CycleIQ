/**
 * CycleIQ — Prediction cache invalidation policy
 *
 * STRATEGY: `recompute-on-read`
 *
 * - Source of truth: live `cycles` rows in SQLite (never `cycle_predictions` rows).
 * - Every `getCyclePredictions()` call re-runs the engine against current cycle data.
 * - `cycle_predictions` is an append-only audit trail (last 30 rows); UI must not read it.
 *
 * Write-path mutations (create / close / update / delete cycle, onboarding seed) call
 * `invalidatePredictions()` which sets a dirty flag and eagerly retrains so the audit
 * trail stays current even if no screen reads predictions immediately afterward.
 *
 * Alternative considered: `dirty-flag-only` (skip retrain when clean). Rejected because
 * a missed dirty mark would silently serve stale dates — unacceptable for health UX.
 */
export const PREDICTION_INVALIDATION_STRATEGY = "recompute-on-read" as const;

export type PredictionInvalidationStrategy = typeof PREDICTION_INVALIDATION_STRATEGY;

let predictionsDirty = true;

/** Mark predictions stale after any cycle mutation. */
export const markPredictionsDirty = (reason?: string): void => {
  predictionsDirty = true;
  if (typeof __DEV__ !== "undefined" && __DEV__ && reason) {
    console.debug(`[predictions] marked dirty: ${reason}`);
  }
};

export const clearPredictionsDirty = (): void => {
  predictionsDirty = false;
};

/** Diagnostic only — engine always recomputes on read regardless of this flag. */
export const arePredictionsDirty = (): boolean => predictionsDirty;

/** Call from all cycle write paths before retrain. */
export const invalidatePredictions = (reason: string): void => {
  markPredictionsDirty(reason);
};
