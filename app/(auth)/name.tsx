import { useRouter } from 'expo-router';
import { useState } from 'react';

import { TextField } from '@/components/ui';
import { nameSchema, fieldErrors } from '@/features/auth/validation';
import { StepScreen } from '@/features/onboarding/StepScreen';
import { useSession } from '@/hooks/useSession';
import { updateMyProfile } from '@/lib/db/profiles';

export default function NameStep() {
  const router = useRouter();
  const { session } = useSession();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleNext() {
    const parsed = nameSchema.safeParse({ firstName, lastName });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    if (!session) return;
    setErrors({});
    setSaving(true);
    try {
      await updateMyProfile(session.user.id, {
        displayName: `${parsed.data.firstName} ${parsed.data.lastName}`,
      });
      router.push('/(auth)/username');
    } catch {
      setErrors({ lastName: 'Could not save your name. Try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <StepScreen
      step="name"
      title="What’s your name?"
      subtitle="How your friends will find you."
      backHidden
      ctaLabel="Next"
      onCta={handleNext}
      ctaDisabled={firstName.trim().length === 0 || lastName.trim().length === 0}
      ctaLoading={saving}
    >
      <TextField
        label="First name"
        value={firstName}
        onChangeText={setFirstName}
        error={errors.firstName}
        autoComplete="given-name"
        textContentType="givenName"
        autoFocus
        placeholder="Alex"
      />
      <TextField
        label="Last name"
        value={lastName}
        onChangeText={setLastName}
        error={errors.lastName}
        autoComplete="family-name"
        textContentType="familyName"
        placeholder="Rivera"
        onSubmitEditing={handleNext}
      />
    </StepScreen>
  );
}
