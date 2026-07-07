import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ItemRow } from '@/components/ItemRow';
import { EmptyState, ErrorState, LoadingState, ScreenContainer, TextField } from '@/components/ui';
import { useForYouData, type ForYouData } from '@/features/recommendations/hooks';
import { leadDisplay } from '@/features/recommendations/predict';
import { listAllActiveItems, searchItems } from '@/lib/db/catalog';
import { colors, fonts, minTapTarget, radii, spacing } from '@/lib/theme';
import type { Bucket, Item } from '@/types/domain';

const BUCKETS: { value: Bucket | null; label: string }[] = [
  { value: null, label: 'all' },
  { value: 'savory', label: 'savory' },
  { value: 'sweet', label: 'sweet' },
  { value: 'drinks', label: 'drinks' },
];

/**
 * Ordering is preference-driven (predictions → community score → name) but
 * deliberately silent: no scores or "for you" copy render in this tab — the
 * ranking exists to surface items the user is likely to tap.
 */
function orderByPreference(items: Item[], forYou: ForYouData): Item[] {
  function sortKey(item: Item): number {
    const predicted = forYou.predictions.get(item.id)?.score;
    if (predicted !== undefined && predicted !== null) return predicted;
    const community = forYou.scores.get(item.id)?.weightedScore;
    return community ?? -1;
  }
  return [...items].sort((a, b) => sortKey(b) - sortKey(a) || a.name.localeCompare(b.name));
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const trimmed = query.trim();
  const searching = trimmed.length >= 2;

  const browseQuery = useQuery({ queryKey: ['allItems'], queryFn: listAllActiveItems });
  const resultsQuery = useQuery({
    queryKey: ['search', trimmed],
    queryFn: () => searchItems(trimmed),
    enabled: searching,
  });

  const pool = searching ? (resultsQuery.data ?? []) : (browseQuery.data ?? []);
  const forYou = useForYouData(pool);

  const listed = useMemo(() => {
    const inBucket = pool.filter((i) => bucket === null || i.bucket === bucket);
    return orderByPreference(inBucket, forYou);
  }, [pool, bucket, forYou]);

  const activeQuery = searching ? resultsQuery : browseQuery;

  return (
    <ScreenContainer>
      <View style={styles.controls}>
        <TextField
          label="Search"
          labelHidden
          value={query}
          onChangeText={(t) => setQuery(t.slice(0, 64))}
          placeholder="Fries, Whopper, Frosty…"
          autoCapitalize="none"
          returnKeyType="search"
        />
        <View style={styles.buckets}>
          {BUCKETS.map(({ value, label }) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityState={{ selected: bucket === value }}
              onPress={() => setBucket(value)}
              style={[styles.bucketChip, bucket === value && styles.bucketChipActive]}
            >
              <Text style={[styles.bucketLabel, bucket === value && styles.bucketLabelActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {activeQuery.isLoading ? (
        <LoadingState />
      ) : activeQuery.isError ? (
        <ErrorState message="Search failed." onRetry={() => activeQuery.refetch()} />
      ) : (
        <FlatList
          data={listed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState title="no matches" detail="Try a different name or category." />
          }
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              score={forYou.scores.get(item.id) ?? null}
              lead={leadDisplay(
                'forYou',
                forYou.ratingsByItemId.get(item.id) ?? null,
                forYou.predictions.get(item.id) ?? null,
                forYou.scores.get(item.id) ?? null,
              )}
              showLead={false}
              onPress={(itemId) => router.push(`/item/${itemId}`)}
            />
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
  controls: { padding: spacing.md, gap: spacing.sm },
  buckets: { flexDirection: 'row', gap: spacing.sm },
  bucketChip: {
    minHeight: minTapTarget - 12,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  bucketChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  bucketLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  bucketLabelActive: { color: colors.onAccent },
  list: { padding: spacing.md, paddingTop: 0 },
});
