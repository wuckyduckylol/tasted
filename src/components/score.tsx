import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useReducedMotion } from './ui';
import { colors, fonts, radii, shadows, spacing } from '../lib/theme';
import type { ItemScore } from '../types/domain';

/** Community card (handoff 4b): lowercase header, % lead, /10 + count, animated dist bar. */
export function CommunityBlock({ score }: { score: ItemScore | null }) {
  if (!score || score.numRatings < 5 || score.worthItPct === null) {
    return (
      <View style={styles.block}>
        <Text style={styles.blockTitle}>community</Text>
        <View style={styles.formingChip}>
          <Text style={styles.formingText}>score forming</Text>
        </View>
        <Text style={styles.mutedSmall}>
          {score && score.numRatings > 0
            ? `${score.numRatings} rating${score.numRatings === 1 ? '' : 's'} so far — a few more and the score goes live.`
            : 'no ratings yet — be one of the first.'}
        </Text>
      </View>
    );
  }
  const total = Math.max(score.distLoved + score.distFine + score.distDisliked, 1);
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>community</Text>
      <View style={styles.communityRow}>
        <View>
          <Text style={styles.worthIt}>{Math.round(score.worthItPct)}%</Text>
          <Text style={styles.mutedSmall}>would order again</Text>
        </View>
        {score.weightedScore !== null ? (
          <View style={styles.weightedCol}>
            <Text style={styles.weighted}>{score.weightedScore.toFixed(1)}/10</Text>
            <Text style={styles.mutedSmall}>{score.numRatings} ratings</Text>
          </View>
        ) : null}
      </View>
      <DistBar loved={score.distLoved} fine={score.distFine} disliked={score.distDisliked} total={total} />
    </View>
  );
}

/** Band distribution bar that draws in from the left (motion §E). */
function DistBar({
  loved,
  fine,
  disliked,
  total,
}: {
  loved: number;
  fine: number;
  disliked: number;
  total: number;
}) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      v.setValue(1);
      return;
    }
    Animated.timing(v, {
      toValue: 1,
      duration: 700,
      delay: 100,
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: false, // width %
    }).start();
  }, [v, reduced]);

  return (
    <View
      style={styles.distTrack}
      accessibilityLabel={`${loved} loved, ${fine} fine, ${disliked} disliked`}
    >
      <Animated.View
        style={[
          styles.distFill,
          { width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      >
        <View style={{ flex: loved / total, backgroundColor: colors.loved }} />
        <View style={{ flex: fine / total, backgroundColor: colors.fine }} />
        <View style={{ flex: disliked / total, backgroundColor: colors.disliked }} />
      </Animated.View>
    </View>
  );
}

/** One-line community context, e.g. "94% would order again" (SPEC 6.4). */
export function communityContextLine(score: ItemScore | null): string {
  if (!score || score.numRatings === 0) return 'no ratings yet';
  if (score.numRatings < 5 || score.worthItPct === null) return 'score forming';
  return `${Math.round(score.worthItPct)}% would order again`;
}

/**
 * Context that never duplicates the lead block (handoff 4a): when the lead
 * already shows "worth it" %, the context shows the rating count instead;
 * forming items spell out how far along they are.
 */
export function itemRowContextLine(score: ItemScore | null): string {
  if (!score || score.numRatings === 0) return 'no ratings yet';
  if (score.numRatings < 5 || score.worthItPct === null) {
    return `${score.numRatings} rating${score.numRatings === 1 ? '' : 's'} — score forming`;
  }
  return `${score.numRatings} ratings`;
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft,
  },
  blockTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.text },
  formingChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.track,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  formingText: { fontFamily: fonts.bodyExtraBold, fontSize: 13, color: colors.textFaint },
  communityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  worthIt: { fontFamily: fonts.display, fontSize: 30, color: colors.text },
  weightedCol: { alignItems: 'flex-end' },
  weighted: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  mutedSmall: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  distTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: colors.track,
  },
  distFill: { flexDirection: 'row', height: '100%', borderRadius: 5, overflow: 'hidden' },
});
