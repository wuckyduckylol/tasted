import { Link } from 'expo-router';
import { Apple } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Body, Button, EmptyState, ScreenContainer, TextField, Title } from '@/components/ui';
import { signInWithPassword, signInWithProvider, type OAuthProvider } from '@/features/auth/api';
import { fieldErrors, signInSchema } from '@/features/auth/validation';
import { isSupabaseConfigured } from '@/lib/config';
import { colors, fonts, minTapTarget, radii, spacing } from '@/lib/theme';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<OAuthProvider | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Backend not configured"
          detail="Copy .env.example to .env, add your Supabase project URL and anon key, then restart the dev server. See SPEC.md Section 15."
        />
      </ScreenContainer>
    );
  }

  async function handleSubmit() {
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await signInWithPassword(parsed.data);
      // Root layout auth gate redirects to (tabs) on session change.
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : 'Could not sign you in.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    setErrors({});
    setOauthBusy(provider);
    try {
      await signInWithProvider(provider);
      // Session change is picked up by the root auth gate.
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : 'Could not sign you in.' });
    } finally {
      setOauthBusy(null);
    }
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Title>Welcome back</Title>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
          disabled={oauthBusy !== null}
          onPress={() => void handleOAuth('apple')}
          style={({ pressed }) => [styles.oauthBtn, styles.appleBtn, pressed && styles.pressed]}
        >
          <Apple color={colors.base} size={19} strokeWidth={2} fill={colors.base} />
          <Text style={[styles.oauthLabel, styles.appleLabel]}>
            {oauthBusy === 'apple' ? 'Opening…' : 'Continue with Apple'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          disabled={oauthBusy !== null}
          onPress={() => void handleOAuth('google')}
          style={({ pressed }) => [styles.oauthBtn, styles.googleBtn, pressed && styles.pressed]}
        >
          <Text style={styles.googleG}>G</Text>
          <Text style={[styles.oauthLabel, styles.googleLabel]}>
            {oauthBusy === 'google' ? 'Opening…' : 'Continue with Google'}
          </Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.rule} />
          <Text style={styles.dividerText}>or with email</Text>
          <View style={styles.rule} />
        </View>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoComplete="current-password"
          placeholder="••••••••"
        />
        {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}
        <Button
          label={submitting ? 'Signing in…' : 'Sign in'}
          onPress={handleSubmit}
          disabled={submitting}
        />

        <View style={styles.footer}>
          <Body muted>New here?</Body>
          <Link href="/(auth)/get-started" style={styles.link}>
            Create an account
          </Link>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: minTapTarget + 8,
    borderRadius: radii.pill,
  },
  appleBtn: { backgroundColor: colors.baseDark },
  googleBtn: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  pressed: { opacity: 0.85 },
  oauthLabel: { fontFamily: fonts.bodyExtraBold, fontSize: 16 },
  appleLabel: { color: colors.base },
  googleLabel: { color: colors.text },
  googleG: { fontFamily: fonts.bodyExtraBold, fontSize: 18, color: '#4285F4' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xs },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted },
  error: { fontFamily: fonts.bodySemiBold, color: colors.disliked, fontSize: 14 },
  footer: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, alignItems: 'center' },
  link: { color: colors.accent, fontFamily: fonts.bodyBold, fontSize: 16, minHeight: 44, paddingTop: 12 },
});
