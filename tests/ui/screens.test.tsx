import AnalyticsScreen from "@/app/(tabs)/analytics";
import CalendarScreen from "@/app/(tabs)/calendar";
import HomeScreen from "@/app/(tabs)/index";
import ProfileScreen from "@/app/(tabs)/profile";
import * as db from "@/database";
import type { CycleRow, SymptomEntryRow } from "@/database";
import { useAppStore } from "@/store";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert, type AlertButton } from "react-native";
import { findUnlabelledPressables } from "./a11y";

const mock = <T extends (...args: never[]) => unknown>(fn: T) => fn as unknown as jest.Mock;
const DAY = 86400000;
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString();

const cycle = (id: string, startDaysAgo: number, length: number | null): CycleRow => ({
  id, start_date: iso(startDaysAgo), end_date: null, cycle_length: length, period_length: 5, is_confirmed: 1, notes_encrypted: null,
});

const prediction = (overrides: Record<string, unknown> = {}) => ({
  mean: 28, stdDev: 2, confidence: 0.7, model: "weighted-average", label: "Adaptive weighted avg (5 cycles)",
  predictedStartISO: iso(-20), windowStartISO: iso(-18), windowEndISO: iso(-22), mae: 1.5,
  outlierFlagged: false, trendDirection: "stable", regimeChangeDetected: false, lateArrivalP90: 30,
  nextOvulationWindowISO: null, biasAppliedDays: 0, irregularFlag: false, longestRecentCycle: 30,
  daysSinceLastPeriod: 8, cycleVariability: 1, pcosCyclePattern: "regular", amenorrheaFlag: false,
  predictedOvulationDay: 14, widePredictionWindow: false, inStressFlareWindow: false,
  flareRiskWindowStart: null, ovulationPainDay: null, currentCycleDay: 9, inFlareRiskWindow: false, periodLengthAvg: 5,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.setState({ tone: "chill", currentMode: "standard", activePeriodId: null, dismissedInsights: [], notificationsEnabled: true });
});

// ── Integration: symptom logs → correlations → insight cards ───────────────
describe("Insights screen", () => {
  beforeEach(() => {
    mock(db.getAllCycles).mockResolvedValue([cycle("c3", 8, null), cycle("c2", 36, 28), cycle("c1", 64, 28)]);
    mock(db.getCyclePredictions).mockResolvedValue(prediction());
    mock(db.generateInsights).mockResolvedValue([
      { title: "Stress & Pain", description: "Stressful days tend to be more painful days for you 😮‍💨", correlation: 0.62, n: 25 },
      { title: "Sleep & Mood", description: "More sleep tends to = better mood for you.", correlation: 0.41, n: 22, isMentalHealth: true },
    ]);
  });

  test("shows each insight with its strength and a mental-health note where relevant", async () => {
    render(<AnalyticsScreen />);
    expect(await screen.findByText("Stress & Pain")).toBeTruthy();
    expect(screen.getByText("strong link · 25 days")).toBeTruthy();
    expect(screen.getByText("Sleep & Mood")).toBeTruthy();
    expect(screen.getByText(/this isn't a diagnosis/)).toBeTruthy();
    expect(db.persistAndRetireInsights).toHaveBeenCalled();
  });

  test("dismissing an insight hides it and remembers that", async () => {
    render(<AnalyticsScreen />);
    await screen.findByText("Stress & Pain");
    fireEvent.press(screen.getByLabelText("Hide insight: Stress & Pain"));
    await waitFor(() => expect(screen.queryByText("Stress & Pain")).toBeNull());
    expect(useAppStore.getState().dismissedInsights).toContain("Stress & Pain");
  });

  test("classic tone uses statistical wording", async () => {
    useAppStore.setState({ tone: "classic" });
    render(<AnalyticsScreen />);
    expect(await screen.findByText("Correlation 0.62 (25 days)")).toBeTruthy();
    expect(db.generateInsights).toHaveBeenCalledWith("standard", "classic");
  });

  test("every tappable element is labelled", async () => {
    render(<AnalyticsScreen />);
    await screen.findByText("Stress & Pain");
    expect(findUnlabelledPressables(screen.root)).toEqual([]);
  });
});

// ── Integration: period start → prediction update ─────────────────────────
describe("Home screen", () => {
  test("logging a period start creates the cycle and refreshes the prediction", async () => {
    mock(db.getLatestCycle).mockResolvedValue(cycle("c2", 30, null));
    mock(db.getCyclePredictions)
      .mockResolvedValueOnce(prediction({ predictedStartISO: iso(2) }))
      .mockResolvedValue(prediction({ predictedStartISO: iso(-28), label: "after new period" }));
    const alert = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons?: AlertButton[]) => {
      // Confirm "is today day 1?"
      buttons?.find((b) => b.style !== "cancel")?.onPress?.();
    });

    render(<HomeScreen />);
    fireEvent.press(await screen.findByText("🩸 my period started"));
    await waitFor(() => expect(db.createCycle).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/after new period/)).toBeTruthy());
    expect(useAppStore.getState().activePeriodId).toBe("cycle-id");
    alert.mockRestore();
  });

  test("every tappable element is labelled", async () => {
    mock(db.getLatestCycle).mockResolvedValue(cycle("c2", 10, null));
    mock(db.getCyclePredictions).mockResolvedValue(prediction());
    render(<HomeScreen />);
    await screen.findByText(/next period, probably/);
    expect(findUnlabelledPressables(screen.root)).toEqual([]);
  });
});

// ── Performance: calendar with 12 months of dense data ────────────────────
describe("Calendar screen", () => {
  test("renders and pages through 12 months of daily logs quickly", async () => {
    const cycles = Array.from({ length: 13 }, (_, i) => cycle(`c${i}`, i * 28 + 3, i === 0 ? null : 28));
    const entries: SymptomEntryRow[] = Array.from({ length: 365 }, (_, i) => ({
      id: `e${i}`, cycle_id: cycles[Math.min(12, Math.floor(i / 28))].id, logged_date: iso(i),
      pain_score: i % 10, pain_locations: null, pain_type: null, mood_score: 3, mood_tags: null, brain_fog_score: 2,
      energy_score: 5, stress_score: 2, bloating: null, nausea: 0, headache: 0, fatigue_score: 3, extended_symptoms: null,
      flare_start: null, flare_end: null, flare_reflection_encrypted: null, flow_intensity: null, clots_present: 0,
      clots_size: null, spotting: 0, sleep_hours: 7, sleep_quality: 3, exercise_type: null, exercise_duration: null,
      steps_count: null, activity_minutes: null, health_sleep_source: null, health_activity_source: null,
      diet_notes_encrypted: null, medication_log_encrypted: null, synced: 0, updated_at: null,
    }));
    mock(db.getAllCycles).mockResolvedValue(cycles);
    mock(db.getAllEntries).mockResolvedValue(entries);
    mock(db.getCyclePredictions).mockResolvedValue(prediction());

    const started = performance.now();
    render(<CalendarScreen />);
    await screen.findAllByLabelText(/today/);
    for (let m = 0; m < 12; m++) {
      await act(async () => {
        fireEvent.press(screen.getByLabelText("Previous month"));
      });
    }
    const elapsed = performance.now() - started;
    // Test-renderer timing is a proxy for device speed; the budget catches O(n²) regressions.
    expect(elapsed).toBeLessThan(3000);
    // Day cells describe their state for screen readers, not just colour dots.
    expect(screen.getAllByLabelText(/high pain/).length).toBeGreaterThan(0);
    expect(findUnlabelledPressables(screen.root)).toEqual([]);
  });
});

// ── Profile: new settings ────────────────────────────────────────────────
describe("Profile screen", () => {
  test("tone and discreet-notification settings update the store", async () => {
    render(<ProfileScreen />);
    await screen.findByText(/whole database encrypted/);
    fireEvent.press(screen.getByLabelText(/^classic,/i));
    expect(useAppStore.getState().tone).toBe("classic");
    fireEvent(screen.getByLabelText("Discreet notifications"), "valueChange", true);
    expect(useAppStore.getState().discreetNotifications).toBe(true);
  });

  test("post-pill mode can be switched on and off", async () => {
    useAppStore.setState({ postPillMode: false, postPillStartDate: null });
    render(<ProfileScreen />);
    await screen.findByText(/whole database encrypted/);
    fireEvent(screen.getByLabelText("Just came off the pill"), "valueChange", true);
    expect(useAppStore.getState().postPillMode).toBe(true);
    expect(useAppStore.getState().postPillStartDate).not.toBeNull();
    expect(await screen.findByText(/day 0 of 90/)).toBeTruthy();
    fireEvent(screen.getByLabelText("Just came off the pill"), "valueChange", false);
    expect(useAppStore.getState().postPillStartDate).toBeNull();
  });

  test("every tappable element is labelled", async () => {
    render(<ProfileScreen />);
    await screen.findByText(/whole database encrypted/);
    expect(findUnlabelledPressables(screen.root)).toEqual([]);
  });
});
