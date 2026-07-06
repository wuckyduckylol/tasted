import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { TextField } from '@/components/ui';
import { attachPassword } from '@/features/auth/api';
import { passwordStepSchema } from '@/features/auth/validation';
import { StepScreen } from '@/features/onboarding/StepScreen';
import { colors } from '@/lib/theme';

export default function PasswordStep() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function handleNext() {
    const parsed = passwordStepSchema.safeParse({ password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'At least 8 characters');
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await attachPassword(parsed.data.password);
      router.push('/(auth)/name');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not set your password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <StepScreen
      step="password"
      title="Create a password"
      subtitle="So you can log in anytime. 8+ characters."
      backHidden
      ctaLabel="Next"
      onCta={handleNext}
      ctaDisabled={password.length < 8}
      ctaLoading={saving}
    >
      <TextField
        label="Password"
        labelHidden
        value={password}
        onChangeText={setPassword}
        error={error}
        hint="At least 8 characters."
        secureTextEntry={!visible}
        autoComplete="new-password"
        textContentType="newPassword"
        autoFocus
        placeholder="••••••••"
        onSubmitEditing={handleNext}
        suffix={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            onPress={() => setVisible((v) => !v)}
            hitSlop={12}
          >
            {visible ? (
              <EyeOff color={colors.textMuted} size={20} strokeWidth={2} />
            ) : (
              <Eye color={colors.textMuted} size={20} strokeWidth={2} />
            )}
          </Pressable>
        }
      />
    </StepScreen>
  );
}
