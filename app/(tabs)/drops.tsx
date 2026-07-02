import { EmptyState, ScreenContainer } from '@/components/ui';

export default function DropsScreen() {
  return (
    <ScreenContainer>
      <EmptyState title="No drops right now" detail="New menu items will appear here." />
    </ScreenContainer>
  );
}
