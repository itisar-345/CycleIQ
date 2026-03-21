import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';

const MOCK_ARTICLES = [
  { id: 1, title: 'Understanding your cycle phases', tags: ['standard', 'peri', 'pcos', 'endo'], author: 'Dr. Smith, Gynaecologist' },
  { id: 2, title: 'Navigating PCOS: Symptoms and Management', tags: ['pcos'], author: 'Dr. Jones, Endocrinologist' },
  { id: 3, title: 'Endometriosis Staging Explained', tags: ['endo'], author: 'Dr. Lee, Excision Specialist' },
  { id: 4, title: 'Mental Health and Hormones', tags: ['standard', 'pcos', 'endo', 'peri'], author: 'Dr. Adams, Psychologist' },
  { id: 5, title: 'Evidence-based Pain Management (Heat & Diet)', tags: ['endo', 'pcos'], author: 'Dr. Smith, Gynaecologist' },
  { id: 6, title: 'When to see a doctor: Red Flags', tags: ['standard', 'pcos', 'endo', 'peri'], author: 'CycleIQ Medical Board' }
];

export default function EducationHub() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { currentMode } = useAppStore();

  const sortedArticles = [...MOCK_ARTICLES].sort((a, b) => {
    const aMatch = a.tags.includes(currentMode) ? 1 : 0;
    const bMatch = b.tags.includes(currentMode) ? 1 : 0;
    return bMatch - aMatch;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.tint, fontSize: 18, fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text, marginTop: 10 }]}>Education Hub</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Evidence-based articles prioritized for {currentMode.toUpperCase()}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {sortedArticles.map((article) => (
          <TouchableOpacity key={article.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
             <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {article.tags.map(tag => (
                  <View key={tag} style={[styles.tag, { backgroundColor: theme[tag as keyof typeof theme] || theme.tint }]}>
                    <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
                  </View>
                ))}
             </View>
             <Text style={[styles.articleTitle, { color: theme.text }]}>{article.title}</Text>
             <Text style={[styles.authorText, { color: theme.textSecondary }]}>Reviewed by {article.author}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 32, fontWeight: 'bold' },
  subtitle: { fontSize: 15, marginTop: 4 },
  content: { padding: 20 },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 10, fontWeight: 'bold', color: '#2A2422' },
  articleTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  authorText: { fontSize: 13, fontStyle: 'italic' }
});
