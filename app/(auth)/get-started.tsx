import { useRouter } from 'expo-router';
import { Compass, Share2, Trophy, type LucideIcon } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { colors, fonts, radii, shadows, spacing, type } from '@/lib/theme';

interface Slide {
  key: string;
  icon: LucideIcon;
  title: string;
  text: string;
}

const SLIDES: Slide[] = [
  {
    key: 'rank',
    icon: Trophy,
    title: 'Rank',
    text: 'Score every menu item you actually eat — build your personal tier list, dish by dish.',
  },
  {
    key: 'share',
    icon: Share2,
    title: 'Share',
    text: 'Show friends your rankings, see theirs, and settle the fry debate for good.',
  },
  {
    key: 'discover',
    icon: Compass,
    title: 'Discover',
    text: 'Get predictions for what you’d love next, tuned to your taste.',
  },
];

export default function GetStartedScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  function onMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.brand}>
        <Text style={styles.wordmark}>Tasted</Text>
        <Text style={styles.tagline}>Start your taste journey</Text>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => {
          const Icon = item.icon;
          return (
            <View style={[styles.slide, { width }]}>
              <View style={styles.slideCard}>
                <View style={styles.iconBadge}>
                  <Icon color={colors.accent} size={44} strokeWidth={1.8} />
                </View>
                <Text style={styles.slideTitle}>{item.title}</Text>
                <Text style={styles.slideText}>{item.text}</Text>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.dots} accessibilityLabel={`Slide ${page + 1} of ${SLIDES.length}`}>
        {SLIDES.map((s, i) => (
          <View key={s.key} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <Button label="Get Started" onPress={() => router.push('/(auth)/email')} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log in to an existing account"
          onPress={() => router.push('/(auth)/sign-in')}
          style={({ pressed }) => [styles.loginLink, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginTextAccent}>Log in</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  brand: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.xs },
  wordmark: { fontFamily: fonts.display, fontSize: 52, color: colors.accent },
  tagline: { ...type.body, color: colors.textMuted },
  slide: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  slideCard: {
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignSelf: 'stretch',
    ...shadows.card,
  },
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideTitle: { ...type.heading },
  slideText: { ...type.body, color: colors.textMuted, textAlign: 'center' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.accent, width: 20 },
  footer: { padding: spacing.lg, gap: spacing.md },
  loginLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  loginText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textMuted },
  loginTextAccent: { color: colors.accent, fontFamily: fonts.bodyBold },
});
