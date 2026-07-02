import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ItemRow } from '@/components/ItemRow';
import { EmptyState, ErrorState, LoadingState, ScreenContainer, TextField } from '@/components/ui';
import { useForYouData } from '@/features/recommendations/hooks';
import { leadDisplay } from '@/features/recommendations/predict';
import { searchItems } from '@/lib/db/catalog';
import { colors, minTapTarget, spacing } from '@/lib/theme';
import type { Bucket } from '@/types/domain';

const BUCKETS: { value: Bucket | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'savory', label: 'Savory' },
  { value: 'sweet', label: 'Sweet' },
  { value: 'drinks', label: 'Drinks' },
];

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const trimmed = query.trim();

  const resultsQuery = useQuery({
    queryKey: ['search', trimmed],
    queryFn: () => searchItems(trimmed),
    enabled: trimmed.length >= 2,
  });
  const filtered = (resultsQuery.data ?? []).filter((i) => bucket === null || i.bucket === bucket);
  const forYou = useForYouData(resultsQuery.data);

  return (
    <ScreenContainer>
      <View style={styles.controls}>
        <TextField
          label="Search"
          value={query}
          onChangeText={setQuery}
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
      {trimmed.length < 2 ? (
        <EmptyState title="Search the catalog" detail="Type at least two characters." />
      ) : resultsQuery.isLoading ? (
        <LoadingState />
      ) : resultsQuery.isError ? (
        <ErrorState message="Search failed." onRetry={() => resultsQuery.refetch()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState title="No matches" detail="Try a different name or category." />
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  bucketChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  bucketLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  bucketLabelActive: { color: '#FFFFFF' },
  list: { padding: spacing.md },
});
