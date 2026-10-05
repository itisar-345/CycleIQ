import { Radius, Shadow, Spacing } from "@/constants/theme";
import { StyleSheet } from "react-native";

/** Layout for the Daily Log screen (colours are applied inline from the theme). */
export const logStyles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xl, paddingBottom: 48 },
  eyebrow: { fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5, marginTop: 4 },
  subtitle: { fontSize: 15, lineHeight: 21, marginTop: 6, marginBottom: Spacing.xl },
  autofill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  autofillTitle: { fontSize: 15, fontWeight: "700" },
  autofillHint: { fontSize: 13, marginTop: 2 },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  adjustBtn: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
  },
  adjustText: { fontSize: 15, fontWeight: "800" },
  valueText: { fontSize: 20, fontWeight: "800" },
  sourceTag: { fontSize: 12, fontWeight: "700", marginBottom: Spacing.sm },
  inputText: {
    borderWidth: 1,
    borderRadius: Radius.md,
    minHeight: 72,
    padding: Spacing.md,
    fontSize: 15,
    textAlignVertical: "top",
  },
  saveButton: {
    paddingVertical: 18,
    borderRadius: Radius.pill,
    alignItems: "center",
    marginTop: Spacing.sm,
    ...Shadow,
  },
  saveButtonText: { fontSize: 17, fontWeight: "800" },
  privacyNote: { textAlign: "center", fontSize: 12, marginTop: Spacing.md },
});
