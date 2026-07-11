import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronRight, Flame, Share2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountUpText, DrawBar, Entrance } from '@/components/motion';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { useConsent } from '@/features/analytics/consent';
import { signOut, updateAnalyticsConsent } from '@/features/auth/api';
import { useSession } from '@/hooks/useSession';
import { listActiveChains } from '@/lib/db/catalog';
import { findProfileByUsername } from '@/lib/db/collab';
import { getFollowCounts, setFollowing } from '@/lib/db/follows';
import { getMyProfile, updateMyProfile } from '@/lib/db/profiles';
import { listMyRatingsWithItems } from '@/lib/db/ratings';
import { getSupabase } from '@/lib/supabase';
import { weeklyStreak } from '@/lib/streak';
import { bandColor, colors, fonts, radii, shadows, spacing } from '@/lib/theme';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  const analyticsEnabled = useConsent((s) => s.analyticsEnabled);
  const setAnalyticsEnabled = useConsent((s) => s.setAnalyticsEnabled);

  function toggleAnalytics(value: boolean) {
    setAnalyticsEnabled(value); // local gate flips immediately
    void updateAnalyticsConsent(value).catch(() => {
      // metadata mirror is best-effort; the local choice already took effect
    });
  }

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getMyProfile(userId as string),
    enabled: Boolean(userId),
  });
  const ratingsQuery = useQuery({
    queryKey: ['myRatingsWithItems', userId],
    queryFn: () => listMyRatingsWithItems(userId as string),
    enabled: Boolean(userId),
  });
  const chainsQuery = useQuery({ queryKey: ['chains'], queryFn: listActiveChains });
  const chainItemCountsQuery = useQuery({
    queryKey: ['chainItemCounts'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('items')
        .select('chain_id')
        .eq('is_active', true);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of data) counts.set(row.chain_id, (counts.get(row.chain_id) ?? 0) + 1);
      return counts;
    },
  });
  const followsQuery = useQuery({
    queryKey: ['followCounts', userId],
    queryFn: () => getFollowCounts(userId as string),
    enabled: Boolean(userId),
  });

  const togglePrivate = useMutation({
    mutationFn: (isPrivate: boolean) => updateMyProfile(userId as string, { isPrivate }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
  });

  const [friendName, setFriendName] = useState('');
  const [followMessage, setFollowMessage] = useState<string | null>(null);
  const followByName = useMutation({
    mutationFn: async (username: string) => {
      const found = await findProfileByUsername(username);
      if (!found) throw new Error(`no one named @${username} here yet.`);
      if (found.id === userId) throw new Error('that would be you.');
      await setFollowing(userId as string, found.id, true);
      return found.username;
    },
    onSuccess: (username) => {
      setFollowMessage(`following @${username}`);
      setFriendName('');
      void queryClient.invalidateQueries({ queryKey: ['followCounts', userId] });
      void queryClient.invalidateQueries({ queryKey: ['friendsFeed'] });
    },
    onError: (e) => setFollowMessage(e instanceof Error ? e.message : 'could not follow.'),
  });

  const chainStats = useMemo(() => {
    const ratings = ratingsQuery.data ?? [];
    const counts = chainItemCountsQuery.data ?? new Map<string, number>();
    const triedByChain = new Map<string, number>();
    for (const { item } of ratings) {
      triedByChain.set(item.chainId, (triedByChain.get(item.chainId) ?? 0) + 1);
    }
    return (chainsQuery.data ?? [])
      .map((chain) => {
        const total = counts.get(chain.id) ?? 0;
        const tried = triedByChain.get(chain.id) ?? 0;
        return { chain, tried, total, pct: total > 0 ? Math.round((100 * tried) / total) : 0 };
      })
      .filter((s) => s.tried > 0);
  }, [ratingsQuery.data, chainsQuery.data, chainItemCountsQuery.data]);

  const chainName = useMemo(
    () => new Map((chainsQuery.data ?? []).map((c) => [c.id, c.name])),
    [chainsQuery.data],
  );

  const streakWeeks = useMemo(
    () => weeklyStreak((ratingsQuery.data ?? []).map(({ rating }) => rating.updatedAt)),
    [ratingsQuery.data],
  );

  if (profileQuery.isLoading || ratingsQuery.isLoading) {
    return (
      <View style={styles.screen}>
        <LoadingState />
      </View>
    );
  }
  if (profileQuery.isError || !profileQuery.data) {
    return (
      <View style={styles.screen}>
        <ErrorState message="Could not load your profile." onRetry={() => profileQuery.refetch()} />
      </View>
    );
  }

  const profile = profileQuery.data;
  const ratings = ratingsQuery.data ?? [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <FlatList
        data={ratings}
        keyExtractor={({ rating }) => rating.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              void profileQuery.refetch();
              void ratingsQuery.refetch();
              void followsQuery.refetch();
            }}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {/* identity row */}
            <View style={styles.identityRow}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitials}>
                    {profile.username.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.identityText}>
                <Text style={styles.username} numberOfLines={1}>
                  @{profile.username}
                </Text>
                {streakWeeks > 0 ? (
                  <View style={styles.streakRow}>
                    <Flame color={colors.accent} size={13} strokeWidth={2.4} />
                    <Text style={styles.streakText}>{streakWeeks} week streak</Text>
                  </View>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share your tier list"
                onPress={() => router.push('/share')}
                hitSlop={8}
                style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]}
              >
                <Share2 color={colors.text} size={18} strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* stat cards */}
            <View style={styles.statRow}>
              <Entrance delay={40} pop style={styles.statCard}>
                <CountUpText value={ratings.length} style={styles.statValue} />
                <Text style={styles.statLabel}>ratings</Text>
              </Entrance>
              <Entrance delay={90} pop style={styles.statCard}>
                <CountUpText value={followsQuery.data?.followers ?? 0} style={styles.statValue} />
                <Text style={styles.statLabel}>followers</Text>
              </Entrance>
              <Entrance delay={140} pop style={styles.statCard}>
                <CountUpText value={followsQuery.data?.following ?? 0} style={styles.statValue} />
                <Text style={styles.statLabel}>following</Text>
              </Entrance>
            </View>

            {/* menus tried */}
            {chainStats.length > 0 ? (
              <Entrance delay={180}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>menus tried</Text>
                  {chainStats.map(({ chain, tried, total, pct }, i) => (
                    <View key={chain.id} style={styles.progressBlock}>
                      <View style={styles.progressMeta}>
                        <Text style={styles.progressName}>{chain.name}</Text>
                        <Text style={styles.progressPct}>
                          {tried}/{total} · {pct}%
                        </Text>
                      </View>
                      <DrawBar fraction={total > 0 ? tried / total : 0} color={colors.accent} delay={i * 100} />
                    </View>
                  ))}
                </View>
              </Entrance>
            ) : null}

            {/* settings */}
            <Entrance delay={220}>
              <View style={styles.card}>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>private profile</Text>
                  <Switch
                    accessibilityLabel="Private profile"
                    value={profile.isPrivate}
                    onValueChange={(v) => togglePrivate.mutate(v)}
                    trackColor={{ true: colors.accent }}
                  />
                </View>
                <View style={styles.hairline} />
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>share anonymous usage</Text>
                  <Switch
                    accessibilityLabel="Share anonymous usage analytics"
                    value={analyticsEnabled}
                    onValueChange={toggleAnalytics}
                    trackColor={{ true: colors.accent }}
                  />
                </View>
              </View>
            </Entrance>

            {/* find friends */}
            <Entrance delay={260}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>find friends</Text>
                <View style={styles.followRow}>
                  <View style={styles.followField}>
                    <Text style={styles.followAt}>@</Text>
                    <TextInput
                      accessibilityLabel="Follow by username"
                      value={friendName}
                      onChangeText={(t) => {
                        setFriendName(t);
                        setFollowMessage(null);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="fry_scientist"
                      placeholderTextColor={colors.textFaint}
                      style={styles.followInput}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Follow"
                    accessibilityState={{
                      disabled: followByName.isPending || friendName.trim().length < 3,
                    }}
                    disabled={followByName.isPending || friendName.trim().length < 3}
                    onPress={() => followByName.mutate(friendName.trim())}
                    style={({ pressed }) => [
                      styles.followBtn,
                      (followByName.isPending || friendName.trim().length < 3) && { opacity: 0.5 },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={styles.followBtnText}>
                      {followByName.isPending ? '…' : 'follow'}
                    </Text>
                  </Pressable>
                </View>
                {followMessage ? <Text style={styles.followMsg}>{followMessage}</Text> : null}
              </View>
            </Entrance>

            {/* actions */}
            <Entrance delay={300}>
              <View style={styles.card}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/share')}
                  style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.settingLabel}>share tier list</Text>
                  <ChevronRight color={colors.textMuted} size={18} strokeWidth={2.2} />
                </Pressable>
                <View style={styles.hairline} />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/privacy')}
                  style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.settingLabel}>privacy policy</Text>
                  <ChevronRight color={colors.textMuted} size={18} strokeWidth={2.2} />
                </Pressable>
                <View style={styles.hairline} />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void signOut()}
                  style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.6 }]}
                >
                  <Text style={[styles.settingLabel, { color: colors.disliked }]}>sign out</Text>
                </Pressable>
              </View>
            </Entrance>

            <Text style={styles.sectionTitle}>food log</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="no ratings yet" detail="your food log fills up as you rate." />
        }
        renderItem={({ item: { rating, item }, index }) => (
          <Entrance delay={Math.min(index, 8) * 40}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, your score ${rating.personalScore.toFixed(1)}`}
              onPress={() => router.push(`/item/${item.id}`)}
              style={({ pressed }) => [styles.logRow, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.logText}>
                <Text style={styles.logName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.logSub} numberOfLines={1}>
                  {chainName.get(item.chainId) ?? ''} · rated{' '}
                  {WEEKDAYS[new Date(rating.updatedAt).getDay()]}
                </Text>
              </View>
              <Text style={[styles.logScore, { color: bandColor(rating.band) }]}>
                {rating.personalScore.toFixed(1)}
              </Text>
            </Pressable>
          </Entrance>
        )}
        ItemSeparatorComponent={Separator}
      />
    </View>
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: spacing.xl },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 60, height: 60, borderRadius: radii.pill },
  avatarFallback: {
    backgroundColor: colors.candySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontFamily: fonts.display, fontSize: 20, color: colors.accent },
  identityText: { flex: 1, gap: 2 },
  username: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.textMuted },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    ...shadows.soft,
  },
  statValue: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  statLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft,
  },
  cardTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.text },
  progressBlock: { gap: 5 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressName: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  progressPct: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textMuted },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  settingLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  hairline: { height: 1, backgroundColor: colors.track },
  followRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  followField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    backgroundColor: colors.base,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
  },
  followAt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textMuted },
  followInput: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14.5,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  followBtn: {
    minHeight: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  followBtnText: { fontFamily: fonts.bodyExtraBold, fontSize: 14, color: colors.onAccent },
  followMsg: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.textMuted },
  sectionTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.text, marginTop: 2 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    ...shadows.soft,
  },
  logText: { flex: 1, gap: 2 },
  logName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  logSub: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted },
  logScore: { fontFamily: fonts.display, fontSize: 18 },
});
