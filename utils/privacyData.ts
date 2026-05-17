import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { checkpointDatabase, dbName, exportLocalDataSnapshot, restoreLocalDataSnapshot, wipeLocalDatabase } from "@/database";
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

export const buildLocalDataCsv = (snapshot: Record<string, any>): string => {
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
    ...tableNames.map((name) => tableToCsv(name, snapshot[name] ?? [])),
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

  await (FileSystem as any).writeAsStringAsync(uri, contents, {
    encoding: (FileSystem as any).EncodingType?.UTF8 ?? "utf8",
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  }
  return uri;
};

export const restoreLocalDataBackupFromUri = async (uri: string): Promise<void> => {
  const contents = await (FileSystem as any).readAsStringAsync(uri, {
    encoding: (FileSystem as any).EncodingType?.UTF8 ?? "utf8",
  });
  const snapshot = JSON.parse(contents);
  await restoreLocalDataSnapshot(snapshot);
};

export const exportAndShareDatabaseFileBackup = async (): Promise<string> => {
  await checkpointDatabase();
  const sqliteDir = `${(FileSystem as any).documentDirectory ?? ""}SQLite/`;
  const sourceUri = `${sqliteDir}${dbName}`;
  const info = await (FileSystem as any).getInfoAsync(sourceUri, { size: true });
  if (!info?.exists) {
    throw new Error("SQLite database file was not found.");
  }
  const dir = await ensureReportsDirectory();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const targetUri = `${dir}cycleiq-database-backup-${stamp}.sqlite`;
  await (FileSystem as any).copyAsync({ from: sourceUri, to: targetUri });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(targetUri);
  }
  return targetUri;
};

export const wipeLocalDataAndFiles = async (): Promise<void> => {
  await wipeLocalDatabase();
  await deleteLocalReports();
};
