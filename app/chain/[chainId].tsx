import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemRow } from '@/components/ItemRow';
import { Entrance } from '@/components/motion';
import { EmptyState, ErrorState, LoadingState, useReducedMotion } from '@/components/ui';
import { leadDisplay, sortValue } from '@/features/recommendations/predict';
import { useForYouData } from '@/features/recommendations/hooks';
import { getChain, listChainItems } from '@/lib/db/catalog';
import { colors, fonts, motion, radii, scoreColor, shadows, spacing } from '@/lib/theme';
import type { Bucket } from '@/types/domain';
import { CupSoda, IceCreamCone, Sandwich } from 'lucide-react-native';

type Mode = 'forYou' | 'bestOverall';

function BucketGlyph({ bucket, size = 26 }: { bucket: Bucket; size?: number }) {
  const Icon = bucket === 'drinks' ? CupSoda : bucket === 'sweet' ? IceCreamCone : Sandwich;
  return <Icon color={colors.accent} size={size} strokeWidth={1.8} />;
}

export default function ChainMenuScreen() {
  const { chainId } = useLocalSearchParams<{ chainId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<Mode>('forYou');
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: mode === 'forYou' ? 0 : 1,
      duration: reduced ? 0 : motion.base,
      easing: Easing.bezier(0.2, 0.7, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }, [mode, slide, reduced]);

  const chainQuery = useQuery({
    queryKey: ['chain', chainId],
    queryFn: () => getChain(chainId),
    enabled: Boolean(chainId),
  });
  const itemsQuery = useQuery({
    queryKey: ['chainItems', chainId],
    queryFn: () => listChainItems(chainId),
    enabled: Boolean(chainId),
  });
  const forYou = useForYouData(itemsQuery.data);

  const rows = useMemo(() => {
    const items = itemsQuery.data ?? [];
    const built = items.map((item) => {
      const rating = forYou.ratingsByItemId.get(item.id) ?? null;
      const score = forYou.scores.get(item.id) ?? null;
      const lead = leadDisplay(mode, rating, forYou.predictions.get(item.id) ?? null, score);
      return { item, score, lead };
    });
    return built.sort((a, b) => sortValue(b.lead) - sortValue(a.lead));
  }, [itemsQuery.data, forYou.ratingsByItemId, forYou.scores, forYou.predictions, mode]);

  const triedCount = useMemo(
    () => (itemsQuery.data ?? []).filter((i) => forYou.ratingsByItemId.has(i.id)).length,
    [itemsQuery.data, forYou.ratingsByItemId],
  );

  // Spotlight: first row in "for you" mode when it's the user's own top pick.
  const spotlight = mode === 'forYou' && rows.length > 0 && rows[0].lead.kind === 'own' ? rows[0] : null;
  const listRows = spotlight ? rows.slice(1) : rows;

  if (chainQuery.isLoading || itemsQuery.isLoading) {
    return (
      <View style={styles.screen}>
        <LoadingState />
      </View>
    );
  }
  if (chainQuery.isError || itemsQuery.isError || !chainQuery.data) {
    return (
      <View style={styles.screen}>
        <ErrorState
          message="Could not load this menu."
          onRetry={() => {
            void chainQuery.refetch();
            void itemsQuery.refetch();
          }}
        />
      </View>
    );
  }

  const segmentWidth = (width - spacing.md * 2 - 8) / 2;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Candy band — screen owns its top. */}
      <View style={[styles.band, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <ChevronLeft color={colors.text} size={22} strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.bandTitle}>{chainQuery.data.name}</Text>
        <Text style={styles.bandSub}>
          {(itemsQuery.data ?? []).length} items · you’ve tried {triedCount}
        </Text>
      </View>

      {/* Segmented control with sliding coral pill. */}
      <View style={styles.segmentWrap} accessibilityRole="tablist">
        <Animated.View
          style={[
            styles.segmentPill,
            {
              width: segmentWidth,
              transform: [
                {
                  translateX: slide.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, segmentWidth],
                  }),
                },
              ],
            },
          ]}
        />
        {(
          [
            ['forYou', 'for you'],
            ['bestOverall', 'best overall'],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === value }}
            onPress={() => setMode(value)}
            style={styles.segment}
          >
            <Text style={[styles.segmentLabel, mode === value && styles.segmentLabelActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={listRows}
        keyExtractor={(row) => row.item.id}
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
          spotlight && spotlight.lead.kind === 'own' ? (
            <Entrance pop>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Your top pick: ${spotlight.item.name}`}
                onPress={() => router.push(`/item/${spotlight.item.id}`)}
                style={({ pressed }) => [styles.spotlight, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.spotlightThumb}>
                  <BucketGlyph bucket={spotlight.item.bucket} />
                </View>
                <View style={styles.spotlightText}>
                  <Text style={styles.spotlightOverline}>YOUR TOP PICK</Text>
                  <Text style={styles.spotlightName} numberOfLines={1}>
                    {spotlight.item.name}
                  </Text>
                  <Text style={styles.spotlightContext} numberOfLines={1}>
                    your highest score at {chainQuery.data.name}
                  </Text>
                </View>
                <View style={styles.spotlightLead}>
                  <Text style={[styles.spotlightScore, { color: scoreColor(spotlight.lead.score) }]}>
                    {spotlight.lead.score.toFixed(1)}
                  </Text>
                  <Text style={styles.spotlightCaption}>you ✓</Text>
                </View>
              </Pressable>
            </Entrance>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="the menu's still loading up"
            detail="check back soon — this chain's items are on the way."
          />
        }
        renderItem={({ item: row, index }) => (
          <Entrance delay={Math.min(index, 8) * 45}>
            <ItemRow
              item={row.item}
              score={row.score}
              lead={row.lead}
              onPress={(itemId) => router.push(`/item/${itemId}`)}
            />
          </Entrance>
        )}
        ItemSeparatorComponent={Separator}
      />
    </View>
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  band: {
    backgroundColor: colors.candy,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    paddingHorizontal: spacing.lg - 4,
    paddingBottom: 18,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(250, 247, 242, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  bandTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  bandSub: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: 'rgba(23, 21, 15, 0.65)',
    marginTop: 2,
  },
  segmentWrap: {
    flexDirection: 'row',
    margin: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    padding: 4,
    ...shadows.soft,
  },
  segmentPill: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textMuted },
  segmentLabelActive: { color: colors.onAccent },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: 0 },
  spotlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  spotlightThumb: {
    width: 52,
    height: 52,
    borderRadius: radii.card,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightText: { flex: 1, gap: 1 },
  spotlightOverline: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 0.6,
  },
  spotlightName: { fontFamily: fonts.display, fontSize: 19, color: colors.text },
  spotlightContext: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.textMuted },
  spotlightLead: { alignItems: 'center' },
  spotlightScore: { fontFamily: fonts.display, fontSize: 26 },
  spotlightCaption: { fontFamily: fonts.bodyBold, fontSize: 10.5, color: colors.textMuted },
});
