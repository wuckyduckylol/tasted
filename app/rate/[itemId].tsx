import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, ErrorState, LoadingState, ScreenContainer, Title } from '@/components/ui';
import { saveRating } from '@/features/rating/api';
import { useSession } from '@/hooks/useSession';
import { getItem } from '@/lib/db/catalog';
import { listMyRatingsWithItems, type ComparisonLog } from '@/lib/db/ratings';
import {
  advanceInsertion,
  selectComparisonPeers,
  startInsertion,
  type ComparisonPeer,
  type InsertionState,
} from '@/lib/scoring';
import { bandColor, colors, minTapTarget, spacing } from '@/lib/theme';
import type { Band, ComparisonOutcome } from '@/types/domain';

type Step = { kind: 'band' } | { kind: 'compare' } | { kind: 'note' } | { kind: 'done'; score: number; rank: number; bandSize: number };

const BAND_CHOICES: { band: Band; label: string }[] = [
  { band: 'loved', label: 'Loved it' },
  { band: 'fine', label: 'It was fine' },
  { band: 'disliked', label: "Didn't like it" },
];

export default function RateItemScreen() {
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
  const ratingsQuery = useQuery({
    queryKey: ['myRatingsWithItems', userId],
    queryFn: () => listMyRatingsWithItems(userId as string),
    enabled: Boolean(userId),
  });

  const [step, setStep] = useState<Step>({ kind: 'band' });
  const [band, setBand] = useState<Band | null>(null);
  const [peers, setPeers] = useState<ComparisonPeer[]>([]);
  const [insertion, setInsertion] = useState<InsertionState | null>(null);
  const [comparisons, setComparisons] = useState<Omit<ComparisonLog, 'userId' | 'bucket' | 'band'>[]>([]);
  const [note, setNote] = useState('');

  const item = itemQuery.data;

  const itemsById = useMemo(() => {
    const map = new Map(ratingsQuery.data?.map(({ item: i }) => [i.id, i]) ?? []);
    return map;
  }, [ratingsQuery.data]);

  const save = useMutation({
    mutationFn: async (args: { chosenBand: Band; insertionIndex: number }) => {
      if (!userId || !item) throw new Error('Not ready');
      return saveRating({
        userId,
        item,
        band: args.chosenBand,
        note: note.trim().length > 0 ? note.trim() : null,
        peers,
        insertionIndex: args.insertionIndex,
        comparisons,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['myRatingsWithItems', userId] });
      queryClient.invalidateQueries({ queryKey: ['myRating', userId, itemId] });
      queryClient.invalidateQueries({ queryKey: ['tasteProfile', userId] });
      setStep({
        kind: 'done',
        score: result.rating.personalScore,
        rank: result.rank,
        bandSize: result.bandSize,
      });
    },
  });

  if (itemQuery.isLoading || ratingsQuery.isLoading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }
  if (itemQuery.isError || !item) {
    return (
      <ScreenContainer>
        <ErrorState message="Could not load this item." onRetry={() => itemQuery.refetch()} />
      </ScreenContainer>
    );
  }

  function chooseBand(chosen: Band) {
    if (!item) return;
    setBand(chosen);
    // Peers come ONLY from the same bucket + band (SPEC 1.3); re-rating excludes this item.
    const bandPeers = selectComparisonPeers(
      (ratingsQuery.data ?? []).map(({ rating }) => rating),
      itemsById,
      item.bucket,
      chosen,
      item.id,
    );
    setPeers(bandPeers);
    const state = startInsertion(bandPeers.length);
    setInsertion(state);
    setComparisons([]);
    setStep(state.insertionIndex !== null ? { kind: 'note' } : { kind: 'compare' });
  }

  function answerComparison(outcome: ComparisonOutcome) {
    if (!insertion || insertion.nextPeerIndex === null || !item) return;
    const peer = peers[insertion.nextPeerIndex];
    setComparisons((prev) => [
      ...prev,
      {
        itemA: item.id,
        itemB: peer.itemId,
        winnerItemId:
          outcome === 'new_item_better' ? item.id : outcome === 'peer_better' ? peer.itemId : null,
      },
    ]);
    const next = advanceInsertion(insertion, outcome);
    setInsertion(next);
    if (next.insertionIndex !== null) setStep({ kind: 'note' });
  }

  const currentPeer =
    insertion && insertion.nextPeerIndex !== null ? peers[insertion.nextPeerIndex] : null;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step.kind !== 'done' ? (
          <>
            <Body muted>{step.kind === 'band' ? 'How was it?' : 'Rating'}</Body>
            <Title>{item.name}</Title>
          </>
        ) : null}

        {step.kind === 'band' ? (
          <View style={styles.choices}>
            {BAND_CHOICES.map(({ band: b, label }) => (
              <Pressable
                key={b}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => chooseBand(b)}
                style={({ pressed }) => [
                  styles.bandButton,
                  { borderColor: bandColor(b) },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.bandLabel, { color: bandColor(b) }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {step.kind === 'compare' && currentPeer && band ? (
          <View style={styles.choices}>
            <Body muted>Which did you like more?</Body>
            <Pressable
              accessibilityRole="button"
              onPress={() => answerComparison('new_item_better')}
              style={({ pressed }) => [styles.compareButton, pressed && styles.pressed]}
            >
              <Text style={styles.compareLabel}>{item.name}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => answerComparison('peer_better')}
              style={({ pressed }) => [styles.compareButton, pressed && styles.pressed]}
            >
              <Text style={styles.compareLabel}>{currentPeer.itemName}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => answerComparison('too_close')}
              style={({ pressed }) => [styles.tooCloseButton, pressed && styles.pressed]}
            >
              <Text style={styles.tooCloseLabel}>Too close to call</Text>
            </Pressable>
          </View>
        ) : null}

        {step.kind === 'note' && band && insertion && insertion.insertionIndex !== null ? (
          <View style={styles.choices}>
            <Body muted>Anything to add? (optional)</Body>
            <TextInput
              accessibilityLabel="Note"
              value={note}
              onChangeText={setNote}
              placeholder="Notes for future you…"
              placeholderTextColor={colors.textMuted}
              multiline
              style={styles.noteInput}
              maxLength={1000}
            />
            {save.isError ? (
              <Text style={styles.error}>Could not save your rating. Try again.</Text>
            ) : null}
            <Button
              label={save.isPending ? 'Saving…' : 'Save rating'}
              disabled={save.isPending}
              onPress={() =>
                save.mutate({ chosenBand: band, insertionIndex: insertion.insertionIndex as number })
              }
            />
          </View>
        ) : null}

        {step.kind === 'done' ? (
          <View style={styles.doneWrap}>
            <Body muted>Saved!</Body>
            <Text style={[styles.doneScore, { color: bandColor(band as Band) }]}>
              {step.score.toFixed(1)}
            </Text>
            <Body>
              {item.name} landed #{step.rank + 1} of {step.bandSize} in your{' '}
              {(band as Band) === 'loved' ? 'loved' : (band as Band) === 'fine' ? 'fine' : 'disliked'}{' '}
              {item.bucket} list.
            </Body>
            <Button label="Done" onPress={() => router.back()} />
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  choices: { gap: spacing.md, marginTop: spacing.md },
  bandButton: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  bandLabel: { fontSize: 20, fontWeight: '700' },
  compareButton: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
  },
  compareLabel: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  tooCloseButton: {
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooCloseLabel: { fontSize: 16, color: colors.textMuted, fontWeight: '600' },
  noteInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.card,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
  },
  doneWrap: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  doneScore: { fontSize: 64, fontWeight: '800' },
  error: { color: colors.disliked, fontSize: 14 },
  pressed: { opacity: 0.7 },
});
