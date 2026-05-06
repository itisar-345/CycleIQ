import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { getArticleReviewStatus, getFilteredArticles } from '@/data/articles';

export default function EducationScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { currentMode } = useAppStore();
  const [query, setQuery] = useState("");
  const articles = getFilteredArticles(currentMode, query);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Support Hub</Text>
        <TextInput
          style={[styles.search, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          placeholder="Search articles..."
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {articles.length === 0 ? (
          <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 20 }}>No articles found.</Text>
        ) : (
          articles.map((article) => {
            const review = getArticleReviewStatus(article);
            return (
              <TouchableOpacity
                key={article.id}
                style={[styles.card, { backgroundColor: theme.surface, borderColor: review.isReviewDue ? theme.error : theme.border }]}
              >
                <View style={styles.tagWrap}>
                  <Text style={[styles.tag, { backgroundColor: theme.tint + '20', color: theme.tint }]}>
                    {article.category.toUpperCase()}
                  </Text>
                  {review.isReviewDue && (
                    <Text style={[styles.tag, { backgroundColor: theme.error + '20', color: theme.error }]}>
                      REVIEW DUE
                    </Text>
                  )}
                </View>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{article.title}</Text>
                <Text style={[styles.cardPreview, { color: theme.textSecondary }]} numberOfLines={3}>{article.content}</Text>
                <Text style={[styles.cardFooter, { color: review.isReviewDue ? theme.error : theme.textSecondary }]}>
                  Reviewed: {article.lastReviewed.split("T")[0]} • {article.evidenceGrade} • {review.label}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 32, fontWeight: 'bold' },
  search: { marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  content: { padding: 20 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tag: { fontSize: 12, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  cardPreview: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  cardFooter: { fontSize: 12, fontStyle: 'italic' },
});
