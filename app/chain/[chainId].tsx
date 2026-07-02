import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ItemRow } from '@/components/ItemRow';
import { EmptyState, ErrorState, LoadingState, ScreenContainer } from '@/components/ui';
import { leadDisplay, sortValue } from '@/features/recommendations/predict';
import { useForYouData } from '@/features/recommendations/hooks';
import { getChain, listChainItems } from '@/lib/db/catalog';
import { colors, minTapTarget, spacing } from '@/lib/theme';

type Mode = 'forYou' | 'bestOverall';

export default function ChainMenuScreen() {
  const { chainId } = useLocalSearchParams<{ chainId: string }>();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('forYou');

  const chainQuery = useQuery({
    queryKey: ['chain', chainId],
    queryFn: () => getChain(chainId),
    enabled: Boolean(chainId),
  });
  const itemsQuery = useQuery({
    queryKey: ['chainItems', chainId],
    queryFn: () => listChainItems(chainId),
    enabled: Boolean(chainId),
  });
  const forYou = useForYouData(itemsQuery.data);

  const rows = useMemo(() => {
    const items = itemsQuery.data ?? [];
    const built = items.map((item) => {
      const rating = forYou.ratingsByItemId.get(item.id) ?? null;
      const score = forYou.scores.get(item.id) ?? null;
      const lead = leadDisplay(mode, rating, forYou.predictions.get(item.id) ?? null, score);
      return { item, score, lead };
    });
    return built.sort((a, b) => sortValue(b.lead) - sortValue(a.lead));
  }, [itemsQuery.data, forYou.ratingsByItemId, forYou.scores, forYou.predictions, mode]);

  if (chainQuery.isLoading || itemsQuery.isLoading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }
  if (chainQuery.isError || itemsQuery.isError || !chainQuery.data) {
    return (
      <ScreenContainer>
        <ErrorState
          message="Could not load this menu."
          onRetry={() => {
            void chainQuery.refetch();
            void itemsQuery.refetch();
          }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: chainQuery.data.name }} />
      <View style={styles.toggleRow} accessibilityRole="tablist">
        {(
          [
            ['forYou', 'For you'],
            ['bestOverall', 'Best overall'],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === value }}
            onPress={() => setMode(value)}
            style={[styles.toggle, mode === value && styles.toggleActive]}
          >
            <Text style={[styles.toggleLabel, mode === value && styles.toggleLabelActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              void itemsQuery.refetch();
              forYou.refetch();
            }}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <EmptyState title="No menu yet" detail="This chain's catalog hasn't been loaded." />
        }
        renderItem={({ item: row }) => (
          <ItemRow
            item={row.item}
            score={row.score}
            lead={row.lead}
            onPress={(itemId) => router.push(`/item/${itemId}`)}
          />
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
  toggleRow: {
    flexDirection: 'row',
    margin: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
  },
  toggle: {
    flex: 1,
    minHeight: minTapTarget - 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: colors.accent },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  toggleLabelActive: { color: '#FFFFFF' },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
});
