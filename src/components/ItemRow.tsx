import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { communityContextLine } from './score';
import type { LeadDisplay } from '../features/recommendations/predict';
import { colors, scoreColor, spacing } from '../lib/theme';
import type { Item, ItemScore } from '../types/domain';

interface Props {
  item: Item;
  score: ItemScore | null;
  lead: LeadDisplay;
  onPress: (itemId: string) => void;
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
        <View style={styles.leadWrap} accessibilityLabel={`Predicted for you ${lead.score.toFixed(1)}`}>
          <Text style={[styles.leadScore, { color: scoreColor(lead.score) }]}>
            {lead.score.toFixed(1)}
          </Text>
          <Text style={styles.leadCaption}>for you</Text>
        </View>
      );
    case 'community':
      return (
        <View style={styles.leadWrap} accessibilityLabel={`${Math.round(lead.worthItPct)} percent worth it`}>
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

export const ItemRow = memo(function ItemRow({ item, score, lead, onPress }: Props) {
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
          <Text style={styles.thumbGlyph}>{item.bucket === 'drinks' ? '🥤' : item.bucket === 'sweet' ? '🍦' : '🍔'}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.context}>{communityContextLine(score)}</Text>
      </View>
      <Lead lead={lead} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 72,
  },
  pressed: { opacity: 0.7 },
  thumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: colors.border },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbGlyph: { fontSize: 24 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  context: { fontSize: 13, color: colors.textMuted },
  leadWrap: { alignItems: 'center', minWidth: 56 },
  leadScore: { fontSize: 20, fontWeight: '800' },
  leadPct: { fontSize: 20, fontWeight: '800', color: colors.text },
  leadForming: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  leadCaption: { fontSize: 11, color: colors.textMuted },
});
