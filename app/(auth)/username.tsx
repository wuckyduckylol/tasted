import { useRouter } from 'expo-router';
import { useState } from 'react';

import { TextField } from '@/components/ui';
import { usernameSchema } from '@/features/auth/validation';
import { StepScreen } from '@/features/onboarding/StepScreen';
import { useSession } from '@/hooks/useSession';
import { updateMyProfile } from '@/lib/db/profiles';

function isUniqueViolation(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes('duplicate key') || msg.includes('23505');
}

export default function UsernameStep() {
  const router = useRouter();
  const { session } = useSession();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function handleNext() {
    const parsed = usernameSchema.safeParse({ username });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Pick a valid username');
      return;
    }
    if (!session) return;
    setError(undefined);
    setSaving(true);
    try {
      await updateMyProfile(session.user.id, { username: parsed.data.username });
      router.push('/(auth)/avatar');
    } catch (e) {
      setError(
        isUniqueViolation(e)
          ? 'That @ is taken — try another.'
          : 'Could not save your username. Try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <StepScreen
      step="username"
      title="Create a username"
      subtitle="Your unique @ on Tasted."
      ctaLabel="Next"
      onCta={handleNext}
      ctaDisabled={username.trim().length < 3}
      ctaLoading={saving}
    >
      <TextField
        label="Username"
        labelHidden
        prefix="@"
        value={username}
        onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))}
        error={error}
        hint="3–20 characters; letters, numbers and _ only."
        autoCapitalize="none"
        autoComplete="username-new"
        autoFocus
        placeholder="fry_scientist"
        onSubmitEditing={handleNext}
      />
    </StepScreen>
  );
}
