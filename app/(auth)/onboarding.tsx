import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ItemRow } from '@/components/ItemRow';
import {
  Body,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenContainer,
  TextField,
  Title,
} from '@/components/ui';
import { useForYouData } from '@/features/recommendations/hooks';
import { leadDisplay, pickFirstRecommendation } from '@/features/recommendations/predict';
import { getItemsByIds, listActiveChains } from '@/lib/db/catalog';
import { colors, minTapTarget, spacing } from '@/lib/theme';
import type { Item } from '@/types/domain';

const MIN_ONBOARDING_RATINGS = 5;

type Step = 'chains' | 'rate' | 'payoff';

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('chains');
  const [selectedChainIds, setSelectedChainIds] = useState<Set<string>>(new Set());
  const [itemFilter, setItemFilter] = useState('');

  const chainsQuery = useQuery({ queryKey: ['chains'], queryFn: listActiveChains });

  const selectedIds = useMemo(() => [...selectedChainIds], [selectedChainIds]);
  const itemsQuery = useQuery({
    queryKey: ['onboardingItems', selectedIds],
    queryFn: async () => {
      const all: Item[] = [];
      const { listChainItems } = await import('@/lib/db/catalog');
      for (const chainId of selectedIds) {
        all.push(...(await listChainItems(chainId)));
      }
      return all;
    },
    enabled: selectedIds.length > 0 && step !== 'chains',
  });

  const forYou = useForYouData(itemsQuery.data);
  const ratedCount = forYou.ratingsByItemId.size;

  const recommendation = useMemo(
    () =>
      pickFirstRecommendation(itemsQuery.data ?? [], forYou.predictions, forYou.ratingsByItemId),
    [itemsQuery.data, forYou.predictions, forYou.ratingsByItemId],
  );

  function toggleChain(chainId: string) {
    setSelectedChainIds((prev) => {
      const next = new Set(prev);
      if (next.has(chainId)) next.delete(chainId);
      else next.add(chainId);
      return next;
    });
  }

  if (step === 'chains') {
    if (chainsQuery.isLoading) {
      return (
        <ScreenContainer>
          <LoadingState />
        </ScreenContainer>
      );
    }
    if (chainsQuery.isError) {
      return (
        <ScreenContainer>
          <ErrorState message="Could not load chains." onRetry={() => chainsQuery.refetch()} />
        </ScreenContainer>
      );
    }
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Title>Where do you eat?</Title>
          <Body muted>Pick the chains you actually go to. You can add more later.</Body>
        </View>
        <FlatList
          data={chainsQuery.data ?? []}
          keyExtractor={(chain) => chain.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState title="No chains loaded yet" detail="The catalog needs seeding first." />
          }
          renderItem={({ item: chain }) => {
            const selected = selectedChainIds.has(chain.id);
            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={chain.name}
                onPress={() => toggleChain(chain.id)}
                style={[styles.chainOption, selected && styles.chainOptionSelected]}
              >
                <Text style={[styles.chainOptionLabel, selected && styles.chainOptionLabelSelected]}>
                  {chain.name}
                </Text>
                <Text style={styles.check}>{selected ? '✓' : ''}</Text>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={Separator}
        />
        <View style={styles.footer}>
          <Button
            label="Next"
            disabled={selectedChainIds.size === 0}
            onPress={() => setStep('rate')}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (step === 'rate') {
    // Client-side name filter over already-loaded items: no query, no shell,
    // nothing to inject into — the text never leaves this component.
    const needle = itemFilter.trim().toLowerCase();
    const items = (itemsQuery.data ?? []).filter(
      (item) => needle.length === 0 || item.name.toLowerCase().includes(needle),
    );
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Title>Rate what you know</Title>
          <Body muted>
            {ratedCount < MIN_ONBOARDING_RATINGS
              ? `Rate at least ${MIN_ONBOARDING_RATINGS} items you've actually had — ${ratedCount} down.`
              : `${ratedCount} rated. Keep going or continue.`}
          </Body>
          <TextField
            label="Find an item"
            labelHidden
            value={itemFilter}
            onChangeText={(t) => setItemFilter(t.slice(0, 64))}
            placeholder="Search these menus…"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {itemsQuery.isLoading || forYou.isLoading ? (
          <LoadingState />
        ) : itemsQuery.isError ? (
          <ErrorState message="Could not load menus." onRetry={() => itemsQuery.refetch()} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <EmptyState title="no matches" detail="Try a different name." />
            }
            renderItem={({ item }) => (
              <ItemRow
                item={item}
                score={forYou.scores.get(item.id) ?? null}
                lead={leadDisplay(
                  'forYou',
                  forYou.ratingsByItemId.get(item.id) ?? null,
                  forYou.predictions.get(item.id) ?? null,
                  forYou.scores.get(item.id) ?? null,
                )}
                onPress={(itemId) => router.push(`/rate/${itemId}`)}
              />
            )}
            ItemSeparatorComponent={Separator}
          />
        )}
        <View style={styles.footer}>
          <Button
            label={
              ratedCount >= MIN_ONBOARDING_RATINGS
                ? 'See your first pick'
                : `Rate ${MIN_ONBOARDING_RATINGS - ratedCount} more to continue`
            }
            disabled={ratedCount < MIN_ONBOARDING_RATINGS}
            onPress={() => setStep('payoff')}
          />
        </View>
      </ScreenContainer>
    );
  }

  // Payoff (SPEC 6.2 step 3): the first real personalized recommendation.
  return (
    <ScreenContainer>
      <View style={styles.payoff}>
        {recommendation ? (
          <>
            <Body muted>Based on your ratings…</Body>
            <Title>you&apos;d probably love</Title>
            <Text style={styles.payoffItem}>{recommendation.item.name}</Text>
            <Text style={styles.payoffScore}>
              {recommendation.prediction.score.toFixed(1)}/10 predicted for you
            </Text>
          </>
        ) : (
          <>
            <Title>Your taste profile is live</Title>
            <Body muted>
              Every menu now shows personalized predictions that sharpen with each rating.
            </Body>
          </>
        )}
        <View style={styles.payoffActions}>
          {recommendation ? (
            <Button
              label="See it"
              variant="secondary"
              onPress={() => router.push(`/item/${recommendation.item.id}`)}
            />
          ) : null}
          <Button label="Start exploring" onPress={() => router.replace('/(tabs)')} />
        </View>
      </View>
    </ScreenContainer>
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg, gap: spacing.sm },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  footer: { padding: spacing.lg },
  chainOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: minTapTarget + 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  chainOptionSelected: { borderColor: colors.accent },
  chainOptionLabel: { fontSize: 17, fontWeight: '600', color: colors.text },
  chainOptionLabelSelected: { color: colors.accent },
  check: { fontSize: 18, color: colors.accent, fontWeight: '800' },
  payoff: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  payoffItem: { fontSize: 32, fontWeight: '800', color: colors.accent, textAlign: 'center' },
  payoffScore: { fontSize: 16, color: colors.textMuted },
  payoffActions: { gap: spacing.sm, marginTop: spacing.xl, alignSelf: 'stretch' },
});
