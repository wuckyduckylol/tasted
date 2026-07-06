import { Fredoka_500Medium, Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { LoadingState } from '@/components/ui';
import { SIGNED_IN_AUTH_ROUTES } from '@/features/onboarding/steps';
import { useSession } from '@/hooks/useSession';
import { isSupabaseConfigured } from '@/lib/config';
import { colors } from '@/lib/theme';

void SplashScreen.preventAutoHideAsync();

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
    const inWizard = inAuthGroup && SIGNED_IN_AUTH_ROUTES.has(segs[1] ?? '');
    if (isSupabaseConfigured && !session && !inAuthGroup) {
      router.replace('/(auth)/get-started');
    } else if (session && inAuthGroup && !inWizard) {
      router.replace('/(tabs)');
    }
    setReady(true);
  }, [session, isLoading, segments, router]);

  return ready && !isLoading;
}

export default function RootLayout() {
  const ready = useAuthGate();
  const [fontsLoaded, fontsError] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  // Render with system fonts rather than hanging forever if fonts fail to load.
  const fontsReady = fontsLoaded || fontsError !== null;

  useEffect(() => {
    if (ready && fontsReady) void SplashScreen.hideAsync();
  }, [ready, fontsReady]);

  return (
    <QueryClientProvider client={queryClient}>
      {ready && fontsReady ? (
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
