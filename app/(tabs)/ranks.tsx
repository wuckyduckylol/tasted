import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState, ScreenContainer } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { listActiveChains } from '@/lib/db/catalog';
import { listMyRatingsWithItems, type RatingWithItem } from '@/lib/db/ratings';
import { bandColor, colors, fonts, radii, shadows, spacing, type } from '@/lib/theme';
import type { Band } from '@/types/domain';

const BAND_ORDER: Band[] = ['loved', 'fine', 'disliked'];
const BAND_LABEL: Record<Band, string> = {
  loved: 'loved it',
  fine: 'it was fine',
  disliked: 'didn’t like it',
};

interface RankedEntry extends RatingWithItem {
  rank: number;
}

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

  const sections = useMemo(() => {
    const sorted = [...(ratingsQuery.data ?? [])].sort(
      (a, b) => b.rating.personalScore - a.rating.personalScore,
    );
    const ranked: RankedEntry[] = sorted.map((entry, i) => ({ ...entry, rank: i + 1 }));
    return BAND_ORDER.map((band) => ({
      band,
      title: BAND_LABEL[band],
      data: ranked.filter((e) => e.rating.band === band),
    })).filter((s) => s.data.length > 0);
  }, [ratingsQuery.data]);

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
      <SectionList
        sections={sections}
        keyExtractor={(entry) => entry.rating.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
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
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <View style={[styles.bandDot, { backgroundColor: bandColor(section.band as Band) }]} />
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item: entry }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Number ${entry.rank}: ${entry.item.name}, your score ${entry.rating.personalScore.toFixed(1)}`}
            onPress={() => router.push(`/item/${entry.item.id}`)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.rank}>{entry.rank}</Text>
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
        SectionSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  bandDot: { width: 10, height: 10, borderRadius: radii.pill },
  sectionTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 19,
    color: colors.text,
  },
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
