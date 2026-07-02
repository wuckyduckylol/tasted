import { useLocalSearchParams } from 'expo-router';

import { EmptyState, ScreenContainer } from '@/components/ui';

export default function ChainMenuScreen() {
  const { chainId } = useLocalSearchParams<{ chainId: string }>();
  return (
    <ScreenContainer>
      <EmptyState title="Chain menu" detail={`Menu for ${chainId} arrives in Phase 6.`} />
    </ScreenContainer>
  );
}
