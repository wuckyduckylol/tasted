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

import { Marquee } from '@/components/Marquee';
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
    title: 'rank',
    text: 'Score every menu item you actually eat — build your personal tier list, dish by dish.',
  },
  {
    key: 'share',
    icon: Share2,
    title: 'share',
    text: 'Show friends your rankings, see theirs, and settle the fry debate for good.',
  },
  {
    key: 'discover',
    icon: Compass,
    title: 'discover',
    text: 'Get predictions for what you’d love next, tuned to your taste.',
  },
];

const TICKER = [
  'rank every bite',
  'settle the fry debate',
  'find your next favorite',
  'share your tier list',
];

/** Decorative happly-style confetti square. */
function Confetti({ top, left, right, rotate }: { top: number; left?: number; right?: number; rotate: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.confetti, { top, left, right, transform: [{ rotate }] }]}
    />
  );
}

export default function GetStartedScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  function onMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Confetti top={120} left={24} rotate="18deg" />
      <Confetti top={96} right={40} rotate="-12deg" />
      <Confetti top={210} right={90} rotate="30deg" />

      <View style={styles.brand}>
        <Text style={styles.wordmark} accessibilityRole="header">
          tasted
        </Text>
        <Text style={styles.tagline}>never order wrong again</Text>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        style={styles.carousel}
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

      {/* Flexible pink breathing room keeps the ticker + CTA anchored low. */}
      <View style={styles.spacer} />

      <Marquee phrases={TICKER} />

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
  screen: { flex: 1, backgroundColor: colors.candy },
  confetti: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: colors.accent,
    opacity: 0.85,
  },
  brand: { alignItems: 'center', paddingTop: spacing.xxl, gap: 0 },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 76,
    lineHeight: 88,
    color: colors.base,
    letterSpacing: -2,
  },
  tagline: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.baseDark, marginTop: -6 },
  carousel: { flexGrow: 0, marginTop: spacing.md },
  slide: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  spacer: { flex: 1 },
  slideCard: {
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignSelf: 'stretch',
    ...shadows.raised,
  },
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideTitle: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.text },
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
    backgroundColor: 'rgba(23, 21, 15, 0.25)',
  },
  dotActive: { backgroundColor: colors.baseDark, width: 20 },
  footer: { padding: spacing.lg, gap: spacing.md },
  loginLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  loginText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.baseDark },
  loginTextAccent: { fontFamily: fonts.bodyExtraBold, color: colors.base },
});
