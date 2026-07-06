import { useRouter } from 'expo-router';
import { PartyPopper } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { StepScreen } from '@/features/onboarding/StepScreen';
import { colors, motion, radii, spacing } from '@/lib/theme';

export default function ReadyStep() {
  const router = useRouter();
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      delay: motion.fast,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <StepScreen
      step="ready"
      title="You’re ready — let’s rank!"
      subtitle="Rate 5 things you’ve actually eaten and Tasted serves your first personalized pick."
      backHidden
      ctaLabel="Start ranking"
      onCta={() => router.replace('/(auth)/onboarding')}
    >
      <View style={styles.center}>
        <Animated.View style={[styles.badge, { transform: [{ scale }] }]}>
          <PartyPopper color={colors.accent} size={72} strokeWidth={1.4} />
        </Animated.View>
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.xl },
  badge: {
    width: 180,
    height: 180,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
