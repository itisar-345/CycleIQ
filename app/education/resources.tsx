import { Colors, Radius, Shadow, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { useTx } from "@/utils/tone";
import { router } from "expo-router";
import { HeartHandshake, Phone, Sofa, type LucideIcon } from "@/components/icons";
import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Region = "IN" | "US" | "UK" | "AU" | "CA";

interface Resource {
  label: string;
  /** Dialable number, if this is a phone line. */
  phone?: string;
  /** Only shown in this region; omit for everywhere. */
  region?: Region;
}

const CRISIS_LINES: Resource[] = [
  { label: "Tele-MANAS (24/7, free, many languages)", phone: "14416", region: "IN" },
  { label: "KIRAN mental health helpline (24/7)", phone: "18005990019", region: "IN" },
  { label: "988 Suicide & Crisis Lifeline (24/7)", phone: "988", region: "US" },
  { label: "Samaritans (24/7)", phone: "116123", region: "UK" },
  { label: "Lifeline (24/7)", phone: "131114", region: "AU" },
  { label: "9-8-8 Suicide Crisis Helpline (24/7)", phone: "988", region: "CA" },
];

const SECTIONS: { title: string; Icon: LucideIcon; items: Resource[] }[] = [
  {
    title: "Talk to someone right now",
    Icon: Phone,
    items: CRISIS_LINES,
  },
  {
    title: "Find a therapist",
    Icon: Sofa,
    items: [
      { label: "Psychology Today directory (filter by location & cost)" },
      { label: "Open Path Collective (lower-cost therapy)" },
      { label: 'Search "mental health therapy near me"' },
    ],
  },
  {
    title: "Chronic pain & mood support",
    Icon: HeartHandshake,
    items: [
      { label: "Pain Connection (chronic pain peer support)" },
      { label: "Anxiety & Depression Association of America (ADAA)" },
      { label: "Mind.org.uk (UK mental health charity)" },
      { label: "Beyond Blue (Australia)" },
    ],
  },
];

const getUserRegion = (): Region | null => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") return "IN";
    if (tz === "Europe/London") return "UK";
    if (tz.startsWith("Australia/")) return "AU";
    if (["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Halifax", "America/St_Johns"].includes(tz)) return "CA";
    if (tz.startsWith("America/")) return "US";
  } catch {}
  return null;
};

export default function ResourcesScreen() {
  const theme = Colors[useColorScheme() ?? "light"];
  const tx = useTx();
  const currentMode = useAppStore((state) => state.currentMode);
  const region = getUserRegion();

  const visible = (item: Resource) => !item.region || item.region === region;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
          <Text style={[styles.backText, { color: theme.tint }]}>{tx("‹ back", "‹ Back")}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} accessibilityRole="header">{tx("support", "Support")}</Text>
        <View style={{ width: 64 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">{tx("You don't have to do this alone", "You don't have to manage this alone")}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {tx(
            "Reaching out is a strong move, not a weak one. These are support options — not a replacement for professional care.",
            "Reaching out takes strength. These support options don't replace professional care.",
          )}
        </Text>

        <View style={[styles.emergency, { backgroundColor: theme.tintSoft }]}>
          <Text style={[styles.emergencyText, { color: theme.onTintSoft }]}>
            If you&apos;re in danger right now, call your local emergency number
            {region === "IN" ? " (112)" : region === "UK" ? " (999)" : region === "AU" ? " (000)" : region ? " (911)" : ", such as 112 or 911"}.
          </Text>
        </View>

        {SECTIONS.map((section) => {
          const items = section.items.filter(visible);
          // Outside a known region, show every crisis line rather than none.
          const shown = items.length > 0 ? items : section.items;
          return (
            <View key={section.title} style={[styles.section, { backgroundColor: theme.surface }, Shadow]}>
              <View style={styles.sectionTitleRow}>
                <section.Icon size={20} color={theme.tint} strokeWidth={2.25} />
                <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">{section.title}</Text>
              </View>
              {shown.map((item, j) => {
                const callable = !!item.phone;
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.resourceItem, j > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}
                    activeOpacity={callable ? 0.6 : 1}
                    disabled={!callable}
                    onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}
                    accessibilityRole={callable ? "button" : "text"}
                    accessibilityLabel={callable ? `Call ${item.label}, ${item.phone}` : item.label}
                  >
                    <Text style={[styles.resourceText, { color: theme.text }]}>{item.label}</Text>
                    {callable && (
                      <View style={[styles.callPill, { backgroundColor: theme.tint }]}>
                        <Text style={[styles.callText, { color: theme.onTint }]}>{tx("Call", "Call")} {item.phone}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {currentMode === "endo" && (
          <View style={[styles.note, { backgroundColor: theme.surfaceAlt }]}>
            <Text style={[styles.noteText, { color: theme.text }]}>
              {tx("Endo-specific: EndoFound.org has peer support for the pain and the mental load.", "For endometriosis: EndoFound.org offers peer support and resources.")}
            </Text>
          </View>
        )}

        {currentMode === "pcos" && (
          <View style={[styles.note, { backgroundColor: theme.surfaceAlt }]}>
            <Text style={[styles.noteText, { color: theme.text }]}>
              {tx("PCOS-specific: the PCOS Awareness Association has mental health resources made for PCOS life.", "For PCOS: the PCOS Awareness Association provides mental health resources.")}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  backButton: { width: 64, paddingVertical: Spacing.sm },
  backText: { fontWeight: "700", fontSize: 16 },
  content: { padding: Spacing.xl, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "800", marginBottom: Spacing.sm, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: Spacing.xl },
  emergency: { padding: Spacing.lg, borderRadius: Radius.md, marginBottom: Spacing.xl },
  emergencyText: { fontSize: 15, fontWeight: "700", lineHeight: 21 },
  section: { borderRadius: Radius.lg, padding: Spacing.xl, marginBottom: Spacing.lg },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  resourceItem: { paddingVertical: Spacing.md, gap: Spacing.sm },
  resourceText: { fontSize: 15, lineHeight: 22 },
  callPill: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
  callText: { fontWeight: "800", fontSize: 14 },
  note: { padding: Spacing.lg, borderRadius: Radius.md, marginTop: Spacing.sm },
  noteText: { fontSize: 15, lineHeight: 22 },
});
