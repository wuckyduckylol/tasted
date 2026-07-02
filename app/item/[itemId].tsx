import { useLocalSearchParams } from 'expo-router';

import { EmptyState, ScreenContainer } from '@/components/ui';

export default function ItemDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  return (
    <ScreenContainer>
      <EmptyState title="Item" detail={`Detail for ${itemId} arrives in Phase 4.`} />
    </ScreenContainer>
  );
}
