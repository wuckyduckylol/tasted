import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/ui';
import { StepScreen } from '@/features/onboarding/StepScreen';
import { useSession } from '@/hooks/useSession';
import { listActiveChains } from '@/lib/db/catalog';
import { listMyFavoriteChainIds } from '@/lib/db/favorites';
import { listChainScoreRows } from '@/lib/db/scores';
import { chainStatsFromItemScores, rankTopChains } from '@/lib/scoring/topChains';
import { colors, fonts, radii, shadows, spacing, type } from '@/lib/theme';

export default function TopTenStep() {
  const router = useRouter();
  const { session } = useSession();

  const chainsQuery = useQuery({ queryKey: ['chains'], queryFn: listActiveChains });
  const scoreRowsQuery = useQuery({ queryKey: ['chainScoreRows'], queryFn: listChainScoreRows });
  const favoritesQuery = useQuery({
    queryKey: ['favoriteChains', session?.user.id],
    queryFn: () => listMyFavoriteChainIds(session?.user.id ?? ''),
    enabled: Boolean(session),
  });

  const isLoading =
    chainsQuery.isLoading || scoreRowsQuery.isLoading || favoritesQuery.isLoading;
  const isError = chainsQuery.isError || scoreRowsQuery.isError || favoritesQuery.isError;

  const topChains = useMemo(() => {
    const chains = chainsQuery.data ?? [];
    const rankedIds = rankTopChains({
      chainIds: chains.map((c) => c.id),
      stats: chainStatsFromItemScores(scoreRowsQuery.data ?? []),
      favoriteChainIds: favoritesQuery.data ?? [],
    });
    const byId = new Map(chains.map((c) => [c.id, c]));
    return rankedIds.flatMap((id) => byId.get(id) ?? []);
  }, [chainsQuery.data, scoreRowsQuery.data, favoritesQuery.data]);

  return (
    <StepScreen
      step="top-ten"
      title="Your top 10"
      subtitle="Ranked for you from your picks and community scores. Tap one to peek at its menu."
      ctaLabel="Continue"
      onCta={() => router.push('/(auth)/contacts')}
    >
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          message="Could not build your list."
          onRetry={() => {
            void chainsQuery.refetch();
            void scoreRowsQuery.refetch();
            void favoritesQuery.refetch();
          }}
        />
      ) : (
        <FlatList
          data={topChains}
          keyExtractor={(chain) => chain.id}
          scrollEnabled={false}
          renderItem={({ item: chain, index }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Number ${index + 1}: ${chain.name}. Open its menu`}
              onPress={() => router.push(`/chain/${chain.id}`)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Text style={styles.rank}>{index + 1}</Text>
              {chain.logoUrl ? (
                <Image source={{ uri: chain.logoUrl }} style={styles.logo} contentFit="cover" />
              ) : (
                <View style={[styles.logo, styles.logoFallback]}>
                  <Text style={styles.logoInitial}>{chain.name.slice(0, 1)}</Text>
                </View>
              )}
              <Text style={styles.name} numberOfLines={1}>
                {chain.name}
              </Text>
              <ChevronRight color={colors.textMuted} size={20} strokeWidth={2.2} />
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  rowPressed: { opacity: 0.8 },
  rank: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.accent,
    width: 28,
    textAlign: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
  },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  logoInitial: { fontFamily: fonts.display, fontSize: 18, color: colors.accent },
  name: { ...type.bodyStrong, flex: 1 },
});
