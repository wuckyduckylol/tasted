import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState, ScreenContainer, SectionHeader } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { listActiveChains } from '@/lib/db/catalog';
import { isSupabaseConfigured } from '@/lib/config';
import { colors, spacing } from '@/lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();

  const chainsQuery = useQuery({
    queryKey: ['chains'],
    queryFn: listActiveChains,
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
                <Text style={styles.linkLabel}>🏆 Leaderboards</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/vote')}
                style={({ pressed }) => [styles.linkCard, pressed && styles.pressed]}
              >
                <Text style={styles.linkLabel}>🗳️ Next chain</Text>
              </Pressable>
            </View>
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
            <Text style={styles.chainName}>{chain.name}</Text>
            <Text style={styles.chevron}>›</Text>
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
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  chainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    minHeight: 64,
    marginTop: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  chainName: { fontSize: 18, fontWeight: '700', color: colors.text },
  chevron: { fontSize: 24, color: colors.textMuted },
});
