import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { checkpointDatabase, exportLocalDataSnapshot, getActiveDbName, restoreLocalDataSnapshot, wipeLocalDatabase } from "@/database";
import { deleteLocalReports, ensureReportsDirectory } from "@/utils/localReports";

const escapeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const tableToCsv = (tableName: string, rows: Record<string, unknown>[]): string => {
  if (rows.length === 0) return `# ${tableName}\n\n`;
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const lines = [
    `# ${tableName}`,
    columns.map(escapeCsvCell).join(","),
    ...rows.map((row) => columns.map((column) => escapeCsvCell(row[column])).join(",")),
    "",
  ];
  return lines.join("\n");
};

export const buildLocalDataCsv = (snapshot: Record<string, unknown>): string => {
  const tableNames = [
    "cycles",
    "symptom_entries",
    "cycle_predictions",
    "prediction_feedback",
    "user_correlations",
    "red_flag_prompt_logs",
    "app_settings",
    "schema_migrations",
  ];
  return [
    "# CycleIQ local data export",
    `# exported_at,${escapeCsvCell(snapshot.exported_at)}`,
    "",
    ...tableNames.map((name) => {
      const rows = snapshot[name];
      return tableToCsv(name, Array.isArray(rows) ? (rows as Record<string, unknown>[]) : []);
    }),
  ].join("\n");
};

export const exportAndShareLocalData = async (format: "json" | "csv" = "json"): Promise<string> => {
  const snapshot = await exportLocalDataSnapshot();
  const dir = await ensureReportsDirectory();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `cycleiq-local-data-${stamp}.${format}`;
  const uri = `${dir}${fileName}`;
  const contents = format === "json"
    ? JSON.stringify(snapshot, null, 2)
    : buildLocalDataCsv(snapshot);

  await FileSystem.writeAsStringAsync(uri, contents, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  }
  return uri;
};

export const restoreLocalDataBackupFromUri = async (uri: string): Promise<void> => {
  const contents = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const snapshot = JSON.parse(contents);
  await restoreLocalDataSnapshot(snapshot);
};

export const exportAndShareDatabaseFileBackup = async (): Promise<string> => {
  await checkpointDatabase();
  const sqliteDir = `${FileSystem.documentDirectory ?? ""}SQLite/`;
  // When SQLCipher is active this file is encrypted with this device's key; use the
  // JSON export for a backup that can be restored on another device.
  const sourceUri = `${sqliteDir}${await getActiveDbName()}`;
  const info = await FileSystem.getInfoAsync(sourceUri);
  if (!info.exists) {
    throw new Error("SQLite database file was not found.");
  }
  const dir = await ensureReportsDirectory();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const targetUri = `${dir}cycleiq-database-backup-${stamp}.sqlite`;
  await FileSystem.copyAsync({ from: sourceUri, to: targetUri });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(targetUri);
  }
  return targetUri;
};

export const wipeLocalDataAndFiles = async (): Promise<void> => {
  await wipeLocalDatabase();
  await deleteLocalReports();
};
