import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ItemRow } from '@/components/ItemRow';
import { Body, Button, EmptyState, ErrorState, LoadingState, ScreenContainer } from '@/components/ui';
import { useForYouData } from '@/features/recommendations/hooks';
import { leadDisplay } from '@/features/recommendations/predict';
import { listNewItems } from '@/lib/db/catalog';
import { colors, spacing } from '@/lib/theme';

export default function DropsScreen() {
  const router = useRouter();
  const itemsQuery = useQuery({ queryKey: ['drops'], queryFn: listNewItems });
  const forYou = useForYouData(itemsQuery.data);

  if (itemsQuery.isLoading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }
  if (itemsQuery.isError) {
    return (
      <ScreenContainer>
        <ErrorState message="Could not load drops." onRetry={() => itemsQuery.refetch()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        data={itemsQuery.data ?? []}
        keyExtractor={(item) => item.id}
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
          <EmptyState
            title="No drops right now"
            detail="New menu items across chains will land here first."
          />
        }
        renderItem={({ item }) => {
          const score = forYou.scores.get(item.id) ?? null;
          const live = score !== null && score.numRatings >= 5;
          return (
            <View style={styles.dropCard}>
              <View style={styles.dropHeader}>
                <Text style={styles.dropBadge}>NEW</Text>
                <Body muted>{live ? 'verdict is live' : 'verdict forming'}</Body>
              </View>
              <ItemRow
                item={item}
                score={score}
                lead={leadDisplay(
                  'forYou',
                  forYou.ratingsByItemId.get(item.id) ?? null,
                  forYou.predictions.get(item.id) ?? null,
                  score,
                )}
                onPress={(itemId) => router.push(`/item/${itemId}`)}
              />
              {!forYou.ratingsByItemId.has(item.id) ? (
                <Button label="Tried it? Rate it" onPress={() => router.push(`/rate/${item.id}`)} />
              ) : null}
            </View>
          );
        }}
        ItemSeparatorComponent={Separator}
      />
    </ScreenContainer>
  );
}

function Separator() {
  return <View style={{ height: spacing.md }} />;
}

const styles = StyleSheet.create({
  list: { padding: spacing.md },
  dropCard: { gap: spacing.sm },
  dropHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dropBadge: {
    backgroundColor: colors.accent,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    overflow: 'hidden',
  },
});
