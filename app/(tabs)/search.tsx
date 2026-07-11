import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, CupSoda, IceCreamCone, Sandwich, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Entrance } from '@/components/motion';
import { communityContextLine } from '@/components/score';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { useForYouData, type ForYouData } from '@/features/recommendations/hooks';
import { listActiveChains, listAllActiveItems, searchItems } from '@/lib/db/catalog';
import { colors, fonts, minTapTarget, radii, shadows, spacing } from '@/lib/theme';
import type { Bucket, Item } from '@/types/domain';

const BUCKETS: { value: Bucket | null; label: string }[] = [
  { value: null, label: 'all' },
  { value: 'savory', label: 'savory' },
  { value: 'sweet', label: 'sweet' },
  { value: 'drinks', label: 'drinks' },
];

/**
 * Ordering is preference-driven (predictions → community score → name) but
 * deliberately silent: no scores or "for you" copy render in this tab.
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

function BucketGlyph({ bucket }: { bucket: Bucket }) {
  const Icon = bucket === 'drinks' ? CupSoda : bucket === 'sweet' ? IceCreamCone : Sandwich;
  return <Icon color={colors.accent} size={22} strokeWidth={1.8} />;
}

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const rateMode = mode === 'rate';
  const [query, setQuery] = useState('');
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const trimmed = query.trim();
  const searching = trimmed.length >= 2;

  const browseQuery = useQuery({ queryKey: ['allItems'], queryFn: listAllActiveItems });
  const chainsQuery = useQuery({ queryKey: ['chains'], queryFn: listActiveChains });
  const resultsQuery = useQuery({
    queryKey: ['search', trimmed],
    queryFn: () => searchItems(trimmed),
    enabled: searching,
  });

  const chainName = useMemo(
    () => new Map((chainsQuery.data ?? []).map((c) => [c.id, c.name])),
    [chainsQuery.data],
  );

  const pool = searching ? (resultsQuery.data ?? []) : (browseQuery.data ?? []);
  const forYou = useForYouData(pool);

  const listed = useMemo(() => {
    const inBucket = pool.filter((i) => bucket === null || i.bucket === bucket);
    return orderByPreference(inBucket, forYou);
  }, [pool, bucket, forYou]);

  const activeQuery = searching ? resultsQuery : browseQuery;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.controls}>
        <Text style={styles.title}>{rateMode ? 'pick something to rate' : 'search'}</Text>
        <View style={styles.field}>
          <Search color={colors.accent} size={19} strokeWidth={2.4} />
          <TextInput
            accessibilityLabel="Search the catalog"
            value={query}
            onChangeText={(t) => setQuery(t.slice(0, 64))}
            placeholder="fries, whopper, frosty…"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            returnKeyType="search"
            style={styles.fieldInput}
          />
        </View>
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
          renderItem={({ item, index }) => {
            const context = communityContextLine(forYou.scores.get(item.id) ?? null);
            const chain = chainName.get(item.chainId);
            return (
              <Entrance delay={Math.min(index, 8) * 40}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={rateMode ? `Rate ${item.name}` : item.name}
                  onPress={() =>
                    rateMode ? router.push(`/rate/${item.id}`) : router.push(`/item/${item.id}`)
                  }
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={styles.thumb}>
                    <BucketGlyph bucket={item.bucket} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {chain ? `${chain} · ` : ''}
                      {context}
                    </Text>
                  </View>
                  <ChevronRight color={colors.candy} size={20} strokeWidth={2.4} />
                </Pressable>
              </Entrance>
            );
          }}
          ItemSeparatorComponent={Separator}
        />
      )}
    </View>
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  controls: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.sm },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.text },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    ...shadows.soft,
  },
  fieldInput: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15.5,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  buckets: { flexDirection: 'row', gap: spacing.sm },
  bucketChip: {
    minHeight: minTapTarget - 12,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    ...shadows.soft,
  },
  bucketChipActive: { backgroundColor: colors.accent },
  bucketLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.text },
  bucketLabelActive: { color: colors.onAccent },
  list: { padding: spacing.md, paddingTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 68,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    ...shadows.soft,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.candySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.text },
  rowSub: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted },
  pressed: { opacity: 0.8 },
});
