import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ArrowRight, CupSoda, IceCreamCone, Sandwich, Sparkles } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ambient, Entrance } from '@/components/motion';
import { itemRowContextLine } from '@/components/score';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { useForYouData } from '@/features/recommendations/hooks';
import { leadDisplay } from '@/features/recommendations/predict';
import { listActiveChains, listNewItems } from '@/lib/db/catalog';
import { colors, fonts, radii, scoreColor, shadows, spacing } from '@/lib/theme';
import type { Bucket } from '@/types/domain';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function BucketGlyph({ bucket }: { bucket: Bucket }) {
  const Icon = bucket === 'drinks' ? CupSoda : bucket === 'sweet' ? IceCreamCone : Sandwich;
  return <Icon color={colors.accent} size={22} strokeWidth={1.8} />;
}

export default function DropsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const itemsQuery = useQuery({ queryKey: ['drops'], queryFn: listNewItems });
  const chainsQuery = useQuery({ queryKey: ['chains'], queryFn: listActiveChains });
  const forYou = useForYouData(itemsQuery.data);

  const chainName = useMemo(
    () => new Map((chainsQuery.data ?? []).map((c) => [c.id, c.name])),
    [chainsQuery.data],
  );

  if (itemsQuery.isLoading) {
    return (
      <View style={styles.screen}>
        <LoadingState />
      </View>
    );
  }
  if (itemsQuery.isError) {
    return (
      <View style={styles.screen}>
        <ErrorState message="Could not load drops." onRetry={() => itemsQuery.refetch()} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
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
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ambient kind="flicker">
                <Sparkles color={colors.accent} size={24} strokeWidth={2} />
              </Ambient>
              <Text style={styles.title}>drops</Text>
            </View>
            <Text style={styles.subtitle}>new on menus this week</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="no drops right now"
            detail="new menu items across chains land here first."
          />
        }
        renderItem={({ item, index }) => {
          const score = forYou.scores.get(item.id) ?? null;
          const live = score !== null && score.numRatings >= 5;
          const lead = leadDisplay(
            'forYou',
            forYou.ratingsByItemId.get(item.id) ?? null,
            forYou.predictions.get(item.id) ?? null,
            score,
          );
          const chain = chainName.get(item.chainId);
          const addedDay = item.launchedAt ? WEEKDAYS[new Date(item.launchedAt).getDay()] : null;
          return (
            <Entrance delay={Math.min(index, 6) * 50}>
              <View style={styles.dropCard}>
                <View style={styles.metaRow}>
                  <View style={styles.newChip}>
                    <Text style={styles.newChipText}>NEW</Text>
                  </View>
                  <Text style={styles.metaText} numberOfLines={1}>
                    {chain ?? ''}
                    {addedDay ? ` · added ${addedDay}` : ''}
                  </Text>
                  <View style={styles.statusWrap}>
                    {live ? (
                      <View style={[styles.statusDot, { backgroundColor: colors.loved }]} />
                    ) : (
                      <Ambient kind="breathe">
                        <View style={[styles.statusDot, { backgroundColor: colors.fine }]} />
                      </Ambient>
                    )}
                    <Text style={styles.statusText}>{live ? 'verdict live' : 'verdict forming'}</Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  onPress={() => router.push(`/item/${item.id}`)}
                  style={({ pressed }) => [styles.itemRow, pressed && { opacity: 0.8 }]}
                >
                  <View style={styles.thumb}>
                    <BucketGlyph bucket={item.bucket} />
                  </View>
                  <View style={styles.itemText}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemContext} numberOfLines={1}>
                      {itemRowContextLine(score)}
                    </Text>
                  </View>
                  {live && lead.kind === 'community' ? (
                    <View style={styles.leadWrap}>
                      <Text style={styles.leadPct}>{Math.round(lead.worthItPct)}%</Text>
                      <Text style={styles.leadCaption}>worth it</Text>
                    </View>
                  ) : live && (lead.kind === 'own' || lead.kind === 'predicted') ? (
                    <View style={styles.leadWrap}>
                      <Text style={[styles.leadScore, { color: scoreColor(lead.score) }]}>
                        {lead.score.toFixed(1)}
                      </Text>
                      <Text style={styles.leadCaption}>
                        {lead.kind === 'own' ? 'you ✓' : 'for you'}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>

                {!forYou.ratingsByItemId.has(item.id) ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Tried it? Rate ${item.name}`}
                    onPress={() => router.push(`/rate/${item.id}`)}
                    hitSlop={12}
                    style={({ pressed }) => [styles.rateAction, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={styles.rateActionText}>tried it? rate it</Text>
                    <ArrowRight color={colors.accent} size={15} strokeWidth={2.6} />
                  </Pressable>
                ) : null}
              </View>
            </Entrance>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  list: { padding: spacing.md, paddingTop: 0 },
  header: { gap: 2, marginBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.text },
  subtitle: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  dropCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: spacing.md,
    gap: 12,
    ...shadows.soft,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  newChip: {
    backgroundColor: colors.candySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  newChipText: { fontFamily: fonts.bodyExtraBold, fontSize: 11, color: colors.text },
  metaText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textFaint },
  statusWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: radii.pill },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.textMuted },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.candySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1, gap: 2 },
  itemName: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.text },
  itemContext: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted },
  leadWrap: { alignItems: 'center', minWidth: 52 },
  leadScore: { fontFamily: fonts.display, fontSize: 19 },
  leadPct: { fontFamily: fonts.display, fontSize: 19, color: colors.text },
  leadCaption: { fontFamily: fonts.bodyBold, fontSize: 10.5, color: colors.textMuted },
  rateAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 20,
  },
  rateActionText: { fontFamily: fonts.bodyExtraBold, fontSize: 14, color: colors.accent },
});
