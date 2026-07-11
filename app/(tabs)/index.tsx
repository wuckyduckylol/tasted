import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight, Flame, Plus, Vote } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Marquee } from '@/components/Marquee';
import { Ambient, Entrance } from '@/components/motion';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { useForYouData } from '@/features/recommendations/hooks';
import { useSession } from '@/hooks/useSession';
import { listActiveChains, listAllActiveItems, listNewItems } from '@/lib/db/catalog';
import { getFriendsRecentRatings } from '@/lib/db/collab';
import { listChainCandidates } from '@/lib/db/votes';
import { isSupabaseConfigured, scoringConfig } from '@/lib/config';
import { weeklyStreak } from '@/lib/streak';
import { colors, fonts, radii, scoreColor, shadows, spacing } from '@/lib/theme';
import type { Chain, Item } from '@/types/domain';

interface BestPick {
  kind: 'own' | 'predicted' | 'locked';
  itemName?: string;
  score?: number;
  remaining?: number;
}

const CHIP_TINTS = [colors.butter, colors.peach, colors.candySoft] as const;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();

  const chainsQuery = useQuery({
    queryKey: ['chains'],
    queryFn: listActiveChains,
    enabled: isSupabaseConfigured && Boolean(session),
  });
  const itemsQuery = useQuery({
    queryKey: ['allItems'],
    queryFn: listAllActiveItems,
    enabled: isSupabaseConfigured && Boolean(session),
  });
  const friendsQuery = useQuery({
    queryKey: ['friendsFeed'],
    queryFn: () => getFriendsRecentRatings(10),
    enabled: isSupabaseConfigured && Boolean(session),
  });
  const dropsQuery = useQuery({
    queryKey: ['drops'],
    queryFn: listNewItems,
    enabled: isSupabaseConfigured && Boolean(session),
  });
  const candidatesQuery = useQuery({
    queryKey: ['chainCandidates'],
    queryFn: listChainCandidates,
    enabled: isSupabaseConfigured && Boolean(session),
  });
  const forYou = useForYouData(itemsQuery.data);

  const chainById = useMemo(
    () => new Map((chainsQuery.data ?? []).map((c) => [c.id, c])),
    [chainsQuery.data],
  );

  const streakWeeks = useMemo(
    () => weeklyStreak([...forYou.ratingsByItemId.values()].map((r) => r.updatedAt)),
    [forYou.ratingsByItemId],
  );

  // Per-chain hero line: own best → best prediction → rate-to-unlock (handoff 3a).
  const bestPicks = useMemo(() => {
    const byChain = new Map<string, BestPick>();
    const items = itemsQuery.data ?? [];
    const ratedCount = forYou.ratingsByItemId.size;
    for (const chain of chainsQuery.data ?? []) {
      const chainItems = items.filter((i) => i.chainId === chain.id);
      let own: { item: Item; score: number } | null = null;
      let predicted: { item: Item; score: number } | null = null;
      for (const item of chainItems) {
        const rating = forYou.ratingsByItemId.get(item.id);
        if (rating && (!own || rating.personalScore > own.score)) {
          own = { item, score: rating.personalScore };
        }
        const prediction = forYou.predictions.get(item.id);
        if (prediction && (!predicted || prediction.score > predicted.score)) {
          predicted = { item, score: prediction.score };
        }
      }
      if (own) {
        byChain.set(chain.id, { kind: 'own', itemName: own.item.name, score: own.score });
      } else if (predicted) {
        byChain.set(chain.id, {
          kind: 'predicted',
          itemName: predicted.item.name,
          score: predicted.score,
        });
      } else {
        byChain.set(chain.id, {
          kind: 'locked',
          remaining: Math.max(1, scoringConfig.minRatingsForPersonalization - ratedCount),
        });
      }
    }
    return byChain;
  }, [chainsQuery.data, itemsQuery.data, forYou.ratingsByItemId, forYou.predictions]);

  // Ticker: drops / community-score / vote news only (no friend items).
  const voteLeader = useMemo(() => {
    const open = (candidatesQuery.data ?? []).filter((c) => !c.isUnlocked);
    return open.sort((a, b) => b.voteCount - a.voteCount)[0] ?? null;
  }, [candidatesQuery.data]);

  const tickerPhrases = useMemo(() => {
    const phrases: string[] = [];
    for (const drop of (dropsQuery.data ?? []).slice(0, 2)) {
      phrases.push(`new drop: ${drop.name.toLowerCase()}`);
    }
    let top: { item: Item; score: number } | null = null;
    for (const item of itemsQuery.data ?? []) {
      const s = forYou.scores.get(item.id);
      if (s && s.numRatings >= 5 && s.weightedScore !== null) {
        if (!top || s.weightedScore > top.score) top = { item, score: s.weightedScore };
      }
    }
    if (top) {
      const chainName = chainById.get(top.item.chainId)?.name ?? '';
      phrases.push(
        `${top.item.name.toLowerCase()} holding ${top.score.toFixed(1)}${chainName ? ` at ${chainName.toLowerCase()}` : ''}`,
      );
    }
    if (voteLeader) phrases.push(`${voteLeader.name.toLowerCase()} leads the vote`);
    return phrases;
  }, [dropsQuery.data, itemsQuery.data, forYou.scores, chainById, voteLeader]);

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.screen}>
        <EmptyState
          title="backend not configured"
          detail="Copy .env.example to .env with your Supabase values to get started."
        />
      </View>
    );
  }
  if (chainsQuery.isLoading || itemsQuery.isLoading) {
    return (
      <View style={styles.screen}>
        <LoadingState />
      </View>
    );
  }
  if (chainsQuery.isError) {
    return (
      <View style={styles.screen}>
        <ErrorState message="Could not load chains." onRetry={() => chainsQuery.refetch()} />
      </View>
    );
  }

  const friends = friendsQuery.data ?? [];
  const chains = chainsQuery.data ?? [];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              void chainsQuery.refetch();
              void itemsQuery.refetch();
              void friendsQuery.refetch();
              forYou.refetch();
            }}
            tintColor={colors.accent}
          />
        }
      >
        {/* Candy hero — the screen owns its top (no nav header). */}
        <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
          <Ambient kind="drift" style={[styles.confetti, { top: 54, right: 34, width: 12, height: 12 }]}>
            <View style={[styles.confettiInner, { backgroundColor: colors.accent, opacity: 0.9 }]} />
          </Ambient>
          <Ambient kind="drift" delay={1200} style={[styles.confetti, { top: 96, left: 26, width: 9, height: 9 }]}>
            <View style={[styles.confettiInner, { backgroundColor: colors.base, opacity: 0.7 }]} />
          </Ambient>
          <Ambient kind="drift" delay={2400} style={[styles.confetti, { top: 30, left: 120, width: 10, height: 10 }]}>
            <View style={[styles.confettiInner, { backgroundColor: colors.accent, opacity: 0.7 }]} />
          </Ambient>

          <View style={styles.heroTop}>
            <Text style={styles.wordmark}>tasted</Text>
            {streakWeeks > 0 ? (
              <View style={styles.streakChip}>
                <Ambient kind="flicker">
                  <Flame color={colors.accent} size={14} strokeWidth={2.4} />
                </Ambient>
                <Text style={styles.streakText}>
                  {streakWeeks} week streak{streakWeeks > 1 ? '' : ''}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.heroTitle}>where are you eating?</Text>
        </View>

        {tickerPhrases.length > 0 ? (
          <View style={styles.tickerWrap}>
            <Marquee phrases={tickerPhrases} />
          </View>
        ) : null}

        {friends.length > 0 ? (
          <Entrance delay={50}>
            <Text style={styles.sectionHeader}>friends just rated</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.friendRow}
            >
              {friends.map((f, i) => (
                <Pressable
                  key={`${f.userId}-${f.itemId}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.username} rated ${f.itemName} ${f.personalScore.toFixed(1)}`}
                  onPress={() => router.push(`/item/${f.itemId}`)}
                  style={({ pressed }) => [styles.friendChip, pressed && styles.pressed]}
                >
                  <View style={[styles.friendAvatar, { backgroundColor: CHIP_TINTS[i % 3] }]}>
                    <Text style={styles.friendInitial}>{f.username.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={styles.friendName} numberOfLines={1}>
                      {f.username}
                    </Text>
                    <Text style={styles.friendItem} numberOfLines={1}>
                      {f.itemName}
                    </Text>
                  </View>
                  <Text style={[styles.friendScore, { color: scoreColor(f.personalScore) }]}>
                    {f.personalScore.toFixed(1)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Entrance>
        ) : null}

        {voteLeader ? (
          <Entrance delay={100} pop>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Vote the next chain"
              onPress={() => router.push('/vote')}
              style={({ pressed }) => [styles.voteCard, pressed && styles.pressed]}
            >
              <View style={styles.voteIconWrap}>
                <Vote color={colors.accent} size={20} strokeWidth={2.2} />
              </View>
              <View style={styles.voteText}>
                <Text style={styles.voteTitle}>vote the next chain</Text>
                <Text style={styles.voteSub}>
                  {voteLeader.name} leads · {voteLeader.voteCount} vote
                  {voteLeader.voteCount === 1 ? '' : 's'}
                </Text>
              </View>
              <ChevronRight color={colors.text} size={20} strokeWidth={2.2} />
            </Pressable>
          </Entrance>
        ) : null}

        <Text style={styles.sectionHeader}>pick a chain</Text>
        {chains.length === 0 ? (
          <EmptyState
            title="the menu's still loading up"
            detail="check back soon — chains land here as we add them."
          />
        ) : null}
        {chains.map((chain, i) => (
          <Entrance key={chain.id} delay={140 + i * 45}>
            <ChainRow
              chain={chain}
              pick={bestPicks.get(chain.id) ?? null}
              onPress={() => router.push(`/chain/${chain.id}`)}
            />
          </Entrance>
        ))}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Quick-rate FAB */}
      <Ambient kind="breathe" style={styles.fabWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Rate something"
          onPress={() => router.push({ pathname: '/(tabs)/search', params: { mode: 'rate' } })}
          style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.965 }] }]}
        >
          <Plus color={colors.onAccent} size={22} strokeWidth={2.6} />
          <Text style={styles.fabLabel}>rate</Text>
        </Pressable>
      </Ambient>
    </View>
  );
}

function ChainRow({
  chain,
  pick,
  onPress,
}: {
  chain: Chain;
  pick: BestPick | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${chain.name} menu`}
      onPress={onPress}
      style={({ pressed }) => [styles.chainCard, pressed && styles.pressed]}
    >
      <View style={styles.chainBadge}>
        <Text style={styles.chainInitial}>{chain.name.slice(0, 1)}</Text>
      </View>
      <View style={styles.chainText}>
        <Text style={styles.chainName} numberOfLines={1}>
          {chain.name}
        </Text>
        {pick?.kind === 'own' && pick.itemName !== undefined && pick.score !== undefined ? (
          <Text style={styles.chainSub} numberOfLines={1}>
            your best: {pick.itemName} ·{' '}
            <Text style={[styles.chainSubScore, { color: scoreColor(pick.score) }]}>
              {pick.score.toFixed(1)}
            </Text>
          </Text>
        ) : pick?.kind === 'predicted' && pick.itemName !== undefined && pick.score !== undefined ? (
          <Text style={styles.chainSub} numberOfLines={1}>
            try next: {pick.itemName} ·{' '}
            <Text style={[styles.chainSubScore, { color: scoreColor(pick.score) }]}>
              {pick.score.toFixed(1)}
            </Text>{' '}
            predicted
          </Text>
        ) : (
          <Text style={styles.chainSub} numberOfLines={1}>
            rate {pick?.remaining ?? scoringConfig.minRatingsForPersonalization} more to unlock
            predictions
          </Text>
        )}
      </View>
      <ChevronRight color={colors.candy} size={22} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  scroll: { paddingBottom: spacing.lg },
  hero: {
    backgroundColor: colors.candy,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    paddingHorizontal: spacing.lg - 4,
    paddingBottom: spacing.lg - 4,
  },
  confetti: { position: 'absolute' },
  confettiInner: { width: '100%', height: '100%', borderRadius: 3 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { fontFamily: fonts.display, fontSize: 24, color: colors.base },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(250, 247, 242, 0.4)',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  streakText: { fontFamily: fonts.bodyExtraBold, fontSize: 12.5, color: colors.text },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 38,
    color: colors.text,
    marginTop: 14,
  },
  tickerWrap: {
    marginTop: 10,
    marginHorizontal: spacing.md,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  sectionHeader: {
    fontFamily: fonts.display,
    fontSize: 19,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
  },
  friendRow: { gap: spacing.sm, paddingHorizontal: spacing.md },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 40,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingLeft: 4,
    paddingRight: 14,
    paddingVertical: 3,
    ...shadows.soft,
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendInitial: { fontFamily: fonts.display, fontSize: 14, color: colors.text },
  friendName: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.text },
  friendItem: { fontFamily: fonts.bodySemiBold, fontSize: 10.5, color: colors.textFaint },
  friendScore: { fontFamily: fonts.display, fontSize: 15, marginLeft: 2 },
  voteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    backgroundColor: colors.candy,
    borderRadius: radii.card,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    shadowColor: 'rgba(242, 144, 185, 1)',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  voteIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(250, 247, 242, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteText: { flex: 1, gap: 1 },
  voteTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  voteSub: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: 'rgba(23, 21, 15, 0.65)' },
  chainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 70,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    ...shadows.soft,
  },
  chainBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.candySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainInitial: { fontFamily: fonts.display, fontSize: 18, color: colors.accent },
  chainText: { flex: 1, gap: 2 },
  chainName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  chainSub: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted },
  chainSubScore: { fontFamily: fonts.bodyExtraBold },
  fabWrap: { position: 'absolute', right: spacing.md, bottom: 12 },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    paddingLeft: 16,
    paddingRight: 20,
    ...shadows.raised,
  },
  fabLabel: { fontFamily: fonts.bodyExtraBold, fontSize: 16, color: colors.onAccent },
  pressed: { opacity: 0.85 },
});
