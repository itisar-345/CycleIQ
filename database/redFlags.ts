/**
 * Audit log of red-flag safety prompts shown to the user.
 */
import { createLocalId, execSql, queryAll } from "./connection";
import type { RedFlagPromptLogRow } from "./types";

export interface RedFlagPromptLogInput {
  trigger_type: "severe_pain_3_days" | "bowel_shoulder_heavy_flow" | string;
  logged_date: string;
  message: string;
  severity?: number | null;
  cycle_id?: string | null;
  entry_context?: Record<string, unknown>;
}

export const createRedFlagPromptLog = async (log: RedFlagPromptLogInput): Promise<string> => {
  const id = createLocalId();
  await execSql(
    `INSERT INTO red_flag_prompt_logs (
      id, trigger_type, triggered_at, logged_date, message, severity, cycle_id, entry_context_json
    ) VALUES (?,?,?,?,?,?,?,?);`,
    [
      id,
      log.trigger_type,
      new Date().toISOString(),
      log.logged_date,
      log.message,
      log.severity ?? null,
      log.cycle_id ?? null,
      log.entry_context ? JSON.stringify(log.entry_context) : null,
    ],
  );
  return id;
};

export const getRedFlagPromptLogs = (): Promise<RedFlagPromptLogRow[]> =>
  queryAll<RedFlagPromptLogRow>(`SELECT * FROM red_flag_prompt_logs ORDER BY triggered_at DESC;`);
