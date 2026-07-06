import { useRouter } from 'expo-router';
import { UtensilsCrossed } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { StepScreen } from '@/features/onboarding/StepScreen';
import { colors, radii, spacing } from '@/lib/theme';

export default function WelcomeStep() {
  const router = useRouter();
  return (
    <StepScreen
      step="welcome"
      title="Welcome! Let’s find your taste"
      subtitle="A few quick picks and Tasted starts predicting what you’ll love."
      backHidden
      ctaLabel="Let’s go!"
      onCta={() => router.push('/(auth)/top-three')}
    >
      <View style={styles.center}>
        <View style={styles.foodBadge}>
          <UtensilsCrossed color={colors.accent} size={72} strokeWidth={1.4} />
        </View>
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.xl },
  foodBadge: {
    width: 180,
    height: 180,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
