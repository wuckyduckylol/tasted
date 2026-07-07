import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState, ScreenContainer } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { listActiveChains } from '@/lib/db/catalog';
import { listMyRatingsWithItems } from '@/lib/db/ratings';
import { bandColor, colors, fonts, radii, shadows, spacing, type } from '@/lib/theme';

export default function RanksScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id ?? '';

  const ratingsQuery = useQuery({
    queryKey: ['myRatingsWithItems', userId],
    queryFn: () => listMyRatingsWithItems(userId),
    enabled: Boolean(session),
  });
  const chainsQuery = useQuery({ queryKey: ['chains'], queryFn: listActiveChains });

  const chainName = useMemo(
    () => new Map((chainsQuery.data ?? []).map((c) => [c.id, c.name])),
    [chainsQuery.data],
  );

  // One continuous tier list — the band shows through the score color alone.
  const ranked = useMemo(
    () =>
      [...(ratingsQuery.data ?? [])].sort(
        (a, b) => b.rating.personalScore - a.rating.personalScore,
      ),
    [ratingsQuery.data],
  );

  if (ratingsQuery.isLoading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }
  if (ratingsQuery.isError) {
    return (
      <ScreenContainer>
        <ErrorState message="Could not load your ranks." onRetry={() => ratingsQuery.refetch()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        data={ranked}
        keyExtractor={(entry) => entry.rating.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => void ratingsQuery.refetch()}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="no ranks yet"
            detail="Rate anything you’ve eaten and your tier list starts here."
          />
        }
        renderItem={({ item: entry, index }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Number ${index + 1}: ${entry.item.name}, your score ${entry.rating.personalScore.toFixed(1)}`}
            onPress={() => router.push(`/item/${entry.item.id}`)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.rank}>{index + 1}</Text>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {entry.item.name}
              </Text>
              <Text style={styles.chain} numberOfLines={1}>
                {chainName.get(entry.item.chainId) ?? ''}
              </Text>
            </View>
            <Text style={[styles.score, { color: bandColor(entry.rating.band) }]}>
              {entry.rating.personalScore.toFixed(1)}
            </Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 64,
    ...shadows.card,
  },
  rank: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.accent,
    width: 30,
    textAlign: 'center',
  },
  info: { flex: 1, gap: 1 },
  name: { ...type.bodyStrong },
  chain: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted },
  score: { fontFamily: fonts.display, fontSize: 20 },
});
