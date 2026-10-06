import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useTx } from '@/utils/tone';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { getArticleReviewStatus, getFilteredArticles } from '@/data/articles';

export default function EducationScreen() {
  const tx = useTx();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { currentMode } = useAppStore();
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const articles = getFilteredArticles(currentMode, query);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/analytics"))}
          style={styles.backHit}
          accessibilityRole="button"
        >
          <Text style={{ color: theme.tint, fontWeight: "700", fontSize: 16 }}>{tx("‹ back", "‹ Back")}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">{tx("learn stuff 📚", "Learn")}</Text>
        <TextInput
          accessibilityLabel={tx("Search articles", "Search articles")}
          style={[styles.search, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          placeholder={tx("search anything — cramps, PCOS, sleep…", "Search articles")}
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {articles.length === 0 ? (
          <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 20 }} accessibilityLiveRegion="polite">{tx("nothing matched that 🤔 try another word?", "No articles found.")}</Text>
        ) : (
          articles.map((article) => {
            const review = getArticleReviewStatus(article);
            const expanded = expandedId === article.id;
            return (
              <TouchableOpacity
                key={article.id}
                style={[styles.card, { backgroundColor: theme.surface, borderColor: review.isReviewDue ? theme.error : theme.border }]}
                onPress={() => setExpandedId(expanded ? null : article.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityHint={expanded ? tx("Collapses the article", "Collapses the article") : tx("Shows the full article", "Shows the full article")}
              >
                <View style={styles.tagWrap}>
                  <Text style={[styles.tag, { backgroundColor: theme.tint + '20', color: theme.tint }]}>
                    {article.category}
                  </Text>
                  {review.isReviewDue && (
                    <Text style={[styles.tag, { backgroundColor: theme.error + '20', color: theme.error }]}>
                      {tx("needs a fresh review", "Review due")}
                    </Text>
                  )}
                </View>
                <Text style={[styles.cardTitle, { color: theme.text }]} accessibilityRole="header">{article.title}</Text>
                <Text style={[styles.cardPreview, { color: expanded ? theme.text : theme.textSecondary }]} numberOfLines={expanded ? undefined : 3}>{article.content}</Text>
                <Text style={{ color: theme.tint, fontWeight: "700", marginTop: 8 }}>
                  {expanded ? tx("show less ↑", "Show less") : tx("read more ↓", "Read more")}
                </Text>
                <Text style={[styles.cardFooter, { color: review.isReviewDue ? theme.error : theme.textSecondary }]}>
                  {tx("fact-checked", "Reviewed")} {article.lastReviewed.split("T")[0]} · {article.evidenceGrade} · {review.label}
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
  backHit: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
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
