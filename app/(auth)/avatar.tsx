import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Camera, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StepScreen } from '@/features/onboarding/StepScreen';
import { useSession } from '@/hooks/useSession';
import { updateMyProfile, uploadAvatar } from '@/lib/db/profiles';
import { colors, fonts, radii, spacing } from '@/lib/theme';

export default function AvatarStep() {
  const router = useRouter();
  const { session } = useSession();
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function handlePick() {
    setError(undefined);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setLocalUri(result.assets[0].uri);
  }

  async function handleNext() {
    if (!session || !localUri) return;
    setSaving(true);
    setError(undefined);
    try {
      const publicUrl = await uploadAvatar(session.user.id, localUri);
      await updateMyProfile(session.user.id, { avatarUrl: publicUrl });
      router.push('/(auth)/consent');
    } catch {
      setError('Could not upload your photo. Try again, or skip for now.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <StepScreen
      step="avatar"
      title="Add a profile pic?"
      subtitle="Put a face to the takes. You can always change it later."
      onSkip={() => router.push('/(auth)/consent')}
      ctaLabel={localUri ? 'Next' : 'Choose a photo'}
      onCta={localUri ? handleNext : () => void handlePick()}
      ctaLoading={saving}
      footer={error ? <Text style={styles.error}>{error}</Text> : undefined}
    >
      <View style={styles.center}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={localUri ? 'Change profile photo' : 'Add a profile photo'}
          onPress={() => void handlePick()}
          style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.8 }]}
        >
          {localUri ? (
            <Image source={{ uri: localUri }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Camera color={colors.textMuted} size={44} strokeWidth={1.6} />
            </View>
          )}
          <View style={styles.plusBadge}>
            <Plus color={colors.onAccent} size={20} strokeWidth={2.6} />
          </View>
        </Pressable>
        {localUri ? (
          <Text style={styles.changeHint}>Tap the photo to change it</Text>
        ) : null}
      </View>
    </StepScreen>
  );
}

const AVATAR_SIZE = 170;

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.xl },
  avatarWrap: { width: AVATAR_SIZE, height: AVATAR_SIZE },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radii.pill,
  },
  avatarEmpty: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeHint: {
    marginTop: spacing.md,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  error: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.disliked,
    textAlign: 'center',
  },
});
