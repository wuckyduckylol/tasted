import { Stack } from 'expo-router';

import { EmptyState, ScreenContainer } from '@/components/ui';

export default function ShareScreen() {
  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: 'Share tier list' }} />
      <EmptyState title="Tier list" detail="Shareable tier-list card arrives in Phase 12." />
    </ScreenContainer>
  );
}
