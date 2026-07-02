import { StyleSheet, Text, View } from 'react-native';

import { colors, scoreColor, spacing } from '../lib/theme';
import type { ItemScore } from '../types/domain';

/** Big colored 0–10 score (verdict colors reserved for scores, SPEC 12.6). */
export function ScoreNumber({ score, label }: { score: number; label?: string }) {
  return (
    <View style={styles.scoreWrap} accessibilityLabel={`${score.toFixed(1)} out of 10${label ? `, ${label}` : ''}`}>
      <Text style={[styles.scoreBig, { color: scoreColor(score) }]}>{score.toFixed(1)}</Text>
      {label ? <Text style={styles.scoreLabel}>{label}</Text> : null}
    </View>
  );
}

export function FormingBadge() {
  return (
    <View style={styles.formingBadge} accessibilityLabel="Score forming">
      <Text style={styles.formingText}>score forming</Text>
    </View>
  );
}

/** Community block: Worth It % lead, weighted /10, band distribution (SPEC 6.5). */
export function CommunityBlock({ score }: { score: ItemScore | null }) {
  if (!score || score.numRatings < 5 || score.worthItPct === null) {
    return (
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Community</Text>
        <FormingBadge />
        <Text style={styles.mutedSmall}>
          {score && score.numRatings > 0
            ? `${score.numRatings} rating${score.numRatings === 1 ? '' : 's'} so far — a few more and the score goes live.`
            : 'No ratings yet. Be one of the first.'}
        </Text>
      </View>
    );
  }
  const total = Math.max(score.distLoved + score.distFine + score.distDisliked, 1);
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>Community</Text>
      <View style={styles.communityRow}>
        <View>
          <Text style={styles.worthIt}>{Math.round(score.worthItPct)}%</Text>
          <Text style={styles.mutedSmall}>would order again</Text>
        </View>
        {score.weightedScore !== null ? (
          <View>
            <Text style={styles.weighted}>{score.weightedScore.toFixed(1)}/10</Text>
            <Text style={styles.mutedSmall}>{score.numRatings} ratings</Text>
          </View>
        ) : null}
      </View>
      <View
        style={styles.distBar}
        accessibilityLabel={`${score.distLoved} loved, ${score.distFine} fine, ${score.distDisliked} disliked`}
      >
        <View style={{ flex: score.distLoved / total, backgroundColor: colors.loved }} />
        <View style={{ flex: score.distFine / total, backgroundColor: colors.fine }} />
        <View style={{ flex: score.distDisliked / total, backgroundColor: colors.disliked }} />
      </View>
    </View>
  );
}

/** One-line community context, e.g. "94% would order again" (SPEC 6.4). */
export function communityContextLine(score: ItemScore | null): string {
  if (!score || score.numRatings === 0) return 'no ratings yet';
  if (score.numRatings < 5 || score.worthItPct === null) return 'score forming';
  return `${Math.round(score.worthItPct)}% would order again`;
}

const styles = StyleSheet.create({
  scoreWrap: { alignItems: 'center', gap: spacing.xs },
  scoreBig: { fontSize: 48, fontWeight: '800' },
  scoreLabel: { fontSize: 13, color: colors.textMuted },
  formingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  formingText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  block: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  blockTitle: { fontSize: 14, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  communityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  worthIt: { fontSize: 34, fontWeight: '800', color: colors.text },
  weighted: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'right' },
  mutedSmall: { fontSize: 13, color: colors.textMuted },
  distBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
});
