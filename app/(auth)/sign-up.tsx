import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Body, Button, EmptyState, ScreenContainer, TextField, Title } from '@/components/ui';
import { signUpWithPassword } from '@/features/auth/api';
import { fieldErrors, signUpSchema } from '@/features/auth/validation';
import { isSupabaseConfigured } from '@/lib/config';
import { colors, spacing } from '@/lib/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Backend not configured"
          detail="Copy .env.example to .env and fill in your Supabase values first."
        />
      </ScreenContainer>
    );
  }

  if (awaitingConfirmation) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Check your email"
          detail={`We sent a confirmation link to ${email}. After confirming, come back and sign in.`}
        />
      </ScreenContainer>
    );
  }

  async function handleSubmit() {
    const parsed = signUpSchema.safeParse({ username, email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const result = await signUpWithPassword(parsed.data);
      if (result.sessionActive) {
        router.replace('/(auth)/onboarding');
      } else {
        setAwaitingConfirmation(true);
      }
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : 'Could not create your account.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Title>Create account</Title>
        <Body muted>Rate what you eat. Find out what to order.</Body>
        <TextField
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoComplete="username-new"
          placeholder="fry_scientist"
        />
        {errors.username ? <Text style={styles.error}>{errors.username}</Text> : null}
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}
        {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}
        <Button
          label={submitting ? 'Creating account…' : 'Create account'}
          onPress={handleSubmit}
          disabled={submitting}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  error: { color: colors.disliked, fontSize: 14 },
});
