import { format } from "date-fns";
import { getPhaseForDay } from "@/database";

export interface AppointmentPrepSummary {
  dateRange: string;
  cycleSummary: string;
  painSummary: string;
  symptomSummary: string;
  flareSummary: string;
  medicationSummary: string;
  questions: string;
  goals: string;
  notes: string;
}

const average = (values: number[]) =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;

const parseExtended = (entry: any): Record<string, any> => {
  if (!entry?.extended_symptoms) return {};
  try {
    return typeof entry.extended_symptoms === "string"
      ? JSON.parse(entry.extended_symptoms)
      : entry.extended_symptoms;
  } catch {
    return {};
  }
};

export const buildAppointmentPrepSummary = (
  cycles: any[],
  entries: any[],
  currentMode: string,
): AppointmentPrepSummary => {
  const cycleLengths = cycles
    .map((cycle) => cycle.cycle_length)
    .filter((value): value is number => typeof value === "number" && value > 0);
  const periodLengths = cycles
    .map((cycle) => cycle.period_length)
    .filter((value): value is number => typeof value === "number" && value > 0);
  const painScores = entries
    .map((entry) => entry.pain_score)
    .filter((value): value is number => typeof value === "number");
  const highPainDays = painScores.filter((score) => score >= 7).length;
  const flareDays = entries.filter((entry) => entry.flare_start || parseExtended(entry).flare).length;
  const medicationDays = entries.filter((entry) => entry.medication_log_encrypted).length;
  const latest = entries[0]?.logged_date ? new Date(entries[0].logged_date) : null;
  const oldest = entries[entries.length - 1]?.logged_date ? new Date(entries[entries.length - 1].logged_date) : null;
  const bloatingDays = entries.filter((entry) => ["Moderate", "Severe"].includes(entry.bloating)).length;
  const fatigueDays = entries.filter((entry) => (entry.fatigue_score ?? 0) >= 6).length;
  const moodLowDays = entries.filter((entry) => (entry.mood_score ?? 5) <= 2).length;

  const topPhaseSymptoms: Record<string, number> = {};
  entries.forEach((entry) => {
    if (!entry.cycle_id) return;
    const cycle = cycles.find((item) => item.id === entry.cycle_id);
    if (!cycle?.start_date) return;
    const cycleDay = Math.floor((new Date(entry.logged_date).getTime() - new Date(cycle.start_date).getTime()) / 86400000) + 1;
    const phase = getPhaseForDay(cycleDay, cycle.cycle_length || 28);
    topPhaseSymptoms[phase] = (topPhaseSymptoms[phase] ?? 0) + (entry.pain_score ?? 0);
  });
  const highestPainPhase = Object.entries(topPhaseSymptoms).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "not enough phase data";

  return {
    dateRange: oldest && latest
      ? `${format(oldest, "MMM d, yyyy")} to ${format(latest, "MMM d, yyyy")}`
      : "No dated logs yet",
    cycleSummary: cycleLengths.length > 0
      ? `${cycleLengths.length} measured cycles. Average cycle length ${Math.round(average(cycleLengths) ?? 0)} days; average period length ${Math.round(average(periodLengths) ?? 0)} days.`
      : "No completed cycle lengths available yet.",
    painSummary: painScores.length > 0
      ? `Average pain ${((average(painScores) ?? 0)).toFixed(1)}/10 with ${highPainDays} high-pain days. Highest pain tends to cluster in ${highestPainPhase}.`
      : "No pain scores logged yet.",
    symptomSummary: `${fatigueDays} fatigue-heavy days, ${bloatingDays} moderate/severe bloating days, ${moodLowDays} low-mood days across ${entries.length} logs.`,
    flareSummary: currentMode === "endo"
      ? `${flareDays} flare days documented.`
      : "No endometriosis flare mode active for this profile.",
    medicationSummary: medicationDays > 0
      ? `${medicationDays} days include a medication log. Details remain encrypted in-app unless included manually.`
      : "No medication logs recorded.",
    questions: "What patterns should we investigate? Are these symptoms expected for my history? What are the next options if symptoms continue?",
    goals: "Review cycle regularity, pain control, symptom triggers, and whether any tests or referrals are appropriate.",
    notes: "",
  };
};

export const generateAppointmentPrepHtml = (summary: AppointmentPrepSummary): string => `
  <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 28px; color: #2A2422; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        h2 { font-size: 15px; margin-top: 18px; margin-bottom: 6px; color: #4A3D39; }
        p { font-size: 12px; line-height: 1.45; margin: 0; }
        .meta { color: #8F7F7A; margin-bottom: 18px; }
        .box { border: 1px solid #F2DED7; border-radius: 8px; padding: 10px; margin-bottom: 8px; }
      </style>
    </head>
    <body>
      <h1>CycleIQ Appointment Prep</h1>
      <p class="meta">Generated ${format(new Date(), "MMM d, yyyy")} · Range: ${summary.dateRange}</p>
      <div class="box"><h2>Cycle Snapshot</h2><p>${summary.cycleSummary}</p></div>
      <div class="box"><h2>Pain & Symptoms</h2><p>${summary.painSummary}</p><p>${summary.symptomSummary}</p></div>
      <div class="box"><h2>Flares / Medication</h2><p>${summary.flareSummary}</p><p>${summary.medicationSummary}</p></div>
      <div class="box"><h2>Visit Goals</h2><p>${summary.goals}</p></div>
      <div class="box"><h2>Questions To Ask</h2><p>${summary.questions}</p></div>
      <div class="box"><h2>Personal Notes</h2><p>${summary.notes || " "}</p></div>
    </body>
  </html>
`;
