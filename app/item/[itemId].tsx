import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, CupSoda, IceCreamCone, Sandwich, Share2, Star, UsersRound } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountUpText, Entrance, ScoreRing } from '@/components/motion';
import { CommunityBlock } from '@/components/score';
import { Button, ErrorState, LoadingState } from '@/components/ui';
import { affiliateLinksFor } from '@/features/premium/entitlements';
import { useSession } from '@/hooks/useSession';
import { getChain, getItem } from '@/lib/db/catalog';
import { getCollabPredictions } from '@/lib/db/collab';
import { getMyRatingForItem, listMyRatingsWithItems } from '@/lib/db/ratings';
import { getItemScore } from '@/lib/db/scores';
import { isWanted, setWanted } from '@/lib/db/wantToTry';
import { colors, fonts, radii, scoreColor, shadows, spacing } from '@/lib/theme';
import type { Bucket } from '@/types/domain';

function BucketGlyph({ bucket, size = 32 }: { bucket: Bucket; size?: number }) {
  const Icon = bucket === 'drinks' ? CupSoda : bucket === 'sweet' ? IceCreamCone : Sandwich;
  return <Icon color={colors.accent} size={size} strokeWidth={1.8} />;
}

export default function ItemDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;

  const itemQuery = useQuery({
    queryKey: ['item', itemId],
    queryFn: () => getItem(itemId),
    enabled: Boolean(itemId),
  });
  const chainQuery = useQuery({
    queryKey: ['chain', itemQuery.data?.chainId],
    queryFn: () => getChain(itemQuery.data?.chainId as string),
    enabled: Boolean(itemQuery.data?.chainId),
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
  const myRatingsQuery = useQuery({
    queryKey: ['myRatingsWithItems', userId],
    queryFn: () => listMyRatingsWithItems(userId as string),
    enabled: Boolean(userId),
  });
  const wantedQuery = useQuery({
    queryKey: ['wantToTry', userId, itemId],
    queryFn: () => isWanted(userId as string, itemId),
    enabled: Boolean(userId && itemId),
  });
  const collabQuery = useQuery({
    queryKey: ['collabPredictions', userId, [itemId]],
    queryFn: () => getCollabPredictions([itemId]),
    enabled: Boolean(userId && itemId),
  });

  const toggleWanted = useMutation({
    mutationFn: (next: boolean) => setWanted(userId as string, itemId, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wantToTry', userId, itemId] }),
  });

  const myRating = myRatingQuery.data ?? null;
  const item = itemQuery.data;

  // "#3 of 12 in loved · sweet" — rank among my own ratings in the same band+bucket.
  const bandRank = useMemo(() => {
    if (!myRating || !item) return null;
    const sameShelf = (myRatingsQuery.data ?? [])
      .filter(({ rating, item: i }) => rating.band === myRating.band && i.bucket === item.bucket)
      .sort((a, b) => b.rating.personalScore - a.rating.personalScore);
    const index = sameShelf.findIndex(({ item: i }) => i.id === item.id);
    if (index === -1) return null;
    return { rank: index + 1, size: sameShelf.length };
  }, [myRating, item, myRatingsQuery.data]);

  if (itemQuery.isLoading) {
    return (
      <View style={styles.screen}>
        <LoadingState />
      </View>
    );
  }
  if (itemQuery.isError || !item) {
    return (
      <View style={styles.screen}>
        <ErrorState message="Could not load this item." onRetry={() => itemQuery.refetch()} />
      </View>
    );
  }

  const wanted = wantedQuery.data ?? false;
  const chainName = chainQuery.data?.name;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* candySoft hero band */}
        <View style={[styles.hero, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.heroButtons}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => router.back()}
              hitSlop={8}
              style={({ pressed }) => [styles.circleBtn, pressed && { opacity: 0.7 }]}
            >
              <ChevronLeft color={colors.text} size={22} strokeWidth={2.4} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share"
              onPress={() => router.push('/share')}
              hitSlop={8}
              style={({ pressed }) => [styles.circleBtn, pressed && { opacity: 0.7 }]}
            >
              <Share2 color={colors.text} size={19} strokeWidth={2.2} />
            </Pressable>
          </View>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]}>
              <BucketGlyph bucket={item.bucket} />
            </View>
          )}
          <Text style={styles.heroName}>{item.name}</Text>
          <Text style={styles.heroSub}>
            {chainName ? `${chainName} · ` : ''}
            {item.bucket}
          </Text>
        </View>

        <View style={styles.body}>
          {/* your score card */}
          <Entrance delay={40}>
            <View style={styles.scoreCard}>
              {myRating ? (
                <>
                  <ScoreRing
                    size={92}
                    strokeWidth={8}
                    fraction={myRating.personalScore / 10}
                    color={scoreColor(myRating.personalScore)}
                  >
                    <View style={styles.ringInner}>
                      <CountUpText
                        value={myRating.personalScore}
                        decimals={1}
                        style={[styles.ringScore, { color: scoreColor(myRating.personalScore) }]}
                      />
                      <Text style={styles.ringCaption}>/10</Text>
                    </View>
                  </ScoreRing>
                  <View style={styles.scoreCol}>
                    <Text style={styles.scoreTitle}>your score</Text>
                    {bandRank ? (
                      <Text style={styles.scoreContext}>
                        #{bandRank.rank} of {bandRank.size} in {myRating.band} · {item.bucket}
                      </Text>
                    ) : null}
                    {myRating.note ? (
                      <Text style={styles.note} numberOfLines={3}>
                        “{myRating.note}”
                      </Text>
                    ) : null}
                  </View>
                </>
              ) : (
                <>
                  <ScoreRing size={92} strokeWidth={8} fraction={0} color={colors.track} dashedEmpty>
                    <Text style={styles.ringEmpty}>–</Text>
                  </ScoreRing>
                  <View style={styles.scoreCol}>
                    <Text style={styles.scoreTitle}>your score</Text>
                    <Text style={styles.scoreContext}>
                      not rated yet — predictions unlock after a few ratings
                    </Text>
                  </View>
                </>
              )}
            </View>
          </Entrance>

          <Entrance delay={100}>
            <CommunityBlock score={scoreQuery.data ?? null} />
          </Entrance>

          {(() => {
            const collab = collabQuery.data?.get(itemId);
            if (!collab) return null; // hide when unavailable (SPEC 6.5)
            return (
              <Entrance delay={160}>
                <View style={styles.collabRow}>
                  <UsersRound color={colors.accent} size={18} strokeWidth={2.2} />
                  <Text style={styles.collabText}>
                    people with your taste gave it{' '}
                    <Text style={styles.collabScore}>{collab.score.toFixed(1)}/10</Text>
                  </Text>
                </View>
              </Entrance>
            );
          })()}

          <Entrance delay={220} pop style={styles.actions}>
            <Button
              label={myRating ? 're-rate this' : 'rate this'}
              onPress={() => router.push(`/rate/${item.id}`)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={wanted ? 'On your want-to-try list' : 'Want to try'}
              accessibilityState={{ selected: wanted, disabled: toggleWanted.isPending || !userId }}
              disabled={toggleWanted.isPending || !userId}
              onPress={() => toggleWanted.mutate(!wanted)}
              style={({ pressed }) => [styles.wantBtn, pressed && { opacity: 0.8 }]}
            >
              <Star
                color={colors.fine}
                size={18}
                strokeWidth={2.2}
                fill={wanted ? colors.fine : 'transparent'}
              />
              <Text style={styles.wantLabel}>
                {wanted ? 'on your want-to-try list' : 'want to try'}
              </Text>
            </Pressable>
          </Entrance>

          {affiliateLinksFor(item.id).length === 0 ? (
            <Text style={styles.footnote}>ordering links coming soon</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  scroll: { paddingBottom: spacing.xl },
  hero: {
    backgroundColor: colors.candySoft,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    paddingHorizontal: spacing.lg - 4,
    paddingBottom: spacing.lg - 4,
  },
  heroButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  thumbFallback: {},
  heroName: { fontFamily: fonts.display, fontSize: 25, lineHeight: 31, color: colors.text },
  heroSub: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  body: { padding: spacing.md, gap: spacing.md },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.md,
    ...shadows.soft,
  },
  ringInner: { alignItems: 'center' },
  ringScore: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30 },
  ringCaption: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted },
  ringEmpty: { fontFamily: fonts.display, fontSize: 26, color: colors.textFaint },
  scoreCol: { flex: 1, gap: 3 },
  scoreTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.text },
  scoreContext: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.textMuted },
  note: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    fontStyle: 'italic',
    color: colors.textFaint,
  },
  collabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.md,
    ...shadows.soft,
  },
  collabText: { fontFamily: fonts.bodySemiBold, fontSize: 14.5, color: colors.text, flex: 1 },
  collabScore: { fontFamily: fonts.display, fontSize: 15 },
  actions: { gap: spacing.sm },
  wantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    ...shadows.soft,
  },
  wantLabel: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.text },
  footnote: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
  },
});
