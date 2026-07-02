import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native';

import { CommunityBlock, ScoreNumber } from '@/components/score';
import { Body, Button, ErrorState, LoadingState, ScreenContainer, Title } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { getItem } from '@/lib/db/catalog';
import { getMyRatingForItem } from '@/lib/db/ratings';
import { getItemScore } from '@/lib/db/scores';
import { isWanted, setWanted } from '@/lib/db/wantToTry';
import { colors, spacing } from '@/lib/theme';

export default function ItemDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;

  const itemQuery = useQuery({
    queryKey: ['item', itemId],
    queryFn: () => getItem(itemId),
    enabled: Boolean(itemId),
  });
  const scoreQuery = useQuery({
    queryKey: ['itemScore', itemId],
    queryFn: () => getItemScore(itemId),
    enabled: Boolean(itemId),
  });
  const myRatingQuery = useQuery({
    queryKey: ['myRating', userId, itemId],
    queryFn: () => getMyRatingForItem(userId as string, itemId),
    enabled: Boolean(userId && itemId),
  });
  const wantedQuery = useQuery({
    queryKey: ['wantToTry', userId, itemId],
    queryFn: () => isWanted(userId as string, itemId),
    enabled: Boolean(userId && itemId),
  });

  const toggleWanted = useMutation({
    mutationFn: (next: boolean) => setWanted(userId as string, itemId, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wantToTry', userId, itemId] }),
  });

  if (itemQuery.isLoading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }
  if (itemQuery.isError || !itemQuery.data) {
    return (
      <ScreenContainer>
        <ErrorState message="Could not load this item." onRetry={() => itemQuery.refetch()} />
      </ScreenContainer>
    );
  }

  const item = itemQuery.data;
  const myRating = myRatingQuery.data ?? null;
  const wanted = wantedQuery.data ?? false;

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: item.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.photo}
            contentFit="cover"
            accessibilityLabel={item.name}
          />
        ) : null}
        <Title>{item.name}</Title>
        {item.description ? <Body muted>{item.description}</Body> : null}

        <View style={styles.leadBlock}>
          {myRating ? (
            <ScoreNumber score={myRating.personalScore} label="your score ✓" />
          ) : (
            <Body muted>
              You haven&apos;t rated this yet. Your personalized prediction appears on the menu
              screen once you&apos;ve rated a few things.
            </Body>
          )}
          {myRating?.note ? <Text style={styles.note}>&ldquo;{myRating.note}&rdquo;</Text> : null}
        </View>

        <CommunityBlock score={scoreQuery.data ?? null} />

        <View style={styles.actions}>
          <Button
            label={myRating ? 'Re-rate this' : 'Rate this'}
            onPress={() => router.push(`/rate/${item.id}`)}
          />
          <Button
            label={wanted ? '★ On your Want-to-try list' : '☆ Want to try'}
            variant="secondary"
            disabled={toggleWanted.isPending || !userId}
            onPress={() => toggleWanted.mutate(!wanted)}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  photo: { width: '100%', height: 200, borderRadius: 14, backgroundColor: colors.border },
  leadBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  note: { fontSize: 15, fontStyle: 'italic', color: colors.textMuted, textAlign: 'center' },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
