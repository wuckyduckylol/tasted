import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Crown } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountUpText, Entrance } from '@/components/motion';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { listActiveChains } from '@/lib/db/catalog';
import { listMyRatingsWithItems, type RatingWithItem } from '@/lib/db/ratings';
import { bandColor, colors, fonts, radii, shadows, spacing } from '@/lib/theme';

export default function RanksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const ranked = useMemo(
    () =>
      [...(ratingsQuery.data ?? [])].sort(
        (a, b) => b.rating.personalScore - a.rating.personalScore,
      ),
    [ratingsQuery.data],
  );

  if (ratingsQuery.isLoading) {
    return (
      <View style={styles.screen}>
        <LoadingState />
      </View>
    );
  }
  if (ratingsQuery.isError) {
    return (
      <View style={styles.screen}>
        <ErrorState message="Could not load your ranks." onRetry={() => ratingsQuery.refetch()} />
      </View>
    );
  }

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  // Visual order 2-1-3 (winner center); guard for fewer than 3.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as RatingWithItem[];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <FlatList
        data={rest}
        keyExtractor={(entry) => entry.rating.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => void ratingsQuery.refetch()}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>your ranks</Text>
            <Text style={styles.subtitle}>
              {ranked.length} dish{ranked.length === 1 ? '' : 'es'} · sorted by your score
            </Text>
            {podium.length > 0 ? (
              <View style={styles.podium}>
                {podiumOrder.map((entry) => {
                  const overallRank = ranked.indexOf(entry) + 1;
                  const first = overallRank === 1;
                  return (
                    <Entrance
                      key={entry.rating.id}
                      delay={first ? 80 : 180}
                      pop
                      style={[styles.podiumCol, first && styles.podiumColFirst]}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Number ${overallRank}: ${entry.item.name}, ${entry.rating.personalScore.toFixed(1)}`}
                        onPress={() => router.push(`/item/${entry.item.id}`)}
                        style={({ pressed }) => [
                          styles.podiumCard,
                          first && styles.podiumCardFirst,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        {first ? (
                          <Crown color={colors.fine} size={20} strokeWidth={2.4} style={styles.crown} />
                        ) : null}
                        <View style={[styles.podiumRank, first && styles.podiumRankFirst]}>
                          <Text style={[styles.podiumRankNum, first && styles.podiumRankNumFirst]}>
                            {overallRank}
                          </Text>
                        </View>
                        <Text style={styles.podiumName} numberOfLines={2}>
                          {entry.item.name}
                        </Text>
                        <Text style={styles.podiumChain} numberOfLines={1}>
                          {chainName.get(entry.item.chainId) ?? ''}
                        </Text>
                        <CountUpText
                          value={entry.rating.personalScore}
                          decimals={1}
                          delay={first ? 300 : 450}
                          style={[
                            styles.podiumScore,
                            first && styles.podiumScoreFirst,
                            { color: bandColor(entry.rating.band) },
                          ]}
                        />
                      </Pressable>
                    </Entrance>
                  );
                })}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          podium.length === 0 ? (
            <EmptyState
              title="no ranks yet"
              detail="rate anything you've eaten and your tier list starts here."
            />
          ) : null
        }
        renderItem={({ item: entry, index }) => (
          <Entrance delay={Math.min(index, 8) * 40}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Number ${index + 4}: ${entry.item.name}, your score ${entry.rating.personalScore.toFixed(1)}`}
              onPress={() => router.push(`/item/${entry.item.id}`)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.rank}>{index + 4}</Text>
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
          </Entrance>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  header: { gap: 2, marginBottom: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.text },
  subtitle: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  podiumCol: { flex: 1 },
  podiumColFirst: { flex: 1.15 },
  podiumCard: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...shadows.soft,
  },
  podiumCardFirst: { borderRadius: radii.lg, paddingVertical: spacing.lg - 4 },
  crown: { marginBottom: 2 },
  podiumRank: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankFirst: { width: 38, height: 38, backgroundColor: colors.accentSoft },
  podiumRankNum: { fontFamily: fonts.display, fontSize: 15, color: colors.textMuted },
  podiumRankNumFirst: { fontSize: 17, color: colors.accent },
  podiumName: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.text,
    textAlign: 'center',
  },
  podiumChain: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.textFaint },
  podiumScore: { fontFamily: fonts.display, fontSize: 22 },
  podiumScoreFirst: { fontSize: 26 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    minHeight: 60,
    ...shadows.soft,
  },
  rank: { fontFamily: fonts.display, fontSize: 15, color: colors.textFaint, width: 26, textAlign: 'center' },
  info: { flex: 1, gap: 1 },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  chain: { fontFamily: fonts.bodySemiBold, fontSize: 11.5, color: colors.textFaint },
  score: { fontFamily: fonts.display, fontSize: 18 },
});
