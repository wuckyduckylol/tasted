import { useLocalSearchParams } from 'expo-router';

import { EmptyState, ScreenContainer } from '@/components/ui';

export default function RateItemScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  return (
    <ScreenContainer>
      <EmptyState title="Rate" detail={`Rating flow for ${itemId} arrives in Phase 4.`} />
    </ScreenContainer>
  );
}
