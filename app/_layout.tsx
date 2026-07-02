import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';

import { LoadingState } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { isSupabaseConfigured } from '@/lib/config';
import { colors } from '@/lib/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60 * 1000, // keep cached reads a day for offline tolerance
      retry: 1,
    },
  },
});

function useAuthGate() {
  const { session, isLoading } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    const segs: string[] = segments;
    const inAuthGroup = segs[0] === '(auth)';
    const inOnboarding = inAuthGroup && segs[1] === 'onboarding';
    if (isSupabaseConfigured && !session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup && !inOnboarding) {
      router.replace('/(tabs)');
    }
    setReady(true);
  }, [session, isLoading, segments, router]);

  return ready && !isLoading;
}

export default function RootLayout() {
  const ready = useAuthGate();

  return (
    <QueryClientProvider client={queryClient}>
      {ready ? (
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.base },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.base },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chain/[chainId]" options={{ title: '' }} />
          <Stack.Screen name="item/[itemId]" options={{ title: '' }} />
          <Stack.Screen name="rate/[itemId]" options={{ title: 'Rate', presentation: 'modal' }} />
          <Stack.Screen name="vote" options={{ title: 'Vote for the next chain' }} />
        </Stack>
      ) : (
        <LoadingState />
      )}
    </QueryClientProvider>
  );
}
