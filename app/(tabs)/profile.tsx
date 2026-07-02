import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Switch, Text, View } from 'react-native';

import { ItemRow } from '@/components/ItemRow';
import {
  Body,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenContainer,
  SectionHeader,
  Title,
} from '@/components/ui';
import { signOut } from '@/features/auth/api';
import { useSession } from '@/hooks/useSession';
import { listActiveChains } from '@/lib/db/catalog';
import { getFollowCounts } from '@/lib/db/follows';
import { getMyProfile, updateMyProfile } from '@/lib/db/profiles';
import { listMyRatingsWithItems } from '@/lib/db/ratings';
import { getSupabase } from '@/lib/supabase';
import { colors, scoreColor, spacing } from '@/lib/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;

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

  if (profileQuery.isLoading || ratingsQuery.isLoading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }
  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ScreenContainer>
        <ErrorState message="Could not load your profile." onRetry={() => profileQuery.refetch()} />
      </ScreenContainer>
    );
  }

  const profile = profileQuery.data;
  const ratings = ratingsQuery.data ?? [];

  return (
    <ScreenContainer>
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
            <Title>@{profile.username}</Title>
            <View style={styles.statsRow}>
              <Stat label="ratings" value={String(ratings.length)} />
              <Stat label="streak" value={`${profile.streakCount}d`} />
              <Stat label="followers" value={String(followsQuery.data?.followers ?? 0)} />
              <Stat label="following" value={String(followsQuery.data?.following ?? 0)} />
            </View>

            {chainStats.length > 0 ? (
              <View style={styles.chainStats}>
                <SectionHeader>Menus tried</SectionHeader>
                {chainStats.map(({ chain, tried, total, pct }) => (
                  <View key={chain.id} style={styles.chainStatRow}>
                    <Text style={styles.chainStatName}>{chain.name}</Text>
                    <Text style={styles.chainStatPct}>
                      {tried}/{total} · {pct}%
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.settingsRow}>
              <Body>Private profile</Body>
              <Switch
                accessibilityLabel="Private profile"
                value={profile.isPrivate}
                onValueChange={(v) => togglePrivate.mutate(v)}
                trackColor={{ true: colors.accent }}
              />
            </View>
            <View style={styles.actionsRow}>
              <Button
                label="Share tier list"
                variant="secondary"
                onPress={() => router.push('/share')}
              />
              <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
            </View>
            <SectionHeader>Food log</SectionHeader>
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="No ratings yet" detail="Your food log fills up as you rate." />
        }
        renderItem={({ item: { rating, item } }) => (
          <View style={styles.logRow}>
            <View style={styles.rowFlex}>
              <ItemRow
                item={item}
                score={null}
                lead={{ kind: 'own', score: rating.personalScore }}
                onPress={(itemId) => router.push(`/item/${itemId}`)}
              />
            </View>
          </View>
        )}
        ItemSeparatorComponent={Separator}
      />
    </ScreenContainer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.lg },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted },
  chainStats: { gap: spacing.xs },
  chainStatRow: { flexDirection: 'row', justifyContent: 'space-between' },
  chainStatName: { fontSize: 15, color: colors.text },
  chainStatPct: { fontSize: 15, color: colors.textMuted },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  actionsRow: { gap: spacing.sm },
  logRow: { flexDirection: 'row' },
  rowFlex: { flex: 1 },
});
