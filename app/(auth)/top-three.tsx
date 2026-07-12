import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { StepScreen } from '@/features/onboarding/StepScreen';
import { useSession } from '@/hooks/useSession';
import { listActiveChains } from '@/lib/db/catalog';
import { saveFavoriteChains } from '@/lib/db/favorites';
import { colors, fonts, radii, spacing, type } from '@/lib/theme';

export default function TopThreeStep() {
  const router = useRouter();
  const { session } = useSession();
  // Pick order matters: index in this array IS the rank.
  const [picks, setPicks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const chainsQuery = useQuery({ queryKey: ['chains'], queryFn: listActiveChains });

  function togglePick(chainId: string) {
    setPicks((prev) => {
      if (prev.includes(chainId)) return prev.filter((id) => id !== chainId);
      if (prev.length >= 3) return prev; // full — deselect something first
      return [...prev, chainId];
    });
  }

  async function handleNext() {
    if (!session || picks.length !== 3) return;
    setSaving(true);
    setError(undefined);
    try {
      await saveFavoriteChains(session.user.id, picks);
      router.push('/(auth)/top-ten');
    } catch {
      setError('Could not save your picks. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <StepScreen
      step="top-three"
      title="Pick your top 3"
      subtitle="The chains you’d defend in an argument. They tune your recommendations."
      ctaLabel={picks.length === 3 ? 'Next' : `Pick ${3 - picks.length} more`}
      onCta={handleNext}
      ctaDisabled={picks.length !== 3}
      ctaLoading={saving}
      footer={error ? <Text style={styles.error}>{error}</Text> : undefined}
    >
      {chainsQuery.isLoading ? (
        <LoadingState />
      ) : chainsQuery.isError ? (
        <ErrorState message="Could not load chains." onRetry={() => chainsQuery.refetch()} />
      ) : (
        <FlatList
          data={chainsQuery.data ?? []}
          keyExtractor={(chain) => chain.id}
          scrollEnabled={false}
          ListEmptyComponent={
            <EmptyState
              title="the menu's still loading up"
              detail="check back soon — chains land here as we add them."
            />
          }
          renderItem={({ item: chain }) => {
            const pickIndex = picks.indexOf(chain.id);
            const selected = pickIndex !== -1;
            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={
                  selected ? `${chain.name}, pick ${pickIndex + 1} of 3` : chain.name
                }
                onPress={() => togglePick(chain.id)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                  {chain.name}
                </Text>
                {selected ? (
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>{pickIndex + 1}</Text>
                  </View>
                ) : (
                  <View style={styles.emptyBadge} />
                )}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  optionSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  optionLabel: { ...type.bodyStrong },
  optionLabelSelected: { color: colors.accent },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: { fontFamily: fonts.bodyExtraBold, fontSize: 15, color: colors.onAccent },
  emptyBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
  },
  error: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.disliked,
    textAlign: 'center',
  },
});
