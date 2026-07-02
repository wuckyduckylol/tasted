import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { Body, Button, EmptyState, ErrorState, LoadingState, ScreenContainer } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { getMyProfile } from '@/lib/db/profiles';
import { listMyRatingsWithItems } from '@/lib/db/ratings';
import { bandColor, colors, spacing } from '@/lib/theme';
import type { Band } from '@/types/domain';

const TIERS: { band: Band; label: string }[] = [
  { band: 'loved', label: 'LOVED' },
  { band: 'fine', label: 'FINE' },
  { band: 'disliked', label: 'PASS' },
];
const MAX_PER_TIER = 5;

export default function ShareScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const shotRef = useRef<React.ComponentRef<typeof ViewShot>>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getMyProfile(userId as string),
    enabled: Boolean(userId),
  });
  const ratingsQuery = useQuery({
    queryKey: ['myRatingsWithItems', userId],
    queryFn: () => listMyRatingsWithItems(userId as string),
    enabled: Boolean(userId),
  });

  async function handleShare() {
    setShareError(null);
    try {
      const capture = shotRef.current?.capture;
      if (!capture) throw new Error('capture unavailable');
      const uri = await capture();
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device.');
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch (e) {
      setShareError(e instanceof Error ? e.message : 'Could not share. Try again.');
    }
  }

  if (profileQuery.isLoading || ratingsQuery.isLoading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }
  if (ratingsQuery.isError || profileQuery.isError) {
    return (
      <ScreenContainer>
        <ErrorState
          message="Could not load your ratings."
          onRetry={() => {
            void ratingsQuery.refetch();
            void profileQuery.refetch();
          }}
        />
      </ScreenContainer>
    );
  }

  const ratings = ratingsQuery.data ?? [];
  if (ratings.length === 0) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ title: 'Share tier list' }} />
        <EmptyState title="Nothing to share yet" detail="Rate a few items first." />
      </ScreenContainer>
    );
  }

  const byBand = new Map<Band, typeof ratings>();
  for (const tier of TIERS) {
    byBand.set(
      tier.band,
      ratings
        .filter(({ rating }) => rating.band === tier.band)
        .sort((a, b) => b.rating.personalScore - a.rating.personalScore)
        .slice(0, MAX_PER_TIER),
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: 'Share tier list' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={styles.card}>
          <Text style={styles.cardTitle}>@{profileQuery.data?.username ?? 'me'}&apos;s tier list</Text>
          {TIERS.map(({ band, label }) => {
            const entries = byBand.get(band) ?? [];
            if (entries.length === 0) return null;
            return (
              <View key={band} style={styles.tierRow}>
                <View style={[styles.tierBadge, { backgroundColor: bandColor(band) }]}>
                  <Text style={styles.tierBadgeText}>{label}</Text>
                </View>
                <View style={styles.tierItems}>
                  {entries.map(({ rating, item }) => (
                    <Text key={rating.id} style={styles.tierItem} numberOfLines={1}>
                      {item.name} · {rating.personalScore.toFixed(1)}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })}
          <Text style={styles.watermark}>tasted</Text>
        </ViewShot>
        {shareError ? <Body muted>{shareError}</Body> : null}
        <Button label="Share as image" onPress={() => void handleShare()} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.baseDark,
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  tierRow: { flexDirection: 'row', gap: spacing.md },
  tierBadge: {
    width: 64,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  tierBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  tierItems: { flex: 1, gap: 4, justifyContent: 'center' },
  tierItem: { color: '#F2EEE6', fontSize: 14 },
  watermark: { color: colors.accent, fontWeight: '800', fontSize: 14, textAlign: 'right' },
});
