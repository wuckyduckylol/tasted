import { Image } from 'expo-image';
import { CupSoda, IceCreamCone, Sandwich } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { communityContextLine } from './score';
import type { LeadDisplay } from '../features/recommendations/predict';
import { colors, fonts, radii, scoreColor, shadows, spacing, type } from '../lib/theme';
import type { Bucket, Item, ItemScore } from '../types/domain';

interface Props {
  item: Item;
  score: ItemScore | null;
  lead: LeadDisplay;
  onPress: (itemId: string) => void;
  /** Hide the trailing score block (e.g. search, where ordering is silent). */
  showLead?: boolean;
}

function BucketGlyph({ bucket }: { bucket: Bucket }) {
  const Icon = bucket === 'drinks' ? CupSoda : bucket === 'sweet' ? IceCreamCone : Sandwich;
  return <Icon color={colors.accent} size={24} strokeWidth={1.8} />;
}

function Lead({ lead }: { lead: LeadDisplay }) {
  switch (lead.kind) {
    case 'own':
      return (
        <View style={styles.leadWrap} accessibilityLabel={`Your score ${lead.score.toFixed(1)}`}>
          <Text style={[styles.leadScore, { color: scoreColor(lead.score) }]}>
            {lead.score.toFixed(1)}
          </Text>
          <Text style={styles.leadCaption}>you ✓</Text>
        </View>
      );
    case 'predicted':
      return (
        <View
          style={styles.leadWrap}
          accessibilityLabel={`Predicted for you ${lead.score.toFixed(1)}`}
        >
          <Text style={[styles.leadScore, { color: scoreColor(lead.score) }]}>
            {lead.score.toFixed(1)}
          </Text>
          <Text style={styles.leadCaption}>for you</Text>
        </View>
      );
    case 'community':
      return (
        <View
          style={styles.leadWrap}
          accessibilityLabel={`${Math.round(lead.worthItPct)} percent worth it`}
        >
          <Text style={styles.leadPct}>{Math.round(lead.worthItPct)}%</Text>
          <Text style={styles.leadCaption}>worth it</Text>
        </View>
      );
    case 'forming':
      return (
        <View style={styles.leadWrap} accessibilityLabel="Score forming">
          <Text style={styles.leadForming}>new</Text>
          <Text style={styles.leadCaption}>forming</Text>
        </View>
      );
  }
}

export const ItemRow = memo(function ItemRow({ item, score, lead, onPress, showLead = true }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.name}
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <BucketGlyph bucket={item.bucket} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.context}>{communityContextLine(score)}</Text>
      </View>
      {showLead ? <Lead lead={lead} /> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 72,
    ...shadows.card,
  },
  pressed: { opacity: 0.7 },
  thumb: { width: 52, height: 52, borderRadius: radii.sm, backgroundColor: colors.candySoft },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  name: { ...type.bodyStrong },
  context: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  leadWrap: { alignItems: 'center', minWidth: 56 },
  leadScore: { fontFamily: fonts.display, fontSize: 20 },
  leadPct: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  leadForming: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textMuted },
  leadCaption: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textMuted },
});
