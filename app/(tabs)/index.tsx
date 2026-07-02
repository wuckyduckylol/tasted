import { EmptyState, ScreenContainer } from '@/components/ui';

export default function HomeScreen() {
  return (
    <ScreenContainer>
      <EmptyState
        title="Nothing here yet"
        detail="Rate a few items and your personalized picks will show up here."
      />
    </ScreenContainer>
  );
}
