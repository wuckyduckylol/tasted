import { Stack } from 'expo-router';

import { WIZARD_STEPS } from '@/features/onboarding/steps';
import { colors, fonts } from '@/lib/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.base },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 20 },
        contentStyle: { backgroundColor: colors.base },
      }}
    >
      <Stack.Screen name="get-started" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ title: 'Log in' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Create account' }} />
      {/* Wizard steps render their own chrome (back + progress + skip). */}
      {WIZARD_STEPS.map((step) => (
        <Stack.Screen key={step} name={step} options={{ headerShown: false }} />
      ))}
      <Stack.Screen name="onboarding" options={{ title: 'Welcome', headerBackVisible: false }} />
    </Stack>
  );
}
