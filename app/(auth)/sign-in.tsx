import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Body, Button, EmptyState, ScreenContainer, TextField, Title } from '@/components/ui';
import { signInWithPassword } from '@/features/auth/api';
import { fieldErrors, signInSchema } from '@/features/auth/validation';
import { isSupabaseConfigured } from '@/lib/config';
import { colors, spacing } from '@/lib/theme';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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

  function handleOAuthUnavailable(provider: string) {
    Alert.alert(
      `${provider} sign-in not set up yet`,
      `${provider} OAuth credentials have not been configured (SPEC.md Section 15). Use email and password for now.`,
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Title>Welcome back</Title>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          placeholder="••••••••"
        />
        {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}
        {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}
        <Button
          label={submitting ? 'Signing in…' : 'Sign in'}
          onPress={handleSubmit}
          disabled={submitting}
        />
        <View style={styles.oauthRow}>
          <Button
            label=" Sign in with Apple"
            variant="secondary"
            onPress={() => handleOAuthUnavailable('Apple')}
          />
          <Button
            label="Sign in with Google"
            variant="secondary"
            onPress={() => handleOAuthUnavailable('Google')}
          />
        </View>
        <View style={styles.footer}>
          <Body muted>New here?</Body>
          <Link href="/(auth)/sign-up" style={styles.link}>
            Create an account
          </Link>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  error: { color: colors.disliked, fontSize: 14 },
  oauthRow: { gap: spacing.sm, marginTop: spacing.sm },
  footer: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, alignItems: 'center' },
  link: { color: colors.accent, fontSize: 16, fontWeight: '600', minHeight: 44, paddingTop: 12 },
});
