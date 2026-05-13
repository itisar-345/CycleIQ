import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export interface LocalReportFile {
  name: string;
  uri: string;
  modifiedAt: number | null;
  size: number | null;
  type: "specialist" | "appointment" | "other";
}

export const reportsDirectory = `${(FileSystem as any).documentDirectory ?? ""}cycleiq_reports/`;

export const ensureReportsDirectory = async (): Promise<string> => {
  await (FileSystem as any).makeDirectoryAsync(reportsDirectory, { intermediates: true }).catch(() => {});
  return reportsDirectory;
};

export const savePdfToReports = async (tempUri: string, fileName: string): Promise<string> => {
  const dir = await ensureReportsDirectory();
  const targetUri = `${dir}${fileName}`;
  await (FileSystem as any).copyAsync({ from: tempUri, to: targetUri });
  return targetUri;
};

export const getReportType = (name: string): LocalReportFile["type"] => {
  if (name.toLowerCase().includes("appointment")) return "appointment";
  if (name.toLowerCase().includes("report")) return "specialist";
  return "other";
};

export const listLocalReports = async (): Promise<LocalReportFile[]> => {
  const dir = await ensureReportsDirectory();
  const names = await (FileSystem as any).readDirectoryAsync(dir).catch(() => []);
  const pdfNames = names.filter((name: string) => name.toLowerCase().endsWith(".pdf"));
  const reports = await Promise.all(
    pdfNames.map(async (name: string) => {
      const uri = `${dir}${name}`;
      const info = await (FileSystem as any).getInfoAsync(uri, { size: true }).catch(() => null);
      return {
        name,
        uri,
        modifiedAt: typeof info?.modificationTime === "number" ? info.modificationTime : null,
        size: typeof info?.size === "number" ? info.size : null,
        type: getReportType(name),
      } satisfies LocalReportFile;
    }),
  );
  return reports.sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));
};

export const shareReport = async (uri: string): Promise<boolean> => {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri);
  return true;
};
