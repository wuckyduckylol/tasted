import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Frown, Meh, Share2, Smile, Trophy, X, type LucideIcon } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CountUpText, Entrance, ScoreRing } from '@/components/motion';
import { Body, Button, ErrorState, LoadingState, ScreenContainer, useReducedMotion } from '@/components/ui';
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
import { bandColor, colors, fonts, minTapTarget, radii, shadows, spacing } from '@/lib/theme';
import type { Band, ComparisonOutcome } from '@/types/domain';

type Step =
  | { kind: 'band' }
  | { kind: 'compare' }
  | { kind: 'note' }
  | { kind: 'done'; score: number; rank: number; bandSize: number };

const BAND_CHOICES: {
  band: Band;
  label: string;
  sub: string;
  icon: LucideIcon;
  tint: string;
}[] = [
  { band: 'loved', label: 'loved it', sub: 'goes in your 7–10 range', icon: Smile, tint: colors.lovedSoft },
  { band: 'fine', label: 'it was fine', sub: 'goes in your 4–7 range', icon: Meh, tint: colors.fineSoft },
  { band: 'disliked', label: 'didn’t like it', sub: 'goes in your 0–4 range', icon: Frown, tint: colors.dislikedSoft },
];

const BAND_GRADIENT_TOP: Record<Band, string> = {
  loved: colors.lovedSoft,
  fine: colors.fineSoft,
  disliked: colors.dislikedSoft,
};

/** Confetti burst offsets (px, deg) from handoff motion §C. */
const BURST: { tx: number; ty: number; rot: string; color: string }[] = [
  { tx: -118, ty: -142, rot: '230deg', color: colors.accent },
  { tx: 96, ty: -158, rot: '-190deg', color: colors.candy },
  { tx: 148, ty: -64, rot: '160deg', color: colors.loved },
  { tx: -156, ty: -40, rot: '-140deg', color: '#F5C042' },
  { tx: -130, ty: 78, rot: '200deg', color: colors.candy },
  { tx: 126, ty: 96, rot: '-230deg', color: colors.accent },
  { tx: 44, ty: -172, rot: '120deg', color: '#F5C042' },
  { tx: -52, ty: -168, rot: '-160deg', color: colors.loved },
  { tx: 168, ty: 22, rot: '190deg', color: colors.candy },
  { tx: -172, ty: 30, rot: '-120deg', color: colors.accent },
  { tx: 60, ty: 140, rot: '150deg', color: colors.loved },
  { tx: -66, ty: 132, rot: '-170deg', color: '#F5C042' },
];

function BurstPiece({ tx, ty, rot, color, delay }: (typeof BURST)[number] & { delay: number }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.timing(v, {
      toValue: 1,
      duration: 1200,
      delay,
      easing: Easing.bezier(0.12, 0.55, 0.25, 1),
      useNativeDriver: true,
    }).start();
  }, [v, delay, reduced]);
  if (reduced) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 3,
        backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
        transform: [
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, tx] }) },
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, ty] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', rot] }) },
        ],
      }}
    />
  );
}

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

  const itemsById = useMemo(
    () => new Map(ratingsQuery.data?.map(({ item: i }) => [i.id, i]) ?? []),
    [ratingsQuery.data],
  );

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

  // ---- Celebration (handoff 4d) -------------------------------------------
  if (step.kind === 'done' && band) {
    const bColor = bandColor(band);
    return (
      <View style={styles.celebrateScreen}>
        <View style={[styles.celebrateTint, { backgroundColor: BAND_GRADIENT_TOP[band] }]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={styles.closeBtn}
          hitSlop={10}
        >
          <X color={colors.textMuted} size={22} strokeWidth={2.4} />
        </Pressable>
        <View style={styles.celebrateBody}>
          <Entrance delay={0}>
            <Text style={styles.celebrateOverline}>saved to your ranks</Text>
          </Entrance>
          <View style={styles.ringWrap}>
            <ScoreRing size={200} strokeWidth={9} fraction={step.score / 10} color={bColor} trackColor="#EDE7DB">
              <View style={styles.ringInner}>
                <CountUpText
                  value={step.score}
                  decimals={1}
                  style={[styles.celebrateScore, { color: bColor }]}
                  accessibilityLabel={`${step.score.toFixed(1)} out of 10`}
                />
                <Text style={styles.outOfTen}>out of 10</Text>
              </View>
            </ScoreRing>
            <View style={styles.burstOrigin} pointerEvents="none">
              {BURST.map((p, i) => (
                <BurstPiece key={i} {...p} delay={i * 11} />
              ))}
            </View>
          </View>
          <Entrance delay={900} pop>
            <Text style={styles.celebrateName}>{item.name}</Text>
          </Entrance>
          <Entrance delay={1050} pop>
            <View style={styles.rankChip}>
              <Trophy color={bColor} size={15} strokeWidth={2.4} />
              <Text style={styles.rankChipText}>
                #{step.rank + 1} of {step.bandSize} in {band} · {item.bucket}
              </Text>
            </View>
          </Entrance>
          <Entrance delay={1200} style={styles.celebrateActions}>
            <Button label="done" onPress={() => router.back()} />
          </Entrance>
          <Entrance delay={1300}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share it"
              onPress={() => router.replace('/share')}
              style={({ pressed }) => [styles.shareRow, pressed && { opacity: 0.6 }]}
            >
              <Share2 color={colors.textMuted} size={16} strokeWidth={2.2} />
              <Text style={styles.shareText}>share it</Text>
            </Pressable>
          </Entrance>
        </View>
      </View>
    );
  }

  // ---- Band / compare / note steps (handoff 4c) ---------------------------
  const stepIndex = step.kind === 'band' ? 0 : step.kind === 'compare' ? 1 : 2;

  return (
    <ScreenContainer>
      <View style={styles.grabber} />
      <View style={styles.dots} accessibilityLabel={`Step ${stepIndex + 1} of 3`}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>
          {step.kind === 'band'
            ? 'how was it?'
            : step.kind === 'compare'
              ? 'which did you like more?'
              : 'anything to add?'}
        </Text>
        <Text style={styles.itemName}>{item.name}</Text>

        {step.kind === 'band' ? (
          <View style={styles.choices}>
            {BAND_CHOICES.map(({ band: b, label, sub, icon: Icon, tint }, i) => (
              <Entrance key={b} delay={80 + i * 60} pop>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  onPress={() => chooseBand(b)}
                  style={({ pressed }) => [styles.bandCard, pressed && styles.pressed]}
                >
                  <View style={[styles.faceCircle, { backgroundColor: tint }]}>
                    <Icon color={bandColor(b)} size={26} strokeWidth={2.2} />
                  </View>
                  <View style={styles.bandText}>
                    <Text style={styles.bandLabel}>{label}</Text>
                    <Text style={styles.bandSub}>{sub}</Text>
                  </View>
                  <Text style={[styles.bandChevron, { color: bandColor(b) }]}>›</Text>
                </Pressable>
              </Entrance>
            ))}
            <Text style={styles.footHint}>
              next: a couple of quick head-to-heads to place it exactly
            </Text>
          </View>
        ) : null}

        {step.kind === 'compare' && currentPeer && band ? (
          <View style={styles.choices}>
            <Entrance delay={60} pop>
              <Pressable
                accessibilityRole="button"
                onPress={() => answerComparison('new_item_better')}
                style={({ pressed }) => [styles.compareCard, pressed && styles.pressed]}
              >
                <Text style={styles.compareLabel}>{item.name}</Text>
              </Pressable>
            </Entrance>
            <Entrance delay={120} pop>
              <Pressable
                accessibilityRole="button"
                onPress={() => answerComparison('peer_better')}
                style={({ pressed }) => [styles.compareCard, pressed && styles.pressed]}
              >
                <Text style={styles.compareLabel}>{currentPeer.itemName}</Text>
              </Pressable>
            </Entrance>
            <Pressable
              accessibilityRole="button"
              onPress={() => answerComparison('too_close')}
              style={({ pressed }) => [styles.tooClose, pressed && styles.pressed]}
            >
              <Text style={styles.tooCloseLabel}>too close to call</Text>
            </Pressable>
          </View>
        ) : null}

        {step.kind === 'note' && band && insertion && insertion.insertionIndex !== null ? (
          <View style={styles.choices}>
            <TextInput
              accessibilityLabel="Note"
              value={note}
              onChangeText={setNote}
              placeholder="notes for future you… (optional)"
              placeholderTextColor={colors.textFaint}
              multiline
              style={styles.noteInput}
              maxLength={1000}
            />
            {save.isError ? (
              <Text style={styles.error}>Could not save your rating. Try again.</Text>
            ) : null}
            <Button
              label={save.isPending ? 'saving…' : 'save rating'}
              disabled={save.isPending}
              onPress={() =>
                save.mutate({ chosenBand: band, insertionIndex: insertion.insertionIndex as number })
              }
            />
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  dot: { width: 6, height: 6, borderRadius: radii.pill, backgroundColor: colors.border },
  dotActive: { width: 18, backgroundColor: colors.accent },
  content: { padding: spacing.lg, gap: spacing.sm },
  kicker: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textMuted },
  itemName: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.text },
  choices: { gap: spacing.md, marginTop: spacing.md },
  bandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 76,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    ...shadows.soft,
  },
  faceCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bandText: { flex: 1, gap: 2 },
  bandLabel: { fontFamily: fonts.bodyExtraBold, fontSize: 17, color: colors.text },
  bandSub: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted },
  bandChevron: { fontFamily: fonts.display, fontSize: 24 },
  footHint: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  compareCard: {
    minHeight: 64,
    borderRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    ...shadows.soft,
  },
  compareLabel: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text, textAlign: 'center' },
  tooClose: { minHeight: minTapTarget, alignItems: 'center', justifyContent: 'center' },
  tooCloseLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textMuted },
  noteInput: {
    minHeight: 100,
    borderRadius: radii.card,
    backgroundColor: colors.card,
    padding: spacing.md,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15.5,
    color: colors.text,
    textAlignVertical: 'top',
    ...shadows.soft,
  },
  error: { fontFamily: fonts.bodySemiBold, color: colors.disliked, fontSize: 14 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.965 }] },
  // celebration
  celebrateScreen: { flex: 1, backgroundColor: colors.base },
  celebrateTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    opacity: 0.9,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrateBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  celebrateOverline: { fontFamily: fonts.bodyExtraBold, fontSize: 14, color: colors.textMuted },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringInner: { alignItems: 'center' },
  celebrateScore: { fontFamily: fonts.display, fontSize: 56, lineHeight: 62 },
  outOfTen: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textMuted },
  burstOrigin: { position: 'absolute', top: '50%', left: '50%' },
  celebrateName: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
  },
  rankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...shadows.soft,
  },
  rankChipText: { fontFamily: fonts.bodyExtraBold, fontSize: 13.5, color: colors.text },
  celebrateActions: { alignSelf: 'stretch', marginTop: spacing.sm },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
  },
  shareText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textMuted },
});
