import LogScreen from "@/app/(tabs)/log";
import * as db from "@/database";
import { useAppStore } from "@/store";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";
import { findUnlabelledPressables } from "./a11y";

const createSymptomEntry = db.createSymptomEntry as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  useAppStore.setState({ tone: "chill", currentMode: "standard", isTeen: false, activePeriodId: null, inFlare: false });
});

test("unanswered questions are saved as not-logged, never as invented defaults", async () => {
  render(<LogScreen />);
  fireEvent.press(screen.getByText("Save today's log ✨"));
  await waitFor(() => expect(createSymptomEntry).toHaveBeenCalledTimes(1));
  const entry = createSymptomEntry.mock.calls[0][0];
  expect(entry.pain_score).toBeUndefined();
  expect(entry.mood_score).toBeUndefined();
  expect(entry.energy_score).toBeUndefined();
  expect(entry.stress_score).toBeUndefined();
  expect(entry.sleep_hours).toBeUndefined();
});

test("answers the user gives are saved with their stored values", async () => {
  render(<LogScreen />);
  fireEvent.press(screen.getByLabelText("Mood 1 of 5: rough"));
  fireEvent.press(screen.getAllByLabelText(/^7 out of 10/)[0]); // pain
  // Regression: exercise type used to be impossible to change.
  fireEvent.press(screen.getByText("yoga 🧘"));
  fireEvent.press(screen.getByText("full balloon 🎈"));
  fireEvent.press(screen.getByText("Save today's log ✨"));
  await waitFor(() => expect(createSymptomEntry).toHaveBeenCalled());
  const entry = createSymptomEntry.mock.calls[0][0];
  expect(entry.mood_score).toBe(1);
  expect(entry.pain_score).toBe(7);
  expect(entry.exercise_type).toBe("Yoga");
  expect(entry.bloating).toBe("Severe"); // label is playful, stored value is clinical
});

test("classic tone shows plain wording", () => {
  useAppStore.setState({ tone: "classic" });
  render(<LogScreen />);
  expect(screen.getByText("Daily log")).toBeTruthy();
  expect(screen.getByText("Save log")).toBeTruthy();
  expect(screen.queryByText("Save today's log ✨")).toBeNull();
});

test("every tappable element is labelled for screen readers", () => {
  useAppStore.setState({ currentMode: "endo", activePeriodId: "c1" });
  render(<LogScreen />);
  expect(findUnlabelledPressables(screen.root)).toEqual([]);
});
