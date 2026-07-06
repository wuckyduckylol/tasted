import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, LoadingState, TextField } from '@/components/ui';
import { StepScreen } from '@/features/onboarding/StepScreen';
import { useSession } from '@/hooks/useSession';
import { setFollowing } from '@/lib/db/follows';
import { listSuggestedProfiles, searchProfiles } from '@/lib/db/profiles';
import { colors, fonts, minTapTarget, radii, spacing, type } from '@/lib/theme';
import type { Profile } from '@/types/domain';

export default function FriendsStep() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const [query, setQuery] = useState('');
  const [followed, setFollowed] = useState<Set<string>>(new Set());

  const suggestedQuery = useQuery({
    queryKey: ['suggestedProfiles', userId],
    queryFn: () => listSuggestedProfiles(userId),
    enabled: Boolean(session),
  });
  const searchQueryRes = useQuery({
    queryKey: ['profileSearch', userId, query],
    queryFn: () => searchProfiles(query, userId),
    enabled: Boolean(session) && query.trim().length >= 2,
  });

  const searching = query.trim().length >= 2;
  const listData: Profile[] = searching
    ? (searchQueryRes.data ?? [])
    : (suggestedQuery.data ?? []);
  const listLoading = searching ? searchQueryRes.isLoading : suggestedQuery.isLoading;

  async function toggleFollow(profile: Profile) {
    if (!session) return;
    const isFollowed = followed.has(profile.id);
    // Optimistic: flip locally, revert on failure.
    setFollowed((prev) => {
      const next = new Set(prev);
      if (isFollowed) next.delete(profile.id);
      else next.add(profile.id);
      return next;
    });
    try {
      await setFollowing(session.user.id, profile.id, !isFollowed);
    } catch {
      setFollowed((prev) => {
        const next = new Set(prev);
        if (isFollowed) next.add(profile.id);
        else next.delete(profile.id);
        return next;
      });
    }
  }

  return (
    <StepScreen
      step="friends"
      title="Follow a few friends"
      subtitle="Search usernames or start with suggested tasters."
      onSkip={() => router.push('/(auth)/notifs')}
      ctaLabel={followed.size > 0 ? `Continue (${followed.size} followed)` : 'Continue'}
      onCta={() => router.push('/(auth)/notifs')}
    >
      <TextField
        label="Search usernames"
        labelHidden
        prefix="@"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Search usernames"
      />
      {listLoading ? (
        <LoadingState />
      ) : listData.length === 0 ? (
        <EmptyState
          title={searching ? 'No one found' : 'No suggestions yet'}
          detail={
            searching
              ? 'Try a different username.'
              : 'You’re early! Invite friends once you’re in.'
          }
        />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(p) => p.id}
          scrollEnabled={false}
          ListHeaderComponent={
            !searching ? (
              <View style={styles.suggestedHeader}>
                <Search color={colors.textMuted} size={14} strokeWidth={2.4} />
                <Text style={styles.suggestedLabel}>Suggested for you</Text>
              </View>
            ) : null
          }
          renderItem={({ item: profile }) => {
            const isFollowed = followed.has(profile.id);
            return (
              <View style={styles.row}>
                {profile.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>
                      {profile.username.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.nameCol}>
                  <Text style={styles.username} numberOfLines={1}>
                    @{profile.username}
                  </Text>
                  {profile.displayName ? (
                    <Text style={styles.displayName} numberOfLines={1}>
                      {profile.displayName}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isFollowed ? `Unfollow ${profile.username}` : `Follow ${profile.username}`
                  }
                  accessibilityState={{ selected: isFollowed }}
                  onPress={() => void toggleFollow(profile)}
                  style={({ pressed }) => [
                    styles.followBtn,
                    isFollowed && styles.followBtnActive,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[styles.followText, isFollowed && styles.followTextActive]}>
                    {isFollowed ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  suggestedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  suggestedLabel: { ...type.caption },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: fonts.display, fontSize: 18, color: colors.accent },
  nameCol: { flex: 1, gap: 2 },
  username: { ...type.bodyStrong },
  displayName: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  followBtn: {
    minHeight: minTapTarget - 8,
    minWidth: 96,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  followBtnActive: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  followText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onAccent },
  followTextActive: { color: colors.text },
});
