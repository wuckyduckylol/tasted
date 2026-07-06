import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { TextField } from '@/components/ui';
import { startEmailSignIn, verifyEmailOtp } from '@/features/auth/api';
import { otpSchema } from '@/features/auth/validation';
import { StepScreen } from '@/features/onboarding/StepScreen';
import { colors, fonts } from '@/lib/theme';

const RESEND_COOLDOWN_S = 60; // built-in Supabase mailer is tightly rate-limited

export default function VerifyStep() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const submitted = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // No email param means a deep link straight here — restart the step.
  useEffect(() => {
    if (!email) router.replace('/(auth)/email');
  }, [email, router]);

  async function handleVerify(value: string) {
    if (!email || submitted.current) return;
    const parsed = otpSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter the 6-digit code');
      return;
    }
    submitted.current = true;
    setError(undefined);
    setVerifying(true);
    try {
      await verifyEmailOtp(email, parsed.data);
      router.replace('/(auth)/password');
    } catch (e) {
      submitted.current = false;
      setCode('');
      setError(e instanceof Error ? e.message : 'That code didn’t match. Try again.');
    } finally {
      setVerifying(false);
    }
  }

  function handleCodeChange(t: string) {
    // OTP length is a Supabase project setting (6–10), so no auto-submit at a
    // fixed length — the user taps Verify (or return) when done.
    setCode(t.replace(/\D/g, '').slice(0, 10));
  }

  async function handleResend() {
    if (!email || cooldown > 0) return;
    setCooldown(RESEND_COOLDOWN_S);
    setError(undefined);
    try {
      await startEmailSignIn(email);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend the code.');
    }
  }

  return (
    <StepScreen
      step="verify"
      title="Verify it’s you"
      subtitle={email ? `Enter the code we emailed to ${email}.` : undefined}
      ctaLabel="Verify"
      onCta={() => void handleVerify(code)}
      ctaDisabled={code.length < 6}
      ctaLoading={verifying}
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Resend code"
          accessibilityState={{ disabled: cooldown > 0 }}
          disabled={cooldown > 0}
          onPress={() => void handleResend()}
          style={({ pressed }) => [styles.resend, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.resendText, cooldown > 0 && styles.resendMuted]}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </Text>
        </Pressable>
      }
    >
      <TextField
        label="Verification code"
        labelHidden
        value={code}
        onChangeText={handleCodeChange}
        error={error}
        hint="Check spam if it doesn’t arrive within a minute."
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        placeholder="••••••"
        maxLength={10}
        onSubmitEditing={() => void handleVerify(code)}
        style={styles.codeInput}
      />
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  codeInput: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 24,
    letterSpacing: 6,
    textAlign: 'center',
  },
  resend: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  resendText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.accent },
  resendMuted: { color: colors.textMuted },
});
