import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { TextField } from '@/components/ui';
import { startEmailSignIn } from '@/features/auth/api';
import { emailStepSchema } from '@/features/auth/validation';
import { StepScreen } from '@/features/onboarding/StepScreen';
import { colors, fonts } from '@/lib/theme';

export default function EmailStep() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);

  async function handleNext() {
    const parsed = emailStepSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email address');
      return;
    }
    setError(undefined);
    setSending(true);
    try {
      await startEmailSignIn(parsed.data.email);
      router.push({ pathname: '/(auth)/verify', params: { email: parsed.data.email } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code. Try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <StepScreen
      step="email"
      title="What’s your email?"
      subtitle="We’ll email you a code so it’s really you."
      ctaLabel="Next"
      onCta={handleNext}
      ctaDisabled={email.trim().length === 0}
      ctaLoading={sending}
      footer={<Text style={styles.legal}>No spam — just your sign-in code.</Text>}
    >
      <TextField
        label="Email"
        labelHidden
        value={email}
        onChangeText={setEmail}
        error={error}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoFocus
        placeholder="you@example.com"
        onSubmitEditing={handleNext}
      />
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  legal: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
  },
});
