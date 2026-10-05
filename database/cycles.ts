/**
 * Cycle rows: create / close / edit / delete, onboarding seed, and cycle-length upkeep.
 */
import { addDays, differenceInCalendarDays, differenceInDays, parseISO } from "date-fns";
import * as SQLite from "expo-sqlite";
import { computeCycleLength, computePeriodLength } from "../utils/cycleMath";
import { invalidatePredictions } from "../utils/predictionInvalidation";
import type { PredictionResult } from "../utils/predictions";

import { createLocalId, ensureDb, execSql, queryAll, queryFirst, type SqlParams } from "./connection";
import { parseJsonColumn, type CycleRow } from "./types";
import { retrainAndStoreCyclePrediction } from "./predictionStore";

/**
 * Single source of truth for cycle lengths: each completed cycle's length is the gap
 * to the next cycle's start; the latest (in-progress) cycle has no length.
 */
export const recomputeCycleLengths = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  const rows = await database.getAllAsync<{ id: string; start_date: string; cycle_length: number | null }>(
    `SELECT id, start_date, cycle_length FROM cycles ORDER BY start_date DESC;`,
  );
  for (let i = 0; i < rows.length; i++) {
    const newer = rows[i - 1];
    const length = newer ? computeCycleLength(newer.start_date, rows[i].start_date) : null;
    if (rows[i].cycle_length !== length) {
      await database.runAsync(`UPDATE cycles SET cycle_length = ? WHERE id = ?;`, [length, rows[i].id]);
    }
  }
};

export const getLatestCycle = (): Promise<CycleRow | null> =>
  queryFirst<CycleRow>(`SELECT * FROM cycles ORDER BY start_date DESC LIMIT 1;`);

/**
 * Records how far off the prediction the user actually saw was. Uses the stored
 * prediction (made before this period started, in the user's mode) — never a re-run,
 * which would already know the answer. Stores the pre-bias date so the bias
 * correction learns from the raw model error.
 */
const recordPredictionFeedback = async (prevCycleId: string, actualStartDate: string): Promise<void> => {
  const existing = await queryFirst<{ id: string }>(`SELECT id FROM prediction_feedback WHERE cycle_id = ?;`, [prevCycleId]);
  if (existing) return;

  const stored = await queryFirst<{ payload_json: string }>(
    `SELECT payload_json FROM cycle_predictions ORDER BY generated_at DESC LIMIT 1;`,
  );
  const shown = parseJsonColumn<PredictionResult & { _cyclesFingerprint?: string }>(stored?.payload_json);
  // Only score a prediction that was anchored on the cycle that just ended.
  if (!shown?.predictedStartISO || !shown._cyclesFingerprint?.startsWith(`${prevCycleId}:`)) return;

  const rawPredictedStart = addDays(new Date(shown.predictedStartISO), -(shown.biasAppliedDays ?? 0));
  const errorDays = differenceInCalendarDays(new Date(actualStartDate), rawPredictedStart);
  await execSql(
    `INSERT INTO prediction_feedback (id, cycle_id, predicted_start, actual_start, error_days, recorded_at)
     VALUES (?,?,?,?,?,?);`,
    [createLocalId(), prevCycleId, rawPredictedStart.toISOString(), actualStartDate, errorDays, new Date().toISOString()],
  );
};

export const createCycle = async (startDate: string) => {
  const id = createLocalId();
  const prevCycle = await getLatestCycle();

  if (prevCycle?.start_date) {
    try {
      await recordPredictionFeedback(prevCycle.id, startDate);
    } catch (e) {
      // Non-fatal — feedback recording should never block cycle creation
      console.warn("Prediction feedback recording failed", e);
    }
  }

  await execSql(
    `INSERT INTO cycles (id,start_date,is_confirmed) VALUES (?,?,1);`,
    [id, startDate],
  );
  await recomputeCycleLengths(await ensureDb());

  invalidatePredictions("createCycle");
  await retrainAndStoreCyclePrediction();
  return id;
};

/** Seeds SQLite from onboarding answers so Home, Calendar, and predictions work immediately. */
export const seedInitialCycleFromOnboarding = async (
  lastPeriodDate: string,
  averageLength: number,
): Promise<{ cycleId: string | null; isRecentPeriod: boolean }> => {
  const existing = await getLatestCycle();
  if (existing) {
    return { cycleId: existing.id, isRecentPeriod: false };
  }

  const normalizedDate = lastPeriodDate.includes("T")
    ? lastPeriodDate
    : `${lastPeriodDate}T12:00:00.000Z`;
  const prevStart = addDays(parseISO(normalizedDate), -averageLength).toISOString();

  const prevId = createLocalId();
  await execSql(
    `INSERT INTO cycles (id, start_date, cycle_length, is_confirmed) VALUES (?,?,?,1);`,
    [prevId, prevStart, averageLength],
  );

  // The current cycle is in progress — it has no length until the next period starts.
  const currentId = createLocalId();
  await execSql(
    `INSERT INTO cycles (id, start_date, cycle_length, is_confirmed) VALUES (?,?,NULL,1);`,
    [currentId, normalizedDate],
  );

  invalidatePredictions("seedInitialCycleFromOnboarding");
  await retrainAndStoreCyclePrediction();

  const daysSince = differenceInDays(new Date(), parseISO(normalizedDate));
  const isRecentPeriod = daysSince >= 0 && daysSince <= 7;

  return { cycleId: currentId, isRecentPeriod };
};

export const closeCycle = async (cycleId: string, endDate: string) => {
  const cycle = await queryFirst<Pick<CycleRow, "start_date">>(`SELECT start_date FROM cycles WHERE id = ?;`, [cycleId]);
  if (!cycle) return null;
  const periodLength = computePeriodLength(cycle.start_date, endDate);
  await execSql(
    `UPDATE cycles SET end_date = ?, period_length = ?, is_confirmed = 1 WHERE id = ?;`,
    [endDate, periodLength, cycleId],
  );
  invalidatePredictions("closeCycle");
  await retrainAndStoreCyclePrediction();
  return periodLength;
};

export const getCycle = (cycleId: string): Promise<CycleRow | null> =>
  queryFirst<CycleRow>(`SELECT * FROM cycles WHERE id = ?;`, [cycleId]);

/** Newest first; cycles[0] is the in-progress cycle. */
export const getAllCycles = (): Promise<CycleRow[]> =>
  queryAll<CycleRow>(`SELECT * FROM cycles ORDER BY start_date DESC;`);

export const updateCycle = async (
  cycleId: string,
  data: Partial<{
    start_date: string;
    end_date: string | null;
    cycle_length: number;
    period_length: number | null;
    notes_encrypted: string;
  }>,
) => {
  const current = await queryFirst<CycleRow>(`SELECT * FROM cycles WHERE id = ?;`, [cycleId]);
  const updates: string[] = [];
  const params: SqlParams = [];
  if (data.start_date) {
    updates.push("start_date = ?");
    params.push(data.start_date);
  }
  if (Object.prototype.hasOwnProperty.call(data, "end_date")) {
    updates.push("end_date = ?");
    params.push(data.end_date ?? null);
  }
  if (typeof data.cycle_length === "number") {
    updates.push("cycle_length = ?");
    params.push(data.cycle_length);
  }
  if (typeof data.period_length === "number" || data.period_length === null) {
    updates.push("period_length = ?");
    params.push(data.period_length ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(data, "notes_encrypted")) {
    updates.push("notes_encrypted = ?");
    params.push(data.notes_encrypted ?? null);
  }
  if (updates.length === 0) return;

  const endDateWasProvided = Object.prototype.hasOwnProperty.call(data, "end_date");
  const nextStart = data.start_date ?? current?.start_date;
  const nextEnd = endDateWasProvided ? data.end_date : current?.end_date;
  if (endDateWasProvided && data.end_date === null && data.period_length === undefined) {
    updates.push("period_length = ?");
    params.push(null);
  } else if (nextStart && nextEnd && data.period_length === undefined) {
    updates.push("period_length = ?");
    params.push(computePeriodLength(nextStart, nextEnd));
  }

  params.push(cycleId);
  await execSql(
    `UPDATE cycles SET ${updates.join(", ")} WHERE id = ?;`,
    params,
  );

  await recomputeCycleLengths(await ensureDb());
  invalidatePredictions("updateCycle");
  await retrainAndStoreCyclePrediction();
};

export const deleteCycle = async (cycleId: string): Promise<void> => {
  await execSql(`DELETE FROM symptom_entries WHERE cycle_id = ?;`, [cycleId]);
  await execSql(`DELETE FROM cycles WHERE id = ?;`, [cycleId]);
  await recomputeCycleLengths(await ensureDb());
  invalidatePredictions("deleteCycle");
  await retrainAndStoreCyclePrediction();
};
