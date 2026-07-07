import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight, Trophy, Vote } from 'lucide-react-native';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState, ScreenContainer, SectionHeader } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { listActiveChains } from '@/lib/db/catalog';
import { getFriendsRecentRatings } from '@/lib/db/collab';
import { isSupabaseConfigured } from '@/lib/config';
import { colors, fonts, radii, scoreColor, shadows, spacing, type } from '@/lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();

  const chainsQuery = useQuery({
    queryKey: ['chains'],
    queryFn: listActiveChains,
    enabled: isSupabaseConfigured && Boolean(session),
  });
  const friendsQuery = useQuery({
    queryKey: ['friendsFeed'],
    queryFn: () => getFriendsRecentRatings(10),
    enabled: isSupabaseConfigured && Boolean(session),
  });

  if (!isSupabaseConfigured) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Backend not configured"
          detail="Copy .env.example to .env with your Supabase values to get started."
        />
      </ScreenContainer>
    );
  }

  if (chainsQuery.isLoading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }
  if (chainsQuery.isError) {
    return (
      <ScreenContainer>
        <ErrorState message="Could not load chains." onRetry={() => chainsQuery.refetch()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        data={chainsQuery.data ?? []}
        keyExtractor={(chain) => chain.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => void chainsQuery.refetch()}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerLinks}>
            <View style={styles.linkRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/leaderboards')}
                style={({ pressed }) => [styles.linkCard, pressed && styles.pressed]}
              >
                <Trophy color={colors.accent} size={18} strokeWidth={2.2} />
                <Text style={styles.linkLabel}>Leaderboards</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/vote')}
                style={({ pressed }) => [styles.linkCard, pressed && styles.pressed]}
              >
                <Vote color={colors.accent} size={18} strokeWidth={2.2} />
                <Text style={styles.linkLabel}>Next chain</Text>
              </Pressable>
            </View>
            {(friendsQuery.data ?? []).length > 0 ? (
              <View style={styles.friendsBlock}>
                <SectionHeader>Friends recently rated</SectionHeader>
                {(friendsQuery.data ?? []).map((f) => (
                  <Pressable
                    key={`${f.userId}-${f.itemId}`}
                    accessibilityRole="button"
                    onPress={() => router.push(`/item/${f.itemId}`)}
                    style={({ pressed }) => [styles.friendRow, pressed && styles.pressed]}
                  >
                    <Text style={styles.friendText} numberOfLines={1}>
                      @{f.username} · {f.itemName}
                    </Text>
                    <Text style={[styles.friendScore, { color: scoreColor(f.personalScore) }]}>
                      {f.personalScore.toFixed(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <SectionHeader>Where are you eating?</SectionHeader>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No chains yet"
            detail="The catalog hasn't been seeded. Run node supabase/seed/seed.mjs."
          />
        }
        renderItem={({ item: chain }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${chain.name} menu`}
            onPress={() => router.push(`/chain/${chain.id}`)}
            style={({ pressed }) => [styles.chainCard, pressed && styles.pressed]}
          >
            <View style={styles.chainBadge}>
              <Text style={styles.chainInitial}>{chain.name.slice(0, 1)}</Text>
            </View>
            <Text style={styles.chainName}>{chain.name}</Text>
            <ChevronRight color={colors.textMuted} size={22} strokeWidth={2.2} />
          </Pressable>
        )}
        ItemSeparatorComponent={Separator}
      />
    </ScreenContainer>
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: 0 },
  headerLinks: { gap: spacing.md, marginBottom: spacing.xs },
  linkRow: { flexDirection: 'row', gap: spacing.sm },
  linkCard: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.candySoft,
    borderRadius: radii.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  linkLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  friendsBlock: { gap: spacing.sm },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    gap: spacing.sm,
    ...shadows.card,
  },
  friendText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  friendScore: { fontFamily: fonts.display, fontSize: 16 },
  chainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 68,
    marginTop: spacing.sm,
    ...shadows.card,
  },
  chainBadge: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: colors.candySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainInitial: { fontFamily: fonts.display, fontSize: 19, color: colors.accent },
  pressed: { opacity: 0.7 },
  chainName: { ...type.bodyStrong, flex: 1, fontSize: 17 },
});
