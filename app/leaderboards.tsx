import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ItemRow } from '@/components/ItemRow';
import { EmptyState, ErrorState, LoadingState, ScreenContainer } from '@/components/ui';
import { bestOfTag, listTags } from '@/lib/db/leaderboards';
import { colors, minTapTarget, spacing } from '@/lib/theme';

export default function LeaderboardsScreen() {
  const router = useRouter();
  const [tagSlug, setTagSlug] = useState<string | null>(null);

  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: listTags });
  const boardQuery = useQuery({
    queryKey: ['leaderboard', tagSlug],
    queryFn: () => bestOfTag(tagSlug as string),
    enabled: Boolean(tagSlug),
  });

  if (tagsQuery.isLoading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }
  if (tagsQuery.isError) {
    return (
      <ScreenContainer>
        <ErrorState message="Could not load categories." onRetry={() => tagsQuery.refetch()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: 'Leaderboards' }} />
      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {(tagsQuery.data ?? []).map((tag) => (
            <Pressable
              key={tag.id}
              accessibilityRole="button"
              accessibilityState={{ selected: tagSlug === tag.slug }}
              onPress={() => setTagSlug(tag.slug)}
              style={[styles.chip, tagSlug === tag.slug && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, tagSlug === tag.slug && styles.chipLabelActive]}>
                {tag.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {!tagSlug ? (
        <EmptyState title="Pick a category" detail="Best fries, best chicken sandwich — cross-chain." />
      ) : boardQuery.isLoading ? (
        <LoadingState />
      ) : boardQuery.isError ? (
        <ErrorState message="Could not load this leaderboard." onRetry={() => boardQuery.refetch()} />
      ) : (
        <FlatList
          data={boardQuery.data ?? []}
          keyExtractor={(entry) => entry.item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="No ranked items yet"
              detail="Items appear once they have at least 5 community ratings."
            />
          }
          renderItem={({ item: entry, index }) => (
            <View style={styles.rankRow}>
              <Text style={styles.rank}>{index + 1}</Text>
              <View style={styles.rowFlex}>
                <ItemRow
                  item={entry.item}
                  score={entry.score}
                  lead={{ kind: 'community', worthItPct: entry.score.worthItPct ?? 0 }}
                  onPress={(itemId) => router.push(`/item/${itemId}`)}
                />
              </View>
            </View>
          )}
          ItemSeparatorComponent={Separator}
        />
      )}
    </ScreenContainer>
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const styles = StyleSheet.create({
  chipsWrap: { paddingVertical: spacing.sm },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.md },
  chip: {
    minHeight: minTapTarget - 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  chipLabelActive: { color: '#FFFFFF' },
  list: { padding: spacing.md },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rank: { width: 24, fontSize: 16, fontWeight: '800', color: colors.textMuted, textAlign: 'center' },
  rowFlex: { flex: 1 },
});
