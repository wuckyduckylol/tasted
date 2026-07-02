import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Body, EmptyState, ErrorState, LoadingState, ScreenContainer } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import {
  listChainCandidates,
  listMyVotedCandidateIds,
  voteForCandidate,
  UNLOCK_THRESHOLD,
} from '@/lib/db/votes';
import { colors, minTapTarget, spacing } from '@/lib/theme';

export default function VoteScreen() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;

  const candidatesQuery = useQuery({ queryKey: ['chainCandidates'], queryFn: listChainCandidates });
  const myVotesQuery = useQuery({
    queryKey: ['myChainVotes', userId],
    queryFn: () => listMyVotedCandidateIds(userId as string),
    enabled: Boolean(userId),
  });

  const vote = useMutation({
    mutationFn: (candidateId: string) => voteForCandidate(userId as string, candidateId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chainCandidates'] });
      void queryClient.invalidateQueries({ queryKey: ['myChainVotes', userId] });
    },
  });

  if (candidatesQuery.isLoading || myVotesQuery.isLoading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }
  if (candidatesQuery.isError) {
    return (
      <ScreenContainer>
        <ErrorState message="Could not load candidates." onRetry={() => candidatesQuery.refetch()} />
      </ScreenContainer>
    );
  }

  const myVotes = myVotesQuery.data ?? new Set<string>();

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: 'Vote for the next chain' }} />
      <FlatList
        data={candidatesQuery.data ?? []}
        keyExtractor={(candidate) => candidate.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => void candidatesQuery.refetch()}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <Body muted>
            {UNLOCK_THRESHOLD} votes unlocks a chain. Active chains never get removed — new ones
            join them.
          </Body>
        }
        ListEmptyComponent={
          <EmptyState title="No candidates yet" detail="Chain candidates appear here to vote on." />
        }
        renderItem={({ item: candidate }) => {
          const voted = myVotes.has(candidate.id);
          const progress = Math.min(candidate.voteCount / UNLOCK_THRESHOLD, 1);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{candidate.name}</Text>
                {candidate.isUnlocked ? (
                  <Text style={styles.unlocked}>Unlocked!</Text>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={voted ? `Voted for ${candidate.name}` : `Vote for ${candidate.name}`}
                    accessibilityState={{ disabled: voted }}
                    disabled={voted || vote.isPending}
                    onPress={() => vote.mutate(candidate.id)}
                    style={[styles.voteButton, voted && styles.voteButtonDone]}
                  >
                    <Text style={[styles.voteLabel, voted && styles.voteLabelDone]}>
                      {voted ? 'Voted ✓' : 'Vote'}
                    </Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.progressTrack} accessibilityLabel={`${candidate.voteCount} of ${UNLOCK_THRESHOLD} votes`}>
                <View style={[styles.progressFill, { flex: progress }]} />
                <View style={{ flex: 1 - progress }} />
              </View>
              <Text style={styles.count}>
                {candidate.voteCount} / {UNLOCK_THRESHOLD} votes
              </Text>
            </View>
          );
        }}
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  unlocked: { fontSize: 14, fontWeight: '700', color: colors.loved },
  voteButton: {
    minHeight: minTapTarget - 8,
    minWidth: 88,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  voteButtonDone: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  voteLabel: { color: '#FFFFFF', fontWeight: '700' },
  voteLabelDone: { color: colors.textMuted },
  progressTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  progressFill: { backgroundColor: colors.accent },
  count: { fontSize: 13, color: colors.textMuted },
});
