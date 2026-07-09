import { useRouter } from 'expo-router';
import { HeartHandshake, ShieldCheck, Sparkles, UsersRound } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { capture } from '@/features/analytics';
import { attachPersonalizationConsent } from '@/features/auth/api';
import { StepScreen } from '@/features/onboarding/StepScreen';
import { colors, fonts, radii, spacing, type } from '@/lib/theme';

export default function ConsentStep() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleAgree() {
    setSaving(true);
    setError(undefined);
    try {
      await attachPersonalizationConsent();
      capture('personalization_consent');
      router.push('/(auth)/welcome');
    } catch {
      // Consent record is best-effort; don't trap the user in onboarding.
      router.push('/(auth)/welcome');
    } finally {
      setSaving(false);
    }
  }

  return (
    <StepScreen
      step="consent"
      title="How Tasted personalizes for you"
      subtitle="Before we start, here’s exactly what happens with your ratings."
      backHidden
      ctaLabel="I agree — personalize my Tasted"
      onCta={handleAgree}
      ctaLoading={saving}
      footer={
        <View style={styles.footer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Read the privacy policy"
            onPress={() => router.push('/privacy')}
            style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.linkText}>Read our privacy policy</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.rows}>
        <Row
          icon={Sparkles}
          title="Your ratings power your picks"
          text="A statistical algorithm turns the items you rate into predictions for what you’ll love next."
        />
        <Row
          icon={UsersRound}
          title="Taste, matched to taste"
          text="We compare your ratings with people who rate like you to sharpen those picks. No generative AI, ever."
        />
        <Row
          icon={ShieldCheck}
          title="Never sold, never used to train AI"
          text="Your data stays inside Tasted to run the app. We don’t sell it or feed it to third-party AI models."
        />
        <Row
          icon={HeartHandshake}
          title="You’re in control"
          text="See, export, or delete your data anytime, and turn analytics off in Profile."
        />
      </View>
    </StepScreen>
  );
}

function Row({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Sparkles;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Icon color={colors.accent} size={22} strokeWidth={2} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...type.bodyStrong },
  rowBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  footer: { gap: spacing.sm, alignItems: 'center' },
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.accent },
  error: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.disliked,
    textAlign: 'center',
  },
});
