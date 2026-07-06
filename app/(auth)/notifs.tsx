import { useRouter } from 'expo-router';
import { BellRing, Flame, TrendingUp, UsersRound } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { registerPushToken } from '@/features/notifications/push';
import { StepScreen } from '@/features/onboarding/StepScreen';
import { useSession } from '@/hooks/useSession';
import { colors, radii, spacing, type } from '@/lib/theme';

export default function NotifsStep() {
  const router = useRouter();
  const { session } = useSession();
  const [requesting, setRequesting] = useState(false);

  async function handleAllow() {
    if (!session) return;
    setRequesting(true);
    // Prime screen → OS dialog. Denied or unconfigured push both no-op safely.
    await registerPushToken(session.user.id);
    setRequesting(false);
    router.push('/(auth)/ready');
  }

  return (
    <StepScreen
      step="notifs"
      title="Turn on notifications?"
      subtitle="Only the good stuff — no spam, ever."
      ctaLabel="Allow notifications"
      onCta={() => void handleAllow()}
      ctaLoading={requesting}
      footer={
        <Button label="Maybe later" variant="ghost" onPress={() => router.push('/(auth)/ready')} />
      }
    >
      <View style={styles.center}>
        <View style={styles.badge}>
          <BellRing color={colors.accent} size={64} strokeWidth={1.4} />
        </View>
      </View>
      <View style={styles.perks}>
        <View style={styles.perkRow}>
          <Flame color={colors.accent} size={22} strokeWidth={2} />
          <Text style={styles.perkText}>New menu drops from your favorite chains</Text>
        </View>
        <View style={styles.perkRow}>
          <UsersRound color={colors.accent} size={22} strokeWidth={2} />
          <Text style={styles.perkText}>When friends rate something you should try</Text>
        </View>
        <View style={styles.perkRow}>
          <TrendingUp color={colors.accent} size={22} strokeWidth={2} />
          <Text style={styles.perkText}>Vote results for the next chain we add</Text>
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
});
