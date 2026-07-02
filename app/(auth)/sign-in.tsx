import { View } from 'react-native';

import { EmptyState, ScreenContainer } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/config';

export default function SignInScreen() {
  return (
    <ScreenContainer>
      <View style={{ flex: 1 }}>
        {isSupabaseConfigured ? (
          <EmptyState title="Sign in" detail="Auth form arrives in Phase 2." />
        ) : (
          <EmptyState
            title="Backend not configured"
            detail="Copy .env.example to .env and add your Supabase project URL and anon key, then restart the dev server."
          />
        )}
      </View>
    </ScreenContainer>
  );
}
