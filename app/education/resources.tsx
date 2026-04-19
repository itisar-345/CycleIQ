import { useAppStore } from "@/store";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RESOURCES = [
  {
    title: "Immediate Crisis Support",
    items: [
      "US: National Suicide Prevention Lifeline - 988 (24/7)",
      "UK: Samaritans - 116 123 (24/7)",
      "Australia: Lifeline - 13 11 14 (24/7)",
      "Canada: Crisis Services Canada - 1 833 456 4566",
    ],
    color: "#FF4757",
  },
  {
    title: "Mental Health Therapy",
    items: [
      "Psychology Today Directory (find therapists by insurance/location)",
      "BetterHelp (online therapy, text/video)",
      "Open Path Collective (affordable therapy $30-60/session)",
      'Local: Search "mental health therapy near me"',
    ],
    color: "#3742FA",
  },
  {
    title: "Chronic Pain & Mood Resources",
    items: [
      "Pain Connection (chronic pain support)",
      "Anxiety & Depression Association of America (ADAA)",
      "Mind.org.uk (UK mental health charity)",
      "Beyond Blue (Australia mood/pain support)",
    ],
    color: "#2ED573",
  },
];

const getUserRegion = () => {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz.includes('Europe/London')) return 'UK';
        if (tz.includes('Australia')) return 'Australia';
        if (tz.includes('America/Toronto') || tz.includes('America/Vancouver')) return 'Canada';
    } catch(e) {}
    return 'US';
};

export default function ResourcesScreen() {
  const currentMode = useAppStore((state) => state.currentMode);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mental Health Resources</Text>
        <Text style={styles.subtitle}>
          Non-clinical support options. These are not substitutes for
          professional care.
        </Text>

        {RESOURCES.map((section, i) => {
          const region = getUserRegion();
          // Filter items that start with a region tag (e.g. "US:", "UK:"), explicitly ignoring items that don't match the region.
          // Generic items (without a colon-separated region prefix) will always be included.
          const filteredItems = section.items.filter(item => {
            const match = item.match(/^([A-Za-z]+):/);
            if (match) {
                return match[1] === region;
            }
            return true;
          });

          return (
          <View
            key={i}
            style={[styles.section, { borderColor: section.color + "20" }]}
          >
            <Text style={[styles.sectionTitle, { color: section.color }]}>
              {section.title}
            </Text>
            {filteredItems.map((item, j) => (
              <TouchableOpacity
                key={j}
                style={styles.resourceItem}
                activeOpacity={0.7}
              >
                <Text style={styles.resourceText}>{item.replace(/^([A-Za-z]+):\s*/, '')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )})}

        {currentMode === "endo" && (
          <View style={styles.note}>
            <Text style={styles.noteText}>
              For endometriosis-related pain and mental health, EndoFound.org
              offers peer support and resources.
            </Text>
          </View>
        )}

        {currentMode === "pcos" && (
          <View style={styles.note}>
            <Text style={styles.noteText}>
              PCOS Awareness Association provides mental health resources
              specific to PCOS experiences.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#2A2422",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
    color: "#6B7280",
  },
  section: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  resourceItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  resourceText: { fontSize: 16, color: "#1F2937", lineHeight: 24 },
  note: {
    backgroundColor: "#FEF3C7",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  noteText: { color: "#92400E", fontSize: 15, lineHeight: 22 },
});
