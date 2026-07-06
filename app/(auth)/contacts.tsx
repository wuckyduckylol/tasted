import { useRouter } from 'expo-router';
import { BookUser, Sparkles, UsersRound } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { StepScreen } from '@/features/onboarding/StepScreen';
import { colors, fonts, radii, spacing, type } from '@/lib/theme';

export default function ContactsStep() {
  const router = useRouter();
  return (
    <StepScreen
      step="contacts"
      title="Tasted’s better with friends"
      subtitle="Follow people to see what they rate — and sharpen your own predictions."
      onSkip={() => router.push('/(auth)/friends')}
      ctaLabel="Find my friends"
      onCta={() => router.push('/(auth)/friends')}
      footer={<Text style={styles.note}>Contact sync is coming soon — for now, find friends by username.</Text>}
    >
      <View style={styles.center}>
        <View style={styles.badge}>
          <BookUser color={colors.accent} size={64} strokeWidth={1.4} />
        </View>
      </View>
      <View style={styles.perks}>
        <View style={styles.perkRow}>
          <UsersRound color={colors.accent} size={22} strokeWidth={2} />
          <Text style={styles.perkText}>See what friends rate, the moment they rate it</Text>
        </View>
        <View style={styles.perkRow}>
          <Sparkles color={colors.accent} size={22} strokeWidth={2} />
          <Text style={styles.perkText}>Friends who rate like you make your picks smarter</Text>
        </View>
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.lg },
  badge: {
    width: 150,
    height: 150,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perks: { gap: spacing.md },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  perkText: { ...type.body, flex: 1 },
  note: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
  },
});
